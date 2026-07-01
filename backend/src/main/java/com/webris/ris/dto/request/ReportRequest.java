package com.webris.ris.dto.request;

import lombok.Data;

@Data
public class ReportRequest {
    private String clinicalHistory;
    private String findings;
    private String impression;
    private String conclusion;
    private String recommendations;
    private boolean submit;
}
