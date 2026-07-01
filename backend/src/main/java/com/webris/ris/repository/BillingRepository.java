package com.webris.ris.repository;

import com.webris.ris.entity.Billing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BillingRepository extends JpaRepository<Billing, Long> {
    Optional<Billing> findByStudyId(Long studyId);
    Optional<Billing> findByInvoiceNo(String invoiceNo);
    List<Billing> findByStudyCenterId(Long centerId);
    List<Billing> findByStudyIdIn(List<Long> studyIds);
}
