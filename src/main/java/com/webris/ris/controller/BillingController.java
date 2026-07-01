package com.webris.ris.controller;

import com.webris.ris.dto.request.BillingRequest;
import com.webris.ris.dto.response.BillingResponse;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @PostMapping
    public ResponseEntity<BillingResponse> createBilling(
            @Valid @RequestBody BillingRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(billingService.createBilling(request, currentUser.getId()));
    }

    @GetMapping("/study/{studyId}")
    public ResponseEntity<BillingResponse> getBillingByStudy(@PathVariable Long studyId) {
        return ResponseEntity.ok(billingService.getBillingByStudy(studyId));
    }
}
