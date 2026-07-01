package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReportTemplateRequest {
    @NotBlank
    private String templateName;
    private String studyDescription;
    private String modality;
    private String clinicalHistoryTemplate;
    private String findingsTemplate;
    private String impressionTemplate;
    private String conclusionTemplate;
    private String recommendationsTemplate;
}
