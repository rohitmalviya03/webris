package com.webris.ris.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Safe user representation — never exposes password or internal Spring Security flags.
 * Use this in every API response that returns user information.
 */
@Data
@Builder
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String mobile;
    private String fullName;
    private String role;
    private Long centerId;
    private String centerName;
    private Boolean isActive;
    private Boolean accountLocked;
    private Integer failedLoginAttempts;
    private LocalDateTime createdAt;
}
