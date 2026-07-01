package com.webris.ris.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorResponse {
    private Long id;
    private Long userId;
    private String name;
    private String specialization;
    private String qualification;
    private String email;
    private String phone;
    private Boolean isActive;
    private int pendingCases;
}
