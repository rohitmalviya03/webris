package com.webris.ris.controller;

import com.webris.ris.dto.request.CenterSettingsRequest;
import com.webris.ris.dto.response.CenterResponse;
import com.webris.ris.entity.Center;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/centers")
@RequiredArgsConstructor
public class CenterController {

    private final CenterRepository centerRepository;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Center>> getCenters() {
        return ResponseEntity.ok(centerRepository.findByIsActiveTrue());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Center> createCenter(@RequestBody Center center) {
        return ResponseEntity.ok(centerRepository.save(center));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Center> getCenter(@PathVariable Long id) {
        return ResponseEntity.ok(centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id)));
    }

    /** CENTER_ADMIN: get their own center's settings */
    @GetMapping("/my")
    @PreAuthorize("hasRole('CENTER_ADMIN')")
    public ResponseEntity<CenterResponse> getMyCenter(@AuthenticationPrincipal UserPrincipal currentUser) {
        Center center = centerRepository.findById(currentUser.getCenterId())
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", currentUser.getCenterId()));
        return ResponseEntity.ok(toCenterResponse(center));
    }

    /** CENTER_ADMIN: update report approval configuration for their center */
    @PatchMapping("/settings")
    @PreAuthorize("hasRole('CENTER_ADMIN')")
    public ResponseEntity<CenterResponse> updateSettings(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @RequestBody CenterSettingsRequest request) {
        Center center = centerRepository.findById(currentUser.getCenterId())
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", currentUser.getCenterId()));

        if (request.getRequireReportApproval() != null) {
            center.setRequireReportApproval(request.getRequireReportApproval());
        }
        centerRepository.save(center);
        return ResponseEntity.ok(toCenterResponse(center));
    }

    private CenterResponse toCenterResponse(Center center) {
        return CenterResponse.builder()
                .id(center.getId())
                .name(center.getName())
                .address(center.getAddress())
                .phone(center.getPhone())
                .email(center.getEmail())
                .website(center.getWebsite())
                .contactPerson(center.getContactPerson())
                .city(center.getCity())
                .state(center.getState())
                .pincode(center.getPincode())
                .logoUrl(center.getLogoUrl())
                .isActive(center.getIsActive())
                .notes(center.getNotes())
                .plan(center.getPlan())
                .subscriptionStatus(center.getSubscriptionStatus())
                .planStartDate(center.getPlanStartDate())
                .planEndDate(center.getPlanEndDate())
                .maxStudiesPerMonth(center.getMaxStudiesPerMonth())
                .requireReportApproval(center.getRequireReportApproval())
                .createdAt(center.getCreatedAt())
                .build();
    }
}
