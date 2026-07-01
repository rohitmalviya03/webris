package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignStudyRequest {
    @NotNull
    private Long studyId;
    @NotNull
    private Long doctorId;
}
