package com.webris.ris.dto.request;

import com.webris.ris.enums.CenterPlan;
import com.webris.ris.enums.SubscriptionStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SubscriptionUpdateRequest {
    private CenterPlan plan;
    private SubscriptionStatus subscriptionStatus;
    private LocalDateTime planStartDate;
    private LocalDateTime planEndDate;
    private Integer maxStudiesPerMonth;
}
