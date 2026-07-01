/**
 * Single @FilterDef declaration shared across all tenant-scoped entities.
 *
 * How it works:
 *  - Every entity annotated with @Filter(name = "tenantFilter") will have
 *    "WHERE center_id = :centerId" appended to every Hibernate query automatically
 *    when the filter is active.
 *  - TenantFilterAspect activates the filter per-request for any authenticated
 *    user whose JWT carries a non-null centerId.
 *  - SUPER_ADMIN (centerId = null in JWT) never activates the filter → sees all tenants.
 *  - Entities without a direct center_id FK (Report, Billing) are excluded and rely
 *    on service-level filtering via their owning Study.
 */
@FilterDef(
    name = "tenantFilter",
    parameters = @ParamDef(name = "centerId", type = Long.class),
    defaultCondition = "center_id = :centerId"
)
package com.webris.ris.entity;

import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
