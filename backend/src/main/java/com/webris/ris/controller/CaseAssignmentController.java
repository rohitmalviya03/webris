package com.webris.ris.controller;

import com.webris.ris.dto.request.AssignStudyRequest;
import com.webris.ris.dto.response.DoctorResponse;
import com.webris.ris.dto.response.StudyResponse;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.CaseAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/assignments")
@RequiredArgsConstructor
public class CaseAssignmentController {

    private final CaseAssignmentService caseAssignmentService;

    @PostMapping
    public ResponseEntity<StudyResponse> assignStudy(
            @Valid @RequestBody AssignStudyRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(caseAssignmentService.assignStudy(request, currentUser.getCenterId()));
    }

    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorResponse>> getAvailableDoctors(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(caseAssignmentService.getAvailableDoctors(currentUser.getCenterId()));
    }

    @GetMapping("/my-cases")
    public ResponseEntity<List<StudyResponse>> getMyCases(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(caseAssignmentService.getDoctorCases(currentUser.getId()));
    }
}
