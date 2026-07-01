package com.webris.ris.config;

import com.webris.ris.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Activates Hibernate's "tenantFilter" immediately before any Spring Data JPA
 * repository method executes, giving us ORM-layer tenant isolation on top of the
 * existing service-layer centerId checks.
 *
 * Why here instead of the service layer?
 *  ● A developer who writes a new findAll() / findById() without remembering to
 *    add centerId is automatically protected — Hibernate appends
 *    "AND center_id = ?" to every qualifying query.
 *  ● The filter is activated from SecurityContextHolder, not a ThreadLocal,
 *    so there is no risk of context leaking between requests.
 *
 * Who gets the filter:
 *  ● CENTER_ADMIN / RECEPTIONIST / TECHNICIAN / RADIOLOGIST / REPORT_APPROVER
 *    → centerId is non-null → filter ON  → see only their own center's rows.
 *  ● SUPER_ADMIN → centerId is null → filter stays OFF → sees all tenants.
 *  ● Unauthenticated (login endpoint, actuator health) → no principal →
 *    filter stays OFF → user-table lookups during auth work normally.
 *
 * Which entities are filtered:
 *  User, Patient, Study, Doctor, ReportTemplate, TestCatalog  (all carry a direct center_id FK).
 *  Report and Billing do NOT have a direct center_id; they are isolated via their
 *  owning Study, which IS filtered.
 */
@Aspect
@Component
@Slf4j
public class TenantFilterAspect {

    private static final String FILTER_NAME = "tenantFilter";

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Intercepts every public method in every class inside the repository package
     * (and any sub-packages) before the method body runs.
     */
    @Before("execution(* com.webris.ris.repository..*.*(..))")
    public void enableTenantFilter(JoinPoint jp) {
        Long centerId = resolveCurrentTenantId();
        if (centerId == null) {
            return; // SUPER_ADMIN or unauthenticated — no filter
        }

        try {
            Session session = entityManager.unwrap(Session.class);
            // Idempotent: enable only if not already active for this session
            if (session.getEnabledFilter(FILTER_NAME) == null) {
                session.enableFilter(FILTER_NAME).setParameter("centerId", centerId);
                log.trace("Tenant filter enabled: centerId={}", centerId);
            }
        } catch (Exception ex) {
            // Outside an active Hibernate session (e.g. schema export at startup).
            // The service-layer centerId checks remain the fallback in this case.
            log.debug("Could not enable tenant filter: {}", ex.getMessage());
        }
    }

    /**
     * Reads centerId directly from Spring Security's context holder.
     * Returns null for SUPER_ADMIN (centerId absent in JWT) and for any
     * unauthenticated call (login, actuator probe, etc.).
     */
    private Long resolveCurrentTenantId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return null;
        }
        return principal.getCenterId(); // null for SUPER_ADMIN
    }
}
