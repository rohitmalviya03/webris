package com.webris.ris.repository;

import com.webris.ris.entity.Center;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CenterRepository extends JpaRepository<Center, Long> {
    List<Center> findByIsActiveTrue();
}
