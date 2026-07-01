package com.webris.ris.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long userId;
    private String username;
    private String fullName;
    private String role;
    private Long centerId;
    private String centerName;
    private Boolean requireReportApproval;
}
