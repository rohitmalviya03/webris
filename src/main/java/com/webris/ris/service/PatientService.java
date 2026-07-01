package com.webris.ris.service;

import com.webris.ris.dto.request.PatientRequest;
import com.webris.ris.dto.response.PatientResponse;
import com.webris.ris.entity.Center;
import com.webris.ris.entity.Patient;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final CenterRepository centerRepository;

    @Transactional
    public PatientResponse createPatient(PatientRequest request, Long centerId) {
        Center center = centerRepository.findById(centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", centerId));

        String patientCode = generatePatientCode(centerId);
        Patient patient = Patient.builder()
                .patientCode(patientCode)
                .fullName(request.getFullName())
                .dateOfBirth(request.getDateOfBirth())
                .age(request.getAge())
                .gender(request.getGender())
                .mobile(request.getMobile())
                .email(request.getEmail())
                .address(request.getAddress())
                .referringDoctor(request.getReferringDoctor())
                .center(center)
                .build();
        patient = patientRepository.save(patient);
        return toResponse(patient);
    }

    @Transactional
    public PatientResponse updatePatient(Long id, PatientRequest request, Long centerId) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", id));
        if (!patient.getCenter().getId().equals(centerId)) {
            throw new IllegalArgumentException("Patient does not belong to this center");
        }
        patient.setFullName(request.getFullName());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setAge(request.getAge());
        patient.setGender(request.getGender());
        patient.setMobile(request.getMobile());
        patient.setEmail(request.getEmail());
        patient.setAddress(request.getAddress());
        patient.setReferringDoctor(request.getReferringDoctor());
        return toResponse(patientRepository.save(patient));
    }

    public Page<PatientResponse> getPatients(Long centerId, String search, Pageable pageable) {
        Page<Patient> patients;
        if (StringUtils.hasText(search)) {
            patients = patientRepository.searchPatients(centerId, search, pageable);
        } else {
            patients = patientRepository.findByCenterId(centerId, pageable);
        }
        return patients.map(this::toResponse);
    }

    public PatientResponse getPatient(Long id, Long centerId) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", "id", id));
        if (!patient.getCenter().getId().equals(centerId)) {
            throw new IllegalArgumentException("Patient does not belong to this center");
        }
        return toResponse(patient);
    }

    private String generatePatientCode(Long centerId) {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = patientRepository.countByCenterId(centerId) + 1;
        // C{centerId} prefix makes codes globally unique across centers
        return String.format("C%d-PAT%s%04d", centerId, date, count);
    }

    public PatientResponse toResponse(Patient p) {
        return PatientResponse.builder()
                .id(p.getId())
                .patientCode(p.getPatientCode())
                .fullName(p.getFullName())
                .dateOfBirth(p.getDateOfBirth())
                .age(p.getAge())
                .gender(p.getGender())
                .mobile(p.getMobile())
                .email(p.getEmail())
                .address(p.getAddress())
                .referringDoctor(p.getReferringDoctor())
                .centerId(p.getCenter().getId())
                .centerName(p.getCenter().getName())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
