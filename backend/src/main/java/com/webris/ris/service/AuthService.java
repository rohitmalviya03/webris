package com.webris.ris.service;

import com.webris.ris.dto.request.ChangePasswordRequest;
import com.webris.ris.dto.request.LoginRequest;
import com.webris.ris.dto.request.UserCreateRequest;
import com.webris.ris.dto.response.AuthResponse;
import com.webris.ris.dto.response.ChangePasswordResponse;
import com.webris.ris.dto.response.UserCreatedResponse;
import com.webris.ris.dto.response.UserDto;
import com.webris.ris.entity.Center;
import com.webris.ris.entity.Doctor;
import com.webris.ris.entity.User;
import com.webris.ris.enums.Role;
import com.webris.ris.exception.AccountDisabledException;
import com.webris.ris.exception.AccountLockedException;
import com.webris.ris.exception.RateLimitException;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.repository.DoctorRepository;
import com.webris.ris.repository.UserRepository;
import com.webris.ris.security.JwtTokenProvider;
import com.webris.ris.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final CenterRepository centerRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final LoginAttemptService loginAttemptService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PASSWORD_CHARS =
            "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest request, String clientIp) {

        // 1. IP-based rate limit (Bucket4j in-memory)
        if (loginAttemptService.isIpRateLimited(clientIp)) {
            throw new RateLimitException(
                    "Too many login attempts from your IP address. Please wait and try again.");
        }

        // 2. Authenticate — Spring Security checks disabled/locked BEFORE verifying the password.
        //    Order of Spring exceptions: DisabledException → LockedException → BadCredentialsException
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getIdentifier(), request.getPassword()));
        } catch (DisabledException e) {
            // Do NOT record a failed attempt — account was deliberately disabled by an admin.
            throw new AccountDisabledException(
                    "Your account has been disabled. Please contact your administrator.");
        } catch (LockedException e) {
            // Do NOT increment counter — it's already at the threshold that caused the lock.
            throw new AccountLockedException(
                    "Your account is temporarily locked due to too many failed login attempts. " +
                    "It will unlock automatically, or contact your administrator.");
        } catch (BadCredentialsException e) {
            // Record the failed attempt — may trigger account lock after maxAttempts.
            loginAttemptService.recordFailedAttempt(request.getIdentifier());
            throw e;   // re-throw so GlobalExceptionHandler maps it to 401
        }

        // 3. Successful login — reset counter and issue token.
        loginAttemptService.resetFailedAttempts(request.getIdentifier());

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        // Eager access to center inside the @Transactional boundary — no LazyInitializationException.
        User user = userRepository.findById(principal.getId()).orElseThrow();
        String centerName = user.getCenter() != null ? user.getCenter().getName() : null;

        Boolean requireReportApproval = user.getCenter() != null
                ? user.getCenter().getRequireReportApproval()
                : null;

        return AuthResponse.builder()
                .token(jwt)
                .userId(principal.getId())
                .username(principal.getUsername())
                .fullName(user.getFullName())
                .role(principal.getRole())
                .centerId(principal.getCenterId())
                .centerName(centerName)
                .requireReportApproval(requireReportApproval)
                .build();
    }

    // ── User creation ─────────────────────────────────────────────────────────

    @Transactional
    public UserCreatedResponse createUser(UserCreateRequest request, Long callerCenterId) {

        // Uniqueness guards
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException(
                    "Username '" + request.getUsername() + "' is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException(
                    "Email '" + request.getEmail() + "' is already registered");
        }
        if (request.getMobile() != null && !request.getMobile().isBlank()
                && userRepository.existsByMobile(request.getMobile())) {
            throw new IllegalArgumentException(
                    "Mobile '" + request.getMobile() + "' is already registered");
        }

        // SUPER_ADMIN cannot be created via this endpoint (privilege ceiling)
        if (request.getRole() == Role.SUPER_ADMIN) {
            throw new IllegalArgumentException(
                    "SUPER_ADMIN accounts cannot be created through this endpoint.");
        }

        // CENTER_ADMIN always creates users in their own center; SUPER_ADMIN supplies centerId
        Long effectiveCenterId = callerCenterId != null ? callerCenterId : request.getCenterId();
        Center center = null;
        if (effectiveCenterId != null) {
            center = centerRepository.findById(effectiveCenterId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Center", "id", effectiveCenterId));
        }

        String plainPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword() : generatePassword();
        String mobile = (request.getMobile() != null && !request.getMobile().isBlank())
                ? request.getMobile() : null;

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .mobile(mobile)
                .password(passwordEncoder.encode(plainPassword))
                .fullName(request.getFullName())
                .role(request.getRole())
                .center(center)
                .isActive(true)
                .accountLocked(false)
                .failedLoginAttempts(0)
                .build();
        user = userRepository.save(user);

        if (request.getRole() == Role.RADIOLOGIST) {
            doctorRepository.save(Doctor.builder()
                    .user(user)
                    .center(center)
                    .name(request.getFullName())
                    .specialization(request.getSpecialization())
                    .qualification(request.getQualification())
                    .email(request.getEmail())
                    .phone(request.getPhone())
                    .isActive(true)
                    .build());
        }

        return UserCreatedResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .plainPassword(plainPassword)
                .centerId(center != null ? center.getId() : null)
                .centerName(center != null ? center.getName() : null)
                .build();
    }

    // ── Change password ───────────────────────────────────────────────────────

    @Transactional
    public ChangePasswordResponse changePassword(Long userId, ChangePasswordRequest request,
                                                  Long callerCenterId, String callerRole) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // CENTER_ADMIN: target must belong to their center and must not be another admin
        if (Role.CENTER_ADMIN.name().equals(callerRole)) {
            boolean sameCenter = target.getCenter() != null
                    && target.getCenter().getId().equals(callerCenterId);
            if (!sameCenter) {
                throw new IllegalArgumentException("You can only change passwords for users in your own center.");
            }
            if (target.getRole() == Role.CENTER_ADMIN || target.getRole() == Role.SUPER_ADMIN) {
                throw new IllegalArgumentException("You cannot change the password for this account.");
            }
        }

        String plain;
        if ("GENERATE".equalsIgnoreCase(request.getMode())) {
            plain = generatePassword();
        } else {
            if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
                throw new IllegalArgumentException("newPassword is required when mode is MANUAL.");
            }
            plain = request.getNewPassword();
        }

        target.setPassword(passwordEncoder.encode(plain));
        target.setAccountLocked(false);
        target.setFailedLoginAttempts(0);
        userRepository.save(target);

        return ChangePasswordResponse.builder()
                .userId(target.getId())
                .username(target.getUsername())
                .fullName(target.getFullName())
                .plainPassword(plain)
                .build();
    }

    // ── DTO queries ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserDto> getUsersByCenter(Long centerId) {
        // Uses JOIN FETCH to load center in one query — avoids N+1 per user
        return userRepository.findByCenterIdWithCenter(centerId).stream()
                .map(this::toUserDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        // Uses JOIN FETCH to load center in one query — avoids N+1 per user
        return userRepository.findAllWithCenter().stream()
                .map(this::toUserDto)
                .toList();
    }

    public UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .centerId(user.getCenter() != null ? user.getCenter().getId() : null)
                .centerName(user.getCenter() != null ? user.getCenter().getName() : null)
                .isActive(user.getIsActive())
                .accountLocked(user.getAccountLocked())
                .failedLoginAttempts(user.getFailedLoginAttempts())
                .createdAt(user.getCreatedAt())
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Cryptographically random 10-character password. */
    private String generatePassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    public UserPrincipal getCurrentUser() {
        return (UserPrincipal) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
    }
}
