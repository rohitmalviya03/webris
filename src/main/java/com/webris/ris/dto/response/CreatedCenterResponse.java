package com.webris.ris.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatedCenterResponse {
    private CenterResponse center;
    private String adminEmail;
    private String adminMobile;
    private String adminPassword;   // plain-text, shown once
    private String adminFullName;
    private boolean adminCreated;
}
