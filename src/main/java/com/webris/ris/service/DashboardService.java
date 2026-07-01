package com.webris.ris.service;

import com.webris.ris.dto.response.DashboardResponse;
import com.webris.ris.enums.ReportStatus;
import com.webris.ris.enums.StudyStatus;
import com.webris.ris.repository.PatientRepository;
import com.webris.ris.repository.ReportRepository;
import com.webris.ris.repository.StudyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudyRepository studyRepository;
    private final PatientRepository patientRepository;
    private final ReportRepository reportRepository;

    public DashboardResponse getCenterDashboard(Long centerId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        // Count ASSIGNED once — reused for both pendingReports and assignedCases
        long assignedCount = studyRepository.countByCenterIdAndStatus(centerId, StudyStatus.ASSIGNED);

        long pendingReports = assignedCount +
                studyRepository.countByCenterIdAndStatus(centerId, StudyStatus.REPORT_PENDING);

        // Single query for both SUBMITTED + APPROVED reports
        long completedReports = reportRepository.countByStudyCenterIdAndStatusIn(centerId,
                List.of(ReportStatus.SUBMITTED, ReportStatus.APPROVED));

        // Single query for both REPORT_COMPLETED + APPROVED study statuses
        long approvedReports = studyRepository.countByCenterIdAndStatusIn(centerId,
                List.of(StudyStatus.REPORT_COMPLETED, StudyStatus.APPROVED));

        return DashboardResponse.builder()
                .totalPatients(patientRepository.countByCenterId(centerId))
                .todaysStudies(studyRepository.countTodaysStudies(centerId, startOfDay, endOfDay))
                .totalStudies(studyRepository.countByCenterId(centerId))
                .pendingReports(pendingReports)
                .completedReports(completedReports)
                .assignedCases(assignedCount)
                .approvedReports(approvedReports)
                .build();
    }
}
