package com.webris.ris.service;

import com.webris.ris.dto.request.ReportTemplateRequest;
import com.webris.ris.dto.response.ReportTemplateResponse;
import com.webris.ris.entity.Center;
import com.webris.ris.entity.ReportTemplate;
import com.webris.ris.entity.Study;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.repository.ReportTemplateRepository;
import com.webris.ris.repository.StudyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportTemplateService {

    private final ReportTemplateRepository templateRepository;
    private final CenterRepository centerRepository;
    private final StudyRepository studyRepository;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public List<ReportTemplateResponse> getTemplates(Long centerId) {
        return templateRepository
                .findByCenterIdAndIsActiveTrueOrderByTemplateNameAsc(centerId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Returns all active templates for the center that owns the given study.
     * Used by the doctor's workstation dropdown so they always see only the
     * formats that belong to the center whose case they are reporting on.
     */
    public List<ReportTemplateResponse> getTemplatesForStudy(Long studyId) {
        Study study = studyRepository.findById(studyId)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", studyId));
        Long centerId = study.getCenter().getId();
        return templateRepository
                .findByCenterIdAndIsActiveTrueOrderByTemplateNameAsc(centerId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ReportTemplateResponse createTemplate(ReportTemplateRequest request, Long centerId) {
        Center center = centerRepository.findById(centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", centerId));
        ReportTemplate template = ReportTemplate.builder()
                .center(center)
                .templateName(request.getTemplateName())
                .studyDescription(request.getStudyDescription())
                .modality(request.getModality())
                .clinicalHistoryTemplate(request.getClinicalHistoryTemplate())
                .findingsTemplate(request.getFindingsTemplate())
                .impressionTemplate(request.getImpressionTemplate())
                .conclusionTemplate(request.getConclusionTemplate())
                .recommendationsTemplate(request.getRecommendationsTemplate())
                .isActive(true)
                .build();
        return toResponse(templateRepository.save(template));
    }

    @Transactional
    public ReportTemplateResponse updateTemplate(Long id, ReportTemplateRequest request, Long centerId) {
        ReportTemplate template = templateRepository.findByIdAndCenterId(id, centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", id));
        template.setTemplateName(request.getTemplateName());
        template.setStudyDescription(request.getStudyDescription());
        template.setModality(request.getModality());
        template.setClinicalHistoryTemplate(request.getClinicalHistoryTemplate());
        template.setFindingsTemplate(request.getFindingsTemplate());
        template.setImpressionTemplate(request.getImpressionTemplate());
        template.setConclusionTemplate(request.getConclusionTemplate());
        template.setRecommendationsTemplate(request.getRecommendationsTemplate());
        return toResponse(templateRepository.save(template));
    }

    @Transactional
    public void deleteTemplate(Long id, Long centerId) {
        ReportTemplate template = templateRepository.findByIdAndCenterId(id, centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", id));
        template.setIsActive(false);
        templateRepository.save(template);
    }

    /**
     * Stores an uploaded .docx file and links its URL to the template.
     * The file is saved under uploads/report-formats/ and served as a static resource.
     */
    @Transactional
    public ReportTemplateResponse uploadDocxTemplate(Long id, MultipartFile file, Long centerId)
            throws IOException {
        ReportTemplate template = templateRepository.findByIdAndCenterId(id, centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", id));

        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().endsWith(".docx")) {
            throw new IllegalArgumentException("Only .docx files are accepted");
        }

        String filename = "tpl-" + id + "-" + UUID.randomUUID().toString().substring(0, 8) + ".docx";
        Path dir = Paths.get(uploadDir, "report-formats");
        Files.createDirectories(dir);
        Files.write(dir.resolve(filename), file.getBytes());

        template.setDocxTemplateUrl("/api/uploads/report-formats/" + filename);
        return toResponse(templateRepository.save(template));
    }

    /**
     * Find best matching template for a study.
     * Priority: study description match > modality match
     */
    public Optional<ReportTemplateResponse> findMatchingTemplate(Long studyId, Long centerId) {
        Study study = studyRepository.findById(studyId)
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", studyId));

        // 1. Try study description match
        List<ReportTemplate> byDesc = templateRepository
                .findByStudyDescription(centerId, study.getStudyDescription());
        if (!byDesc.isEmpty()) {
            return Optional.of(toResponse(byDesc.get(0)));
        }

        // 2. Fallback: modality match
        List<ReportTemplate> byModality = templateRepository
                .findByModality(centerId, study.getModality().name());
        if (!byModality.isEmpty()) {
            return Optional.of(toResponse(byModality.get(0)));
        }

        return Optional.empty();
    }

    private ReportTemplateResponse toResponse(ReportTemplate t) {
        return ReportTemplateResponse.builder()
                .id(t.getId())
                .centerId(t.getCenter().getId())
                .templateName(t.getTemplateName())
                .studyDescription(t.getStudyDescription())
                .modality(t.getModality())
                .clinicalHistoryTemplate(t.getClinicalHistoryTemplate())
                .findingsTemplate(t.getFindingsTemplate())
                .impressionTemplate(t.getImpressionTemplate())
                .conclusionTemplate(t.getConclusionTemplate())
                .recommendationsTemplate(t.getRecommendationsTemplate())
                .docxTemplateUrl(t.getDocxTemplateUrl())
                .isActive(t.getIsActive())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
