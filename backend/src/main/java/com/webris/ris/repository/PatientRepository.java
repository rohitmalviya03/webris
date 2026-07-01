package com.webris.ris.repository;

import com.webris.ris.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByPatientCode(String patientCode);
    Optional<Patient> findByMobileAndCenterId(String mobile, Long centerId);

    @Query("SELECT p FROM Patient p WHERE p.center.id = :centerId AND " +
           "(LOWER(p.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "p.mobile LIKE CONCAT('%', :search, '%') OR " +
           "p.patientCode LIKE CONCAT('%', :search, '%'))")
    Page<Patient> searchPatients(@Param("centerId") Long centerId,
                                  @Param("search") String search,
                                  Pageable pageable);

    Page<Patient> findByCenterId(Long centerId, Pageable pageable);
    long countByCenterId(Long centerId);

    @Query("SELECT p.center.id, COUNT(p) FROM Patient p WHERE p.center.id IN :centerIds GROUP BY p.center.id")
    List<Object[]> countGroupedByCenterIds(@Param("centerIds") List<Long> centerIds);
}
