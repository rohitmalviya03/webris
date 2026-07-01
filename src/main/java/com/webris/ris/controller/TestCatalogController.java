package com.webris.ris.controller;

import com.webris.ris.dto.request.TestCatalogRequest;
import com.webris.ris.dto.response.TestCatalogResponse;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.TestCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/test-catalog")
@RequiredArgsConstructor
public class TestCatalogController {

    private final TestCatalogService testCatalogService;

    @GetMapping
    public ResponseEntity<List<TestCatalogResponse>> getTests(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(testCatalogService.getTests(currentUser.getCenterId()));
    }

    @PostMapping
    public ResponseEntity<TestCatalogResponse> createTest(
            @Valid @RequestBody TestCatalogRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(testCatalogService.createTest(request, currentUser.getCenterId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TestCatalogResponse> updateTest(
            @PathVariable Long id,
            @Valid @RequestBody TestCatalogRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(testCatalogService.updateTest(id, request, currentUser.getCenterId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteTest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        testCatalogService.deleteTest(id, currentUser.getCenterId());
        return ResponseEntity.ok(Map.of("message", "Test deleted"));
    }
}
