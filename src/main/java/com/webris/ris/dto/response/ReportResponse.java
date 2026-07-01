package com.webris.ris.dto.response;

import com.webris.ris.enums.ReportStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {
    private Long id;
    private Long studyId;
    private String labNo;
    private String patientName;
    private String studyDescription;
    private Long doctorId;
    private String doctorName;
    private String doctorQualification;
    private String clinicalHistory;
    private String findings;
    private String impression;
    private String conclusion;
    private String recommendations;
    private ReportStatus status;
    private LocalDateTime submittedAt;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectionReason;
    private String pdfUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
