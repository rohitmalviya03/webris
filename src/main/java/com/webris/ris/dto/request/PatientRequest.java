package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PatientRequest {
    @NotBlank
    private String fullName;
    private LocalDate dateOfBirth;
    private Integer age;
    private String gender;
    @NotBlank
    private String mobile;
    private String email;
    private String address;
    private String referringDoctor;
}
