package com.webris.ris.controller;

import com.webris.ris.dto.request.ReportTemplateRequest;
import com.webris.ris.dto.response.ReportTemplateResponse;
import com.webris.ris.entity.Study;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.StudyRepository;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.ReportTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/templates")
@RequiredArgsConstructor
public class ReportTemplateController {

    private final ReportTemplateService templateService;
    private final StudyRepository studyRepository;

    @GetMapping
    public ResponseEntity<List<ReportTemplateResponse>> getTemplates(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(templateService.getTemplates(currentUser.getCenterId()));
    }

    /**
     * Returns ALL active templates for the center that owns the given study.
     * Called by the doctor's workstation to populate the format-selection dropdown.
     * Resolving center from the study (not from the doctor's JWT) ensures the doctor
     * sees only formats belonging to the center whose case they are working on —
     * even if a radiologist is shared across centers in future.
     */
    @GetMapping("/for-study/{studyId}")
    public ResponseEntity<List<ReportTemplateResponse>> getTemplatesForStudy(
            @PathVariable Long studyId) {
        return ResponseEntity.ok(templateService.getTemplatesForStudy(studyId));
    }

    @PostMapping
    public ResponseEntity<ReportTemplateResponse> createTemplate(
            @Valid @RequestBody ReportTemplateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(templateService.createTemplate(request, currentUser.getCenterId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReportTemplateResponse> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody ReportTemplateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(templateService.updateTemplate(id, request, currentUser.getCenterId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteTemplate(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        templateService.deleteTemplate(id, currentUser.getCenterId());
        return ResponseEntity.ok(Map.of("message", "Template deleted"));
    }

    /**
     * Upload a Word (.docx) layout file for a template.
     * Only CENTER_ADMIN of the owning center can upload.
     */
    @PostMapping(value = "/{id}/upload-docx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportTemplateResponse> uploadDocx(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal currentUser) throws IOException {
        return ResponseEntity.ok(
                templateService.uploadDocxTemplate(id, file, currentUser.getCenterId()));
    }

    /**
     * Called by doctor when opening workstation.
     * Resolves centerId from the study itself so doctors can use it.
     */
    @GetMapping("/match")
    public ResponseEntity<?> matchTemplate(
            @RequestParam Long studyId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Long centerId = currentUser.getCenterId();
        if (centerId == null) {
            Study study = studyRepository.findById(studyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Study", "id", studyId));
            centerId = study.getCenter().getId();
        }

        return templateService.findMatchingTemplate(studyId, centerId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
