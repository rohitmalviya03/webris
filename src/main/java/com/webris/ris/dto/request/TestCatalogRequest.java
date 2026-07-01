package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TestCatalogRequest {

    @NotBlank
    private String testName;

    private String shortName;
    private String modality;
    private String department;
    private BigDecimal price;
    private BigDecimal mrp;
    private Integer durationMinutes;
    private Integer reportTatHours;
    private String preparationInstructions;
    private String description;
}
