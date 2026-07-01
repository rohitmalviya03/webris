package com.webris.ris.repository;

import com.webris.ris.entity.TestCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TestCatalogRepository extends JpaRepository<TestCatalog, Long> {

    List<TestCatalog> findByCenterIdAndIsActiveTrueOrderByTestNameAsc(Long centerId);

    Optional<TestCatalog> findByIdAndCenterId(Long id, Long centerId);
}
