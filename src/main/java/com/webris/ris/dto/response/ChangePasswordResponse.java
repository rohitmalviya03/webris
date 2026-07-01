package com.webris.ris.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordResponse {
    private Long userId;
    private String username;
    private String fullName;
    private String plainPassword;
}
