package com.webris.ris.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResetPasswordResponse {
    private Long   centerId;
    private String centerName;
    private String adminUsername;
    private String adminEmail;
    private String newPassword;
}
