package com.webris.ris.config;

import com.webris.ris.entity.Center;
import com.webris.ris.entity.Doctor;
import com.webris.ris.entity.User;
import com.webris.ris.enums.Role;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.repository.DoctorRepository;
import com.webris.ris.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the database with a SUPER_ADMIN and a sample center on first run only.
 *
 * IMPORTANT — what changed and why:
 *  - Previously every startup reset all default user passwords back to "password",
 *    wiping any admin-changed credentials.  This method now only INSERT-if-absent.
 *  - Credentials are no longer logged to stdout (they would end up in log aggregation).
 *  - SUPER_ADMIN has no center assignment (centerId = null) by design.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final CenterRepository centerRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("DataInitializer: checking seed data...");

        // ── Super-admin ──────────────────────────────────────────────────────
        // Only created when the table is completely empty to avoid
        // any risk of overwriting a real super-admin account.
        if (!userRepository.existsByUsername("superadmin")) {
            String encodedDefaultPassword = passwordEncoder.encode("ChangeMe@123");
            userRepository.save(User.builder()
                    .username("superadmin")
                    .email("admin@ris.com")
                    .password(encodedDefaultPassword)
                    .fullName("Super Admin")
                    .role(Role.SUPER_ADMIN)
                    .center(null)
                    .isActive(true)
                    .accountLocked(false)
                    .failedLoginAttempts(0)
                    .build());
            log.warn("SEED: Created default superadmin. " +
                     "CHANGE the password immediately via the admin portal.");
        }

        // ── Sample center ────────────────────────────────────────────────────
        Center center = centerRepository.findAll().stream().findFirst().orElseGet(() ->
                centerRepository.save(Center.builder()
                        .name("ABC Diagnostic Center")
                        .address("123 Medical Street, City")
                        .phone("+91-9876543210")
                        .email("contact@abcdiag.com")
                        .isActive(true)
                        .build()));

        // ── Sample center-admin ───────────────────────────────────────────────
        if (!userRepository.existsByUsername("centeradmin")) {
            userRepository.save(User.builder()
                    .username("centeradmin")
                    .email("centeradmin@abcdiag.com")
                    .password(passwordEncoder.encode("ChangeMe@456"))
                    .fullName("Center Admin")
                    .role(Role.CENTER_ADMIN)
                    .center(center)
                    .isActive(true)
                    .accountLocked(false)
                    .failedLoginAttempts(0)
                    .build());
            log.warn("SEED: Created default centeradmin. " +
                     "CHANGE the password immediately via the admin portal.");
        }

        // ── Sample radiologist ───────────────────────────────────────────────
        if (!userRepository.existsByUsername("drAmit")) {
            User drAmit = userRepository.save(User.builder()
                    .username("drAmit")
                    .email("dramit@ris.com")
                    .password(passwordEncoder.encode("ChangeMe@789"))
                    .fullName("Dr. Amit Kumar")
                    .role(Role.RADIOLOGIST)
                    .center(center)
                    .isActive(true)
                    .accountLocked(false)
                    .failedLoginAttempts(0)
                    .build());

            if (doctorRepository.findByUserId(drAmit.getId()).isEmpty()) {
                doctorRepository.save(Doctor.builder()
                        .user(drAmit)
                        .center(center)
                        .name("Dr. Amit Kumar")
                        .specialization("MRI")
                        .qualification("MBBS, MD Radiology")
                        .email("dramit@ris.com")
                        .isActive(true)
                        .build());
            }
            log.warn("SEED: Created default drAmit. " +
                     "CHANGE the password immediately via the admin portal.");
        }

        log.info("DataInitializer: seed check complete.");
    }
}
