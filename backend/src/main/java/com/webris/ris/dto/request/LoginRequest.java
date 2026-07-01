package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    /** Email address or mobile number */
    @NotBlank
    private String identifier;
    @NotBlank
    private String password;
}
