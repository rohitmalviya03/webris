package com.webris.ris.controller;

import com.webris.ris.dto.request.ReportRequest;
import com.webris.ris.dto.response.ReportResponse;
import com.webris.ris.security.UserPrincipal;
import com.webris.ris.service.PdfReportService;
import com.webris.ris.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final PdfReportService pdfReportService;

    @PostMapping("/study/{studyId}")
    public ResponseEntity<ReportResponse> saveReport(
            @PathVariable Long studyId,
            @RequestBody ReportRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(reportService.saveReport(studyId, request, currentUser.getId()));
    }

    @GetMapping("/study/{studyId}")
    public ResponseEntity<ReportResponse> getReportByStudy(@PathVariable Long studyId) {
        return ResponseEntity.ok(reportService.getReportByStudy(studyId));
    }

    @GetMapping("/my-reports")
    public ResponseEntity<List<ReportResponse>> getMyReports(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(reportService.getReportsByDoctor(currentUser.getId()));
    }

    @GetMapping("/pending-approvals")
    public ResponseEntity<List<ReportResponse>> getPendingApprovals(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(reportService.getPendingApprovals(currentUser.getCenterId()));
    }

    @GetMapping("/approved")
    public ResponseEntity<List<ReportResponse>> getApprovedReports(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(reportService.getApprovedReports(currentUser.getCenterId()));
    }

    @PostMapping("/{reportId}/request-modification")
    public ResponseEntity<ReportResponse> requestModification(@PathVariable Long reportId) {
        return ResponseEntity.ok(reportService.requestModification(reportId));
    }

    @PostMapping("/{reportId}/approve")
    public ResponseEntity<ReportResponse> approveReport(
            @PathVariable Long reportId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(reportService.approveReport(reportId, currentUser.getId()));
    }

    @PostMapping("/{reportId}/reject")
    public ResponseEntity<ReportResponse> rejectReport(
            @PathVariable Long reportId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(reportService.rejectReport(reportId, body.get("reason"), currentUser.getId()));
    }

    @GetMapping("/{reportId}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long reportId) {
        byte[] pdf = pdfReportService.generateReportPdf(reportId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report_" + reportId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
