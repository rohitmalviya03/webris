package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    /** GENERATE → server creates a secure random password; MANUAL → use newPassword field */
    @NotBlank
    private String mode; // "GENERATE" | "MANUAL"

    /** Required only when mode = MANUAL */
    private String newPassword;
}
