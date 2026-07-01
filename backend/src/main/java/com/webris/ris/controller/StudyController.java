package com.webris.ris.controller;

import com.webris.ris.dto.request.StudyRequest;
import com.webris.ris.dto.response.StudyResponse;
import com.webris.ris.enums.StudyStatus;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.StudyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/studies")
@RequiredArgsConstructor
public class StudyController {

    private final StudyService studyService;

    @PostMapping
    public ResponseEntity<StudyResponse> createStudy(
            @Valid @RequestBody StudyRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(studyService.createStudy(request, currentUser.getCenterId(), currentUser.getId()));
    }

    @GetMapping
    public ResponseEntity<Page<StudyResponse>> getStudies(
            @RequestParam(required = false) StudyStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(studyService.getStudies(currentUser.getCenterId(), status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudyResponse> getStudy(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(studyService.getStudy(id, currentUser.getCenterId()));
    }

    @GetMapping("/lab/{labNo}")
    public ResponseEntity<StudyResponse> getStudyByLabNo(
            @PathVariable String labNo,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(studyService.getStudyByLabNo(labNo, currentUser.getCenterId()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<StudyResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        StudyStatus status = StudyStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(studyService.updateStatus(id, status, currentUser.getCenterId()));
    }

    @PostMapping("/orthanc-link")
    public ResponseEntity<StudyResponse> linkOrthanc(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(studyService.linkOrthancStudy(
                body.get("accessionNumber"),
                body.get("orthancStudyId"),
                body.get("studyInstanceUid")
        ));
    }

    @PostMapping("/{id}/sync-pacs")
    public ResponseEntity<StudyResponse> syncWithPacs(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(studyService.syncWithOrthanc(id, currentUser.getCenterId()));
    }
}
