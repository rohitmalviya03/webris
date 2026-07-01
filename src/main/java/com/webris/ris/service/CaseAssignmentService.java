package com.webris.ris.service;

import com.webris.ris.dto.request.AssignStudyRequest;
import com.webris.ris.dto.response.DoctorResponse;
import com.webris.ris.dto.response.StudyResponse;
import com.webris.ris.entity.Doctor;
import com.webris.ris.entity.Study;
import com.webris.ris.enums.StudyStatus;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.DoctorRepository;
import com.webris.ris.repository.StudyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CaseAssignmentService {

    private final StudyRepository studyRepository;
    private final DoctorRepository doctorRepository;
    private final StudyService studyService;

    @Transactional
    public StudyResponse assignStudy(AssignStudyRequest request, Long callerCenterId) {
        Study study = studyRepository.findById(request.getStudyId())
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", request.getStudyId()));

        // SUPER_ADMIN (callerCenterId == null) may assign cross-center; everyone else must own the study
        if (callerCenterId != null && !study.getCenter().getId().equals(callerCenterId)) {
            throw new AccessDeniedException("Study does not belong to your center");
        }

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", "id", request.getDoctorId()));

        // Doctor must belong to the same center as the study
        Long studyCenterId = study.getCenter().getId();
        if (doctor.getCenter() == null || !doctor.getCenter().getId().equals(studyCenterId)) {
            throw new AccessDeniedException("Doctor does not belong to the same center as the study");
        }

        study.setAssignedDoctor(doctor);
        study.setAssignedAt(LocalDateTime.now());
        study.setStatus(StudyStatus.ASSIGNED);
        return studyService.toResponse(studyRepository.save(study));
    }

    public List<DoctorResponse> getAvailableDoctors(Long centerId) {
        List<Doctor> doctors = centerId != null
                ? doctorRepository.findByCenterIdAndIsActiveTrue(centerId)
                : doctorRepository.findByIsActiveTrue();
        return doctors.stream().map(this::toDoctorResponse).toList();
    }

    public List<StudyResponse> getDoctorCases(Long userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile not found for user id: " + userId));
        List<StudyStatus> activeStatuses = List.of(
                StudyStatus.ASSIGNED, StudyStatus.REPORT_PENDING, StudyStatus.REPORT_COMPLETED
        );
        return studyRepository.findByAssignedDoctorIdAndStatusIn(doctor.getId(), activeStatuses)
                .stream().map(studyService::toResponse).toList();
    }

    private DoctorResponse toDoctorResponse(Doctor d) {
        List<StudyStatus> activeStatuses = List.of(
                StudyStatus.ASSIGNED, StudyStatus.REPORT_PENDING
        );
        int pending = (int) studyRepository.countByAssignedDoctorIdAndStatusIn(d.getId(), activeStatuses);
        return DoctorResponse.builder()
                .id(d.getId())
                .userId(d.getUser() != null ? d.getUser().getId() : null)
                .name(d.getName())
                .specialization(d.getSpecialization())
                .qualification(d.getQualification())
                .email(d.getEmail())
                .phone(d.getPhone())
                .isActive(d.getIsActive())
                .pendingCases(pending)
                .build();
    }
}
