package com.webris.ris.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalStatsResponse {
    private long totalCenters;
    private long activeCenters;
    private long inactiveCenters;
    private long expiredSubscriptions;
    private long totalPatients;
    private long totalStudies;
    private long totalUsers;
    private long monthlyStudies;

    // Plan distribution
    private long trialCenters;
    private long starterCenters;
    private long professionalCenters;
    private long enterpriseCenters;
}
