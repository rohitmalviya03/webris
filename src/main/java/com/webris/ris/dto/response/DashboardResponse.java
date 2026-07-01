package com.webris.ris.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalPatients;
    private long todaysStudies;
    private long pendingReports;
    private long completedReports;
    private long assignedCases;
    private long totalStudies;
    private long approvedReports;
}
