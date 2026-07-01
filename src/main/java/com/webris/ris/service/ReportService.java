package com.webris.ris.service;

import com.webris.ris.dto.request.ReportRequest;
import com.webris.ris.dto.response.ReportResponse;
import com.webris.ris.entity.*;
import com.webris.ris.enums.ReportStatus;
import com.webris.ris.enums.StudyStatus;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final StudyRepository studyRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    @Transactional
    public ReportResponse saveReport(Long studyId, ReportRequest request, Long doctorUserId) {
        Study study = studyRepository.findById(studyId)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", studyId));
        Doctor doctor = doctorRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "userId", doctorUserId));

        Report report = reportRepository.findByStudyId(studyId).orElse(
                Report.builder().study(study).doctor(doctor).build()
        );

        report.setClinicalHistory(request.getClinicalHistory());
        report.setFindings(request.getFindings());
        report.setImpression(request.getImpression());
        report.setConclusion(request.getConclusion());
        report.setRecommendations(request.getRecommendations());

        if (request.isSubmit()) {
            report.setSubmittedAt(LocalDateTime.now());
            boolean requiresApproval = study.getCenter() != null
                    && Boolean.TRUE.equals(study.getCenter().getRequireReportApproval());
            if (requiresApproval) {
                report.setStatus(ReportStatus.SUBMITTED);
                study.setStatus(StudyStatus.REPORT_COMPLETED);
            } else {
                // Center configured for auto-approval — skip manual review step
                report.setStatus(ReportStatus.APPROVED);
                report.setApprovedAt(LocalDateTime.now());
                study.setStatus(StudyStatus.APPROVED);
            }
        } else {
            report.setStatus(ReportStatus.DRAFT);
            study.setStatus(StudyStatus.REPORT_PENDING);
        }

        studyRepository.save(study);
        return toResponse(reportRepository.save(report));
    }

    @Transactional
    public ReportResponse approveReport(Long reportId, Long approverId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));
        User approver = userRepository.findById(approverId).orElse(null);

        report.setStatus(ReportStatus.APPROVED);
        report.setApprovedBy(approver);
        report.setApprovedAt(LocalDateTime.now());

        report.getStudy().setStatus(StudyStatus.APPROVED);
        studyRepository.save(report.getStudy());
        return toResponse(reportRepository.save(report));
    }

    @Transactional
    public ReportResponse rejectReport(Long reportId, String reason, Long approverId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        report.setStatus(ReportStatus.REJECTED);
        report.setRejectionReason(reason);
        report.getStudy().setStatus(StudyStatus.REPORT_PENDING);
        studyRepository.save(report.getStudy());
        return toResponse(reportRepository.save(report));
    }

    @Transactional
    public ReportResponse requestModification(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        report.setStatus(ReportStatus.DRAFT);
        report.setApprovedBy(null);
        report.setApprovedAt(null);
        report.setRejectionReason(null);
        report.getStudy().setStatus(StudyStatus.REPORT_PENDING);
        studyRepository.save(report.getStudy());
        return toResponse(reportRepository.save(report));
    }

    public ReportResponse getReportByStudy(Long studyId) {
        Report report = reportRepository.findByStudyId(studyId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "studyId", studyId));
        return toResponse(report);
    }

    public List<ReportResponse> getReportsByDoctor(Long doctorUserId) {
        Doctor doctor = doctorRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "userId", doctorUserId));
        return reportRepository.findByDoctorId(doctor.getId()).stream().map(this::toResponse).toList();
    }

    public List<ReportResponse> getPendingApprovals(Long centerId) {
        return reportRepository.findByStudyCenterIdAndStatus(centerId, ReportStatus.SUBMITTED)
                .stream().map(this::toResponse).toList();
    }

    public List<ReportResponse> getApprovedReports(Long centerId) {
        return reportRepository.findByStudyCenterIdAndStatus(centerId, ReportStatus.APPROVED)
                .stream().map(this::toResponse).toList();
    }

    public ReportResponse toResponse(Report r) {
        return ReportResponse.builder()
                .id(r.getId())
                .studyId(r.getStudy().getId())
                .labNo(r.getStudy().getLabNo())
                .patientName(r.getStudy().getPatient().getFullName())
                .studyDescription(r.getStudy().getStudyDescription())
                .doctorId(r.getDoctor().getId())
                .doctorName(r.getDoctor().getName())
                .doctorQualification(r.getDoctor().getQualification())
                .clinicalHistory(r.getClinicalHistory())
                .findings(r.getFindings())
                .impression(r.getImpression())
                .conclusion(r.getConclusion())
                .recommendations(r.getRecommendations())
                .status(r.getStatus())
                .submittedAt(r.getSubmittedAt())
                .approvedByName(r.getApprovedBy() != null ? r.getApprovedBy().getFullName() : null)
                .approvedAt(r.getApprovedAt())
                .rejectionReason(r.getRejectionReason())
                .pdfUrl(r.getPdfUrl())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
