package com.webris.ris.controller;

import com.webris.ris.dto.request.CenterRequest;
import com.webris.ris.dto.request.CenterUpdateRequest;
import com.webris.ris.dto.request.SubscriptionUpdateRequest;
import com.webris.ris.dto.request.UserCreateRequest;
import com.webris.ris.dto.response.CenterResponse;
import com.webris.ris.dto.response.CreatedCenterResponse;
import com.webris.ris.dto.response.GlobalStatsResponse;
import com.webris.ris.dto.response.ResetPasswordResponse;
import com.webris.ris.dto.response.UserDto;
import com.webris.ris.service.AuthService;
import com.webris.ris.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final AuthService authService;

    @GetMapping("/stats")
    public ResponseEntity<GlobalStatsResponse> getGlobalStats() {
        return ResponseEntity.ok(superAdminService.getGlobalStats());
    }

    @GetMapping("/centers")
    public ResponseEntity<List<CenterResponse>> getAllCenters() {
        return ResponseEntity.ok(superAdminService.getAllCenters());
    }

    @GetMapping("/centers/{id}")
    public ResponseEntity<CenterResponse> getCenter(@PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.getCenter(id));
    }

    @PostMapping("/centers")
    public ResponseEntity<CreatedCenterResponse> createCenter(@Valid @RequestBody CenterRequest req) {
        return ResponseEntity.ok(superAdminService.createCenter(req));
    }

    @PutMapping("/centers/{id}")
    public ResponseEntity<CenterResponse> updateCenter(
            @PathVariable Long id,
            @Valid @RequestBody CenterUpdateRequest req) {
        return ResponseEntity.ok(superAdminService.updateCenter(id, req));
    }

    @PatchMapping("/centers/{id}/subscription")
    public ResponseEntity<CenterResponse> updateSubscription(
            @PathVariable Long id,
            @RequestBody SubscriptionUpdateRequest req) {
        return ResponseEntity.ok(superAdminService.updateSubscription(id, req));
    }

    @PatchMapping("/centers/{id}/toggle")
    public ResponseEntity<CenterResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.toggleStatus(id));
    }

    @PostMapping(value = "/centers/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CenterResponse> uploadLogo(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(superAdminService.uploadLogo(id, file));
    }

    /**
     * Resets the CENTER_ADMIN password for the given center and returns the new plain-text
     * password so the super-admin can share it with the center.
     * Also clears any account lock on the admin account.
     */
    @PostMapping("/centers/{id}/reset-admin-password")
    public ResponseEntity<ResetPasswordResponse> resetAdminPassword(@PathVariable Long id) {
        return ResponseEntity.ok(superAdminService.resetCenterAdminPassword(id));
    }

    /**
     * Returns users for a specific center as safe DTOs — raw User entity is never exposed.
     */
    @GetMapping("/centers/{id}/users")
    public ResponseEntity<List<UserDto>> getCenterUsers(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getUsersByCenter(id));
    }

    /**
     * Creates a user for any center. SUPER_ADMIN must supply centerId in the request body.
     * SUPER_ADMIN accounts cannot be created via this endpoint (enforced in AuthService).
     */
    @PostMapping("/users")
    public ResponseEntity<com.webris.ris.dto.response.UserCreatedResponse> createUser(
            @Valid @RequestBody UserCreateRequest req) {
        return ResponseEntity.ok(authService.createUser(req, null));
    }

    /**
     * Lists all users across all centers as safe DTOs — raw User entity is never exposed.
     */
    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }
}
