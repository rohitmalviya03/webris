package com.webris.ris.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTemplateResponse {
    private Long id;
    private Long centerId;
    private String templateName;
    private String studyDescription;
    private String modality;
    private String clinicalHistoryTemplate;
    private String findingsTemplate;
    private String impressionTemplate;
    private String conclusionTemplate;
    private String recommendationsTemplate;
    private String docxTemplateUrl;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
