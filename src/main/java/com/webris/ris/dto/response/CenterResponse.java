package com.webris.ris.dto.response;

import com.webris.ris.enums.CenterPlan;
import com.webris.ris.enums.SubscriptionStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CenterResponse {
    private Long id;
    private String name;
    private String address;
    private String phone;
    private String email;
    private String website;
    private String contactPerson;
    private String city;
    private String state;
    private String pincode;
    private String logoUrl;
    private Boolean isActive;
    private String notes;

    private CenterPlan plan;
    private SubscriptionStatus subscriptionStatus;
    private LocalDateTime planStartDate;
    private LocalDateTime planEndDate;
    private Integer maxStudiesPerMonth;
    private Boolean requireReportApproval;

    private LocalDateTime createdAt;

    // Live stats
    private long totalPatients;
    private long totalStudies;
    private long totalUsers;
    private long monthlyStudies;
}
