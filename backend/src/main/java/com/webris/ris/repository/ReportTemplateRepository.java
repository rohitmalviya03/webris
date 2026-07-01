package com.webris.ris.repository;

import com.webris.ris.entity.ReportTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportTemplateRepository extends JpaRepository<ReportTemplate, Long> {

    List<ReportTemplate> findByCenterIdAndIsActiveTrueOrderByTemplateNameAsc(Long centerId);

    // Best match: same center + study description contains keyword
    @Query("SELECT t FROM ReportTemplate t WHERE t.center.id = :centerId AND t.isActive = true " +
           "AND LOWER(t.studyDescription) LIKE LOWER(CONCAT('%', :studyDesc, '%')) " +
           "ORDER BY t.id ASC")
    List<ReportTemplate> findByStudyDescription(@Param("centerId") Long centerId,
                                                 @Param("studyDesc") String studyDesc);

    // Fallback: match by modality
    @Query("SELECT t FROM ReportTemplate t WHERE t.center.id = :centerId AND t.isActive = true " +
           "AND UPPER(t.modality) = UPPER(:modality) ORDER BY t.id ASC")
    List<ReportTemplate> findByModality(@Param("centerId") Long centerId,
                                         @Param("modality") String modality);

    Optional<ReportTemplate> findByIdAndCenterId(Long id, Long centerId);
}
