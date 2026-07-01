package com.webris.ris.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class BillingRequest {
    @NotNull
    private Long studyId;
    @NotNull
    private BigDecimal amount;
    private BigDecimal discount;
    private BigDecimal tax;
    private String paymentMode;
    private String notes;
}
