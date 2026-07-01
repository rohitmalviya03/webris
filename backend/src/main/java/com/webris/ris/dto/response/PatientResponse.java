package com.webris.ris.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {
    private Long id;
    private String patientCode;
    private String fullName;
    private LocalDate dateOfBirth;
    private Integer age;
    private String gender;
    private String mobile;
    private String email;
    private String address;
    private String referringDoctor;
    private Long centerId;
    private String centerName;
    private LocalDateTime createdAt;
}
