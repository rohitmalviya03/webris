package com.webris.ris.repository;

import com.webris.ris.entity.User;
import com.webris.ris.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByMobile(String mobile);

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByMobile(String mobile);

    List<User> findByCenterId(Long centerId);
    List<User> findByRoleAndIsActiveTrue(Role role);

    long countByCenterId(Long centerId);
    long countByIsActiveTrue();

    @Query("SELECT u.center.id, COUNT(u) FROM User u WHERE u.center.id IN :centerIds GROUP BY u.center.id")
    List<Object[]> countGroupedByCenterIds(@Param("centerIds") List<Long> centerIds);

    /**
     * Eager-fetch center in a single JOIN query to avoid N+1 when building UserDto lists.
     * Used by AuthService.getAllUsers() which is called from SuperAdminController.
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.center")
    List<User> findAllWithCenter();

    /**
     * Eager-fetch center for a specific center's users to avoid N+1 in UserDto mapping.
     * Used by AuthService.getUsersByCenter() called from AuthController and SuperAdminController.
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.center WHERE u.center.id = :centerId")
    List<User> findByCenterIdWithCenter(@Param("centerId") Long centerId);
}
