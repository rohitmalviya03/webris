package com.webris.ris.service;

import com.webris.ris.dto.request.BillingRequest;
import com.webris.ris.dto.response.BillingResponse;
import com.webris.ris.entity.Billing;
import com.webris.ris.entity.Study;
import com.webris.ris.entity.User;
import com.webris.ris.enums.PaymentStatus;
import com.webris.ris.enums.StudyStatus;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.BillingRepository;
import com.webris.ris.repository.StudyRepository;
import com.webris.ris.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final BillingRepository billingRepository;
    private final StudyRepository studyRepository;
    private final UserRepository userRepository;

    @Transactional
    public BillingResponse createBilling(BillingRequest request, Long userId) {
        Study study = studyRepository.findById(request.getStudyId())
                .orElseThrow(() -> new ResourceNotFoundException("Study", "id", request.getStudyId()));

        if (billingRepository.findByStudyId(study.getId()).isPresent()) {
            throw new IllegalArgumentException("Billing already exists for this study");
        }

        User createdBy = userRepository.findById(userId).orElse(null);
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal tax = request.getTax() != null ? request.getTax() : BigDecimal.ZERO;
        BigDecimal netAmount = request.getAmount().subtract(discount).add(tax);

        String invoiceNo = generateInvoiceNo();
        Billing billing = Billing.builder()
                .study(study)
                .invoiceNo(invoiceNo)
                .testName(study.getStudyDescription())
                .amount(request.getAmount())
                .discount(discount)
                .tax(tax)
                .netAmount(netAmount)
                .paymentStatus(PaymentStatus.PAID)
                .paymentMode(request.getPaymentMode())
                .paymentDate(LocalDateTime.now())
                .notes(request.getNotes())
                .createdBy(createdBy)
                .build();
        billing = billingRepository.save(billing);

        study.setStatus(StudyStatus.READY_FOR_SCAN);
        studyRepository.save(study);

        return toResponse(billing);
    }

    public BillingResponse getBillingByStudy(Long studyId) {
        Billing billing = billingRepository.findByStudyId(studyId)
                .orElseThrow(() -> new ResourceNotFoundException("Billing", "studyId", studyId));
        return toResponse(billing);
    }

    private String generateInvoiceNo() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = billingRepository.count() + 1;
        return String.format("INV%s%04d", date, count);
    }

    public BillingResponse toResponse(Billing b) {
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
                .notes(b.getNotes())
                .createdAt(b.getCreatedAt())
                .build();
    }
}
