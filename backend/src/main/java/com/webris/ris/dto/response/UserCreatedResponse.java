package com.webris.ris.dto.response;

import com.webris.ris.enums.Role;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCreatedResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private Role role;
    private String plainPassword;   // shown once; null when password was supplied by caller
    private Long centerId;
    private String centerName;
}
