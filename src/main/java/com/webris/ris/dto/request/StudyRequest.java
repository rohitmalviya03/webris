package com.webris.ris.dto.request;

import com.webris.ris.enums.Modality;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StudyRequest {
    @NotNull
    private Long patientId;
    @NotBlank
    private String studyDescription;
    @NotNull
    private Modality modality;
    private String bodyPart;
    private String clinicalHistory;
    private String referringDoctor;
}
