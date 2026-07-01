package com.webris.ris.service;

import com.webris.ris.dto.request.CenterRequest;
import com.webris.ris.dto.request.CenterUpdateRequest;
import com.webris.ris.dto.request.SubscriptionUpdateRequest;
import com.webris.ris.dto.response.CenterResponse;
import com.webris.ris.dto.response.CreatedCenterResponse;
import com.webris.ris.dto.response.GlobalStatsResponse;
import com.webris.ris.dto.response.ResetPasswordResponse;
import com.webris.ris.entity.Center;
import com.webris.ris.entity.User;
import com.webris.ris.enums.CenterPlan;
import com.webris.ris.enums.Role;
import com.webris.ris.enums.SubscriptionStatus;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.repository.PatientRepository;
import com.webris.ris.repository.StudyRepository;
import com.webris.ris.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SuperAdminService {

    private final CenterRepository centerRepository;
    private final PatientRepository patientRepository;
    private final StudyRepository studyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public List<CenterResponse> getAllCenters() {
        List<Center> centers = centerRepository.findAll();
        if (centers.isEmpty()) return List.of();

        List<Long> centerIds = centers.stream().map(Center::getId).toList();
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime now = LocalDateTime.now();

        Map<Long, Long> patientCounts  = groupedCountToMap(patientRepository.countGroupedByCenterIds(centerIds));
        Map<Long, Long> studyCounts    = groupedCountToMap(studyRepository.countGroupedByCenterIds(centerIds));
        Map<Long, Long> userCounts     = groupedCountToMap(userRepository.countGroupedByCenterIds(centerIds));
        Map<Long, Long> monthlyCounts  = groupedCountToMap(studyRepository.countMonthlyGroupedByCenterIds(centerIds, monthStart, now));

        return centers.stream()
                .map(c -> toResponseWithStats(c, patientCounts, studyCounts, userCounts, monthlyCounts))
                .collect(Collectors.toList());
    }

    public CenterResponse getCenter(Long id) {
        Center center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id));
        return toResponse(center);
    }

    @Transactional
    public CreatedCenterResponse createCenter(CenterRequest req) {
        Center center = Center.builder()
                .name(req.getName())
                .address(req.getAddress())
                .phone(req.getPhone())
                .email(req.getEmail())
                .website(req.getWebsite())
                .contactPerson(req.getContactPerson())
                .city(req.getCity())
                .state(req.getState())
                .pincode(req.getPincode())
                .notes(req.getNotes())
                .isActive(true)
                .plan(req.getPlan() != null ? req.getPlan() : CenterPlan.TRIAL)
                .subscriptionStatus(req.getSubscriptionStatus() != null
                        ? req.getSubscriptionStatus() : SubscriptionStatus.TRIAL)
                .planStartDate(req.getPlanStartDate())
                .planEndDate(req.getPlanEndDate())
                .maxStudiesPerMonth(req.getMaxStudiesPerMonth() != null ? req.getMaxStudiesPerMonth() : 100)
                .build();
        center = centerRepository.save(center);

        // Always create the CENTER_ADMIN user — email and mobile are both required and must be unique
        String adminEmail  = req.getAdminEmail();
        String adminMobile = req.getAdminMobile();
        String adminFullName = req.getAdminFullName() != null ? req.getAdminFullName() : center.getName() + " Admin";

        if (userRepository.existsByEmail(adminEmail)) {
            throw new IllegalArgumentException("Email '" + adminEmail + "' is already registered");
        }
        if (userRepository.existsByMobile(adminMobile)) {
            throw new IllegalArgumentException("Mobile '" + adminMobile + "' is already registered");
        }

        String plainPassword = (req.getAdminPassword() != null && !req.getAdminPassword().isBlank())
                ? req.getAdminPassword()
                : generatePassword();

        User admin = User.builder()
                .username(adminEmail)   // email is the login identifier
                .email(adminEmail)
                .mobile(adminMobile)
                .password(passwordEncoder.encode(plainPassword))
                .fullName(adminFullName)
                .role(Role.CENTER_ADMIN)
                .center(center)
                .isActive(true)
                .build();
        userRepository.save(admin);
        log.info("Created CENTER_ADMIN for center '{}' with email '{}' and mobile '{}'",
                center.getName(), adminEmail, adminMobile);

        return CreatedCenterResponse.builder()
                .center(toResponse(center))
                .adminCreated(true)
                .adminEmail(adminEmail)
                .adminMobile(adminMobile)
                .adminPassword(plainPassword)
                .adminFullName(adminFullName)
                .build();
    }

    @Transactional
    public CenterResponse updateCenter(Long id, CenterUpdateRequest req) {
        Center center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id));

        center.setName(req.getName());
        center.setAddress(req.getAddress());
        center.setPhone(req.getPhone());
        center.setEmail(req.getEmail());
        center.setWebsite(req.getWebsite());
        center.setContactPerson(req.getContactPerson());
        center.setCity(req.getCity());
        center.setState(req.getState());
        center.setPincode(req.getPincode());
        center.setNotes(req.getNotes());
        if (req.getPlan() != null)               center.setPlan(req.getPlan());
        if (req.getSubscriptionStatus() != null) center.setSubscriptionStatus(req.getSubscriptionStatus());
        if (req.getPlanStartDate() != null)       center.setPlanStartDate(req.getPlanStartDate());
        if (req.getPlanEndDate() != null)         center.setPlanEndDate(req.getPlanEndDate());
        if (req.getMaxStudiesPerMonth() != null)  center.setMaxStudiesPerMonth(req.getMaxStudiesPerMonth());

        return toResponse(centerRepository.save(center));
    }

    @Transactional
    public CenterResponse updateSubscription(Long id, SubscriptionUpdateRequest req) {
        Center center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id));

        if (req.getPlan() != null)               center.setPlan(req.getPlan());
        if (req.getSubscriptionStatus() != null) center.setSubscriptionStatus(req.getSubscriptionStatus());
        if (req.getPlanStartDate() != null)       center.setPlanStartDate(req.getPlanStartDate());
        if (req.getPlanEndDate() != null)         center.setPlanEndDate(req.getPlanEndDate());
        if (req.getMaxStudiesPerMonth() != null)  center.setMaxStudiesPerMonth(req.getMaxStudiesPerMonth());

        return toResponse(centerRepository.save(center));
    }

    @Transactional
    public CenterResponse toggleStatus(Long id) {
        Center center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id));
        center.setIsActive(!center.getIsActive());
        return toResponse(centerRepository.save(center));
    }

    @Transactional
    public CenterResponse uploadLogo(Long id, MultipartFile file) throws IOException {
        Center center = centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id));

        String ext = getExtension(file.getOriginalFilename());
        String filename = "center-" + id + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;

        Path logosDir = Paths.get(uploadDir, "logos");
        Files.createDirectories(logosDir);
        Files.write(logosDir.resolve(filename), file.getBytes());

        center.setLogoUrl("/api/uploads/logos/" + filename);
        return toResponse(centerRepository.save(center));
    }

    public GlobalStatsResponse getGlobalStats() {
        List<Center> all = centerRepository.findAll();

        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime now = LocalDateTime.now();

        long totalCenters        = all.size();
        long activeCenters       = all.stream().filter(c -> Boolean.TRUE.equals(c.getIsActive())).count();
        long inactiveCenters     = totalCenters - activeCenters;
        long expiredSubs         = all.stream().filter(c -> c.getSubscriptionStatus() == SubscriptionStatus.EXPIRED).count();
        long trialCenters        = all.stream().filter(c -> c.getPlan() == CenterPlan.TRIAL).count();
        long starterCenters      = all.stream().filter(c -> c.getPlan() == CenterPlan.STARTER).count();
        long professionalCenters = all.stream().filter(c -> c.getPlan() == CenterPlan.PROFESSIONAL).count();
        long enterpriseCenters   = all.stream().filter(c -> c.getPlan() == CenterPlan.ENTERPRISE).count();

        long totalPatients  = patientRepository.count();
        long totalStudies   = studyRepository.count();
        long totalUsers     = userRepository.count();
        long monthlyStudies = studyRepository.countByCreatedAtBetween(monthStart, now);

        return GlobalStatsResponse.builder()
                .totalCenters(totalCenters)
                .activeCenters(activeCenters)
                .inactiveCenters(inactiveCenters)
                .expiredSubscriptions(expiredSubs)
                .totalPatients(totalPatients)
                .totalStudies(totalStudies)
                .totalUsers(totalUsers)
                .monthlyStudies(monthlyStudies)
                .trialCenters(trialCenters)
                .starterCenters(starterCenters)
                .professionalCenters(professionalCenters)
                .enterpriseCenters(enterpriseCenters)
                .build();
    }

    private CenterResponse toResponse(Center c) {
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        return CenterResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .address(c.getAddress())
                .phone(c.getPhone())
                .email(c.getEmail())
                .website(c.getWebsite())
                .contactPerson(c.getContactPerson())
                .city(c.getCity())
                .state(c.getState())
                .pincode(c.getPincode())
                .logoUrl(c.getLogoUrl())
                .isActive(c.getIsActive())
                .notes(c.getNotes())
                .plan(c.getPlan())
                .subscriptionStatus(c.getSubscriptionStatus())
                .planStartDate(c.getPlanStartDate())
                .planEndDate(c.getPlanEndDate())
                .maxStudiesPerMonth(c.getMaxStudiesPerMonth())
                .createdAt(c.getCreatedAt())
                .totalPatients(patientRepository.countByCenterId(c.getId()))
                .totalStudies(studyRepository.countByCenterId(c.getId()))
                .totalUsers(userRepository.countByCenterId(c.getId()))
                .monthlyStudies(studyRepository.countByCenterIdAndCreatedAtBetween(
                        c.getId(), monthStart, LocalDateTime.now()))
                .build();
    }

    private CenterResponse toResponseWithStats(Center c,
                                                Map<Long, Long> patientCounts,
                                                Map<Long, Long> studyCounts,
                                                Map<Long, Long> userCounts,
                                                Map<Long, Long> monthlyCounts) {
        return CenterResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .address(c.getAddress())
                .phone(c.getPhone())
                .email(c.getEmail())
                .website(c.getWebsite())
                .contactPerson(c.getContactPerson())
                .city(c.getCity())
                .state(c.getState())
                .pincode(c.getPincode())
                .logoUrl(c.getLogoUrl())
                .isActive(c.getIsActive())
                .notes(c.getNotes())
                .plan(c.getPlan())
                .subscriptionStatus(c.getSubscriptionStatus())
                .planStartDate(c.getPlanStartDate())
                .planEndDate(c.getPlanEndDate())
                .maxStudiesPerMonth(c.getMaxStudiesPerMonth())
                .createdAt(c.getCreatedAt())
                .totalPatients(patientCounts.getOrDefault(c.getId(), 0L))
                .totalStudies(studyCounts.getOrDefault(c.getId(), 0L))
                .totalUsers(userCounts.getOrDefault(c.getId(), 0L))
                .monthlyStudies(monthlyCounts.getOrDefault(c.getId(), 0L))
                .build();
    }

    private Map<Long, Long> groupedCountToMap(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(
                row -> (Long) row[0],
                row -> (Long) row[1]
        ));
    }

    /**
     * Generates a new password for the primary CENTER_ADMIN of the given center.
     * Also clears any account lock so the admin can log in immediately.
     */
    @Transactional
    public ResetPasswordResponse resetCenterAdminPassword(Long centerId) {
        Center center = centerRepository.findById(centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", centerId));

        // Find the first active CENTER_ADMIN for this center
        User admin = userRepository.findByCenterId(centerId).stream()
                .filter(u -> u.getRole() == Role.CENTER_ADMIN
                          && Boolean.TRUE.equals(u.getIsActive()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active CENTER_ADMIN found for center id: " + centerId));

        String newPassword = generatePassword();
        admin.setPassword(passwordEncoder.encode(newPassword));

        // Clear any lockout so the admin can log in right away
        admin.setAccountLocked(false);
        admin.setFailedLoginAttempts(0);
        admin.setLockExpiresAt(null);
        userRepository.save(admin);

        log.info("Password reset performed for CENTER_ADMIN '{}' of center '{}'",
                admin.getUsername(), center.getName());

        return ResetPasswordResponse.builder()
                .centerId(center.getId())
                .centerName(center.getName())
                .adminUsername(admin.getUsername())
                .adminEmail(admin.getEmail())
                .newPassword(newPassword)
                .build();
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PWD_CHARS =
            "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";

    private String generatePassword() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(PWD_CHARS.charAt(SECURE_RANDOM.nextInt(PWD_CHARS.length())));
        }
        return sb.toString();
    }

    private String sanitize(String name) {
        return name.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".png";
        return filename.substring(filename.lastIndexOf('.'));
    }
}
