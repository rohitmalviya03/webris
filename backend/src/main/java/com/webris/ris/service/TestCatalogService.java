package com.webris.ris.service;

import com.webris.ris.dto.request.TestCatalogRequest;
import com.webris.ris.dto.response.TestCatalogResponse;
import com.webris.ris.entity.Center;
import com.webris.ris.entity.TestCatalog;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import com.webris.ris.repository.TestCatalogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TestCatalogService {

    private final TestCatalogRepository testCatalogRepository;
    private final CenterRepository centerRepository;

    public List<TestCatalogResponse> getTests(Long centerId) {
        return testCatalogRepository
                .findByCenterIdAndIsActiveTrueOrderByTestNameAsc(centerId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public TestCatalogResponse createTest(TestCatalogRequest request, Long centerId) {
        Center center = centerRepository.findById(centerId)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", centerId));
        TestCatalog test = TestCatalog.builder()
                .center(center)
                .testName(request.getTestName())
                .shortName(request.getShortName())
                .modality(request.getModality())
                .department(request.getDepartment())
                .price(request.getPrice())
                .mrp(request.getMrp())
                .durationMinutes(request.getDurationMinutes())
                .reportTatHours(request.getReportTatHours())
                .preparationInstructions(request.getPreparationInstructions())
                .description(request.getDescription())
                .isActive(true)
                .build();
        return toResponse(testCatalogRepository.save(test));
    }

    @Transactional
    public TestCatalogResponse updateTest(Long id, TestCatalogRequest request, Long centerId) {
        TestCatalog test = testCatalogRepository.findByIdAndCenterId(id, centerId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCatalog", "id", id));
        test.setTestName(request.getTestName());
        test.setShortName(request.getShortName());
        test.setModality(request.getModality());
        test.setDepartment(request.getDepartment());
        test.setPrice(request.getPrice());
        test.setMrp(request.getMrp());
        test.setDurationMinutes(request.getDurationMinutes());
        test.setReportTatHours(request.getReportTatHours());
        test.setPreparationInstructions(request.getPreparationInstructions());
        test.setDescription(request.getDescription());
        return toResponse(testCatalogRepository.save(test));
    }

    @Transactional
    public void deleteTest(Long id, Long centerId) {
        TestCatalog test = testCatalogRepository.findByIdAndCenterId(id, centerId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCatalog", "id", id));
        test.setIsActive(false);
        testCatalogRepository.save(test);
    }

    private TestCatalogResponse toResponse(TestCatalog t) {
        return TestCatalogResponse.builder()
                .id(t.getId())
                .centerId(t.getCenter().getId())
                .testName(t.getTestName())
                .shortName(t.getShortName())
                .modality(t.getModality())
                .department(t.getDepartment())
                .price(t.getPrice())
                .mrp(t.getMrp())
                .durationMinutes(t.getDurationMinutes())
                .reportTatHours(t.getReportTatHours())
                .preparationInstructions(t.getPreparationInstructions())
                .description(t.getDescription())
                .isActive(t.getIsActive())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
