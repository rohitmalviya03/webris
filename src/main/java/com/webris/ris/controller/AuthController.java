package com.webris.ris.controller;

import com.webris.ris.dto.request.ChangePasswordRequest;
import com.webris.ris.dto.request.LoginRequest;
import com.webris.ris.dto.request.UserCreateRequest;
import com.webris.ris.dto.response.AuthResponse;
import com.webris.ris.dto.response.ChangePasswordResponse;
import com.webris.ris.dto.response.UserCreatedResponse;
import com.webris.ris.dto.response.UserDto;
import com.webris.ris.enums.Role;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ── Public ────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, extractClientIp(httpRequest)));
    }

    // ── Protected — require a valid JWT ──────────────────────────────────────

    /**
     * Returns the current user's profile.
     * Guard against null principal (unauthenticated call despite the security config)
     * by returning 401 instead of NPE.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(Map.of(
                "id",       currentUser.getId(),
                "username", currentUser.getUsername(),
                "role",     currentUser.getRole(),
                "centerId", currentUser.getCenterId() != null ? currentUser.getCenterId() : ""));
    }

    /**
     * Creates a new user.
     * CENTER_ADMIN can create non-admin roles for their own center only.
     * SUPER_ADMIN can create any non-SUPER_ADMIN role for any center.
     */
    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CENTER_ADMIN')")
    public ResponseEntity<UserCreatedResponse> createUser(
            @Valid @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        // Use enum comparison — not brittle string literals
        if (currentUser.getRole().equals(Role.CENTER_ADMIN.name())) {
            if (request.getRole() == Role.SUPER_ADMIN
                    || request.getRole() == Role.CENTER_ADMIN) {
                return ResponseEntity.status(403).build();
            }
        }

        // CENTER_ADMIN is locked to their own center; SUPER_ADMIN passes centerId in body
        Long callerCenterId = currentUser.getRole().equals(Role.CENTER_ADMIN.name())
                ? currentUser.getCenterId()
                : null;

        return ResponseEntity.ok(authService.createUser(request, callerCenterId));
    }

    /**
     * Lists users belonging to the caller's center.
     * Returns UserDto — never the raw User entity (which contains the password hash).
     */
    @GetMapping("/users/center")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CENTER_ADMIN')")
    public ResponseEntity<List<UserDto>> getCenterUsers(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        Long centerId = currentUser.getCenterId();
        if (centerId == null) {
            // SUPER_ADMIN has no center — let them use /admin/users instead
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(authService.getUsersByCenter(centerId));
    }

    /**
     * Change or reset a user's password.
     * CENTER_ADMIN can reset passwords only for non-admin users in their own center.
     * SUPER_ADMIN can reset any user's password.
     * Responds with the plain-text password so the admin can hand it to the user.
     */
    @PutMapping("/users/{id}/change-password")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'CENTER_ADMIN')")
    public ResponseEntity<ChangePasswordResponse> changePassword(
            @PathVariable Long id,
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(
                authService.changePassword(id, request, currentUser.getCenterId(), currentUser.getRole()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Extracts the real client IP, honouring X-Forwarded-For from a reverse proxy. */
    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
