package com.webris.ris.repository;

import com.webris.ris.entity.Study;
import com.webris.ris.enums.StudyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudyRepository extends JpaRepository<Study, Long> {
    Optional<Study> findByLabNo(String labNo);
    Optional<Study> findByAccessionNumber(String accessionNumber);
    Optional<Study> findByOrthancStudyId(String orthancStudyId);

    Page<Study> findByCenterId(Long centerId, Pageable pageable);
    Page<Study> findByCenterIdAndStatus(Long centerId, StudyStatus status, Pageable pageable);

    List<Study> findByAssignedDoctorIdAndStatusIn(Long doctorId, List<StudyStatus> statuses);

    @Query("SELECT s FROM Study s WHERE s.center.id = :centerId AND " +
           "s.createdAt BETWEEN :start AND :end")
    List<Study> findByCenterAndDateRange(@Param("centerId") Long centerId,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    long countByCenterId(Long centerId);
    long countByCenterIdAndStatus(Long centerId, StudyStatus status);
    long countByCenterIdAndStatusIn(Long centerId, List<StudyStatus> statuses);
    long countByCenterIdAndCreatedAtBetween(Long centerId, LocalDateTime start, LocalDateTime end);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    long countByAssignedDoctorIdAndStatusIn(Long doctorId, List<StudyStatus> statuses);

    @Query("SELECT COUNT(s) FROM Study s WHERE s.center.id = :centerId AND " +
           "s.createdAt >= :startOfDay AND s.createdAt < :endOfDay")
    long countTodaysStudies(@Param("centerId") Long centerId,
                             @Param("startOfDay") LocalDateTime startOfDay,
                             @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT s.center.id, COUNT(s) FROM Study s WHERE s.center.id IN :centerIds GROUP BY s.center.id")
    List<Object[]> countGroupedByCenterIds(@Param("centerIds") List<Long> centerIds);

    @Query("SELECT s.center.id, COUNT(s) FROM Study s WHERE s.center.id IN :centerIds " +
           "AND s.createdAt BETWEEN :start AND :end GROUP BY s.center.id")
    List<Object[]> countMonthlyGroupedByCenterIds(@Param("centerIds") List<Long> centerIds,
                                                   @Param("start") LocalDateTime start,
                                                   @Param("end") LocalDateTime end);
}
