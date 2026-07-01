package com.webris.ris.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestCatalogResponse {
    private Long id;
    private Long centerId;
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
    private Boolean isActive;
    private LocalDateTime createdAt;
}
