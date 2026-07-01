package com.webris.ris.repository;

import com.webris.ris.entity.Report;
import com.webris.ris.enums.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    Optional<Report> findByStudyId(Long studyId);

    @Query("SELECT r FROM Report r JOIN FETCH r.study s JOIN FETCH s.patient JOIN FETCH r.doctor " +
           "LEFT JOIN FETCH r.approvedBy WHERE r.doctor.id = :doctorId")
    List<Report> findByDoctorId(@Param("doctorId") Long doctorId);

    List<Report> findByDoctorIdAndStatus(Long doctorId, ReportStatus status);

    @Query("SELECT r FROM Report r JOIN FETCH r.study s JOIN FETCH s.patient JOIN FETCH r.doctor " +
           "LEFT JOIN FETCH r.approvedBy WHERE s.center.id = :centerId AND r.status = :status")
    List<Report> findByStudyCenterIdAndStatus(@Param("centerId") Long centerId,
                                              @Param("status") ReportStatus status);

    long countByStudyCenterIdAndStatus(Long centerId, ReportStatus status);
    long countByStudyCenterIdAndStatusIn(Long centerId, List<ReportStatus> statuses);
}
