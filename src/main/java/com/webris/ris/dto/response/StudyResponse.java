package com.webris.ris.dto.response;

import com.webris.ris.enums.Modality;
import com.webris.ris.enums.StudyStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyResponse {
    private Long id;
    private String labNo;
    private Long patientId;
    private String patientName;
    private String patientCode;
    private Long centerId;
    private String centerName;
    private String studyDescription;
    private Modality modality;
    private String bodyPart;
    private String clinicalHistory;
    private String referringDoctor;
    private String accessionNumber;
    private String orthancStudyId;
    private String studyInstanceUid;
    private StudyStatus status;
    private Long assignedDoctorId;
    private String assignedDoctorName;
    private LocalDateTime assignedAt;
    private LocalDateTime createdAt;
    private BillingResponse billing;
}
