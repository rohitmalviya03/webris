package com.webris.ris.service;

import com.webris.ris.dto.request.StudyRequest;
import com.webris.ris.dto.response.BillingResponse;
import com.webris.ris.dto.response.StudyResponse;
import com.webris.ris.entity.*;
import com.webris.ris.enums.StudyStatus;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudyService {

    private final StudyRepository studyRepository;
    private final PatientRepository patientRepository;
    private final CenterRepository centerRepository;
    private final UserRepository userRepository;
    private final BillingRepository billingRepository;
    private final OrthancService orthancService;

    @Transactional
    public StudyResponse createStudy(StudyRequest request, Long centerId, Long userId) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", request.getPatientId()));
        Center center = centerRepository.findById(centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", centerId));
        User createdBy = userRepository.findById(userId).orElse(null);

        String labNo = generateLabNo(centerId);
        Study study = Study.builder()
                .labNo(labNo)
                .patient(patient)
                .center(center)
                .studyDescription(request.getStudyDescription())
                .modality(request.getModality())
                .bodyPart(request.getBodyPart())
                .clinicalHistory(request.getClinicalHistory())
                .referringDoctor(request.getReferringDoctor())
                .accessionNumber(labNo)
                .status(StudyStatus.REGISTERED)
                .createdBy(createdBy)
                .build();
        study = studyRepository.save(study);
        return toResponse(study);
    }

    public Page<StudyResponse> getStudies(Long centerId, StudyStatus status, Pageable pageable) {
        Page<Study> page;
        if (status != null) {
            page = studyRepository.findByCenterIdAndStatus(centerId, status, pageable);
        } else {
            page = studyRepository.findByCenterId(centerId, pageable);
        }
        // Bulk-fetch all billings for this page in one query instead of 1 query per study
        List<Long> studyIds = page.getContent().stream().map(Study::getId).toList();
        Map<Long, Billing> billingMap = studyIds.isEmpty() ? Map.of() :
                billingRepository.findByStudyIdIn(studyIds).stream()
                        .collect(Collectors.toMap(b -> b.getStudy().getId(), Function.identity()));
        return page.map(s -> toResponseWithBilling(s, billingMap.get(s.getId())));
    }

    public StudyResponse getStudy(Long id, Long callerCenterId) {
        Study study = studyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", id));
        assertCenterAccess(study, callerCenterId);
        return toResponse(study);
    }

    public StudyResponse getStudyByLabNo(String labNo, Long callerCenterId) {
        Study study = studyRepository.findByLabNo(labNo)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "labNo", labNo));
        assertCenterAccess(study, callerCenterId);
        return toResponse(study);
    }

    @Transactional
    public StudyResponse updateStatus(Long id, StudyStatus status, Long callerCenterId) {
        Study study = studyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", id));
        assertCenterAccess(study, callerCenterId);
        study.setStatus(status);
        return toResponse(studyRepository.save(study));
    }

    @Transactional
    public StudyResponse linkOrthancStudy(String accessionNumber, String orthancStudyId, String studyInstanceUid) {
        Study study = studyRepository.findByAccessionNumber(accessionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "accessionNumber", accessionNumber));
        study.setOrthancStudyId(orthancStudyId);
        study.setStudyInstanceUid(studyInstanceUid);
        study.setStatus(StudyStatus.IMAGE_AVAILABLE);
        return toResponse(studyRepository.save(study));
    }

    @Transactional
    public StudyResponse syncWithOrthanc(Long studyId, Long callerCenterId) {
        Study study = studyRepository.findById(studyId)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", studyId));
        assertCenterAccess(study, callerCenterId);

        var result = orthancService.findStudyByAccessionNumber(study.getAccessionNumber());
        if (result.isEmpty()) {
            throw new IllegalStateException(
                "No DICOM study found in Orthanc with accession number: " + study.getAccessionNumber());
        }

        study.setOrthancStudyId(result.get().get("orthancStudyId"));
        study.setStudyInstanceUid(result.get().get("studyInstanceUid"));
        if (study.getStatus() == StudyStatus.READY_FOR_SCAN
                || study.getStatus() == StudyStatus.SCAN_COMPLETED) {
            study.setStatus(StudyStatus.IMAGE_AVAILABLE);
        }
        return toResponse(studyRepository.save(study));
    }

    // SUPER_ADMIN has null centerId and bypasses isolation
    private void assertCenterAccess(Study study, Long callerCenterId) {
        if (callerCenterId != null && !study.getCenter().getId().equals(callerCenterId)) {
            throw new AccessDeniedException("Study does not belong to your center");
        }
    }

    private String generateLabNo(Long centerId) {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = studyRepository.countByCenterId(centerId) + 1;
        // C{centerId} prefix makes lab numbers globally unique across centers
        return String.format("C%d-LAB%s%03d", centerId, date, count);
    }

    public StudyResponse toResponse(Study s) {
        Optional<Billing> billing = billingRepository.findByStudyId(s.getId());
        return toResponseWithBilling(s, billing.orElse(null));
    }

    private StudyResponse toResponseWithBilling(Study s, Billing billing) {
        return StudyResponse.builder()
                .id(s.getId())
                .labNo(s.getLabNo())
                .patientId(s.getPatient().getId())
                .patientName(s.getPatient().getFullName())
                .patientCode(s.getPatient().getPatientCode())
                .centerId(s.getCenter().getId())
                .centerName(s.getCenter().getName())
                .studyDescription(s.getStudyDescription())
                .modality(s.getModality())
                .bodyPart(s.getBodyPart())
                .clinicalHistory(s.getClinicalHistory())
                .referringDoctor(s.getReferringDoctor())
                .accessionNumber(s.getAccessionNumber())
                .orthancStudyId(s.getOrthancStudyId())
                .studyInstanceUid(s.getStudyInstanceUid())
                .status(s.getStatus())
                .assignedDoctorId(s.getAssignedDoctor() != null ? s.getAssignedDoctor().getId() : null)
                .assignedDoctorName(s.getAssignedDoctor() != null ? s.getAssignedDoctor().getName() : null)
                .assignedAt(s.getAssignedAt())
                .createdAt(s.getCreatedAt())
                .billing(billing != null ? toBillingResponse(billing) : null)
                .build();
    }

    private BillingResponse toBillingResponse(Billing b) {
        return BillingResponse.builder()
                .id(b.getId())
                .studyId(b.getStudy().getId())
                .labNo(b.getStudy().getLabNo())
                .invoiceNo(b.getInvoiceNo())
                .testName(b.getTestName())
                .amount(b.getAmount())
                .discount(b.getDiscount())
                .tax(b.getTax())
                .netAmount(b.getNetAmount())
                .paymentStatus(b.getPaymentStatus())
                .paymentMode(b.getPaymentMode())
                .paymentDate(b.getPaymentDate())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
