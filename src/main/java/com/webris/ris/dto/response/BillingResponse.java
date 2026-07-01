package com.webris.ris.dto.response;

import com.webris.ris.enums.PaymentStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingResponse {
    private Long id;
    private Long studyId;
    private String labNo;
    private String invoiceNo;
    private String testName;
    private BigDecimal amount;
    private BigDecimal discount;
    private BigDecimal tax;
    private BigDecimal netAmount;
    private PaymentStatus paymentStatus;
    private String paymentMode;
    private LocalDateTime paymentDate;
    private String notes;
    private LocalDateTime createdAt;
}
