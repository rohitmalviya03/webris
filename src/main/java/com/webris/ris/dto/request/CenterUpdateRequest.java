package com.webris.ris.dto.request;

import com.webris.ris.enums.CenterPlan;
import com.webris.ris.enums.SubscriptionStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CenterUpdateRequest {

    @NotBlank
    private String name;

    private String address;
    private String phone;
    private String email;
    private String website;
    private String contactPerson;
    private String city;
    private String state;
    private String pincode;
    private String notes;

    private CenterPlan plan;
    private SubscriptionStatus subscriptionStatus;
    private LocalDateTime planStartDate;
    private LocalDateTime planEndDate;
    private Integer maxStudiesPerMonth;
}
