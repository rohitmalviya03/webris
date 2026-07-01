package com.webris.ris.dto.request;

import com.webris.ris.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserCreateRequest {
    @NotBlank
    private String username;
    @NotBlank
    @Email
    private String email;
    @NotBlank
    private String password;
    @NotBlank
    private String fullName;
    @NotNull
    private Role role;
    private Long centerId;
    private String mobile;
    private String specialization;
    private String qualification;
    private String phone;
}
