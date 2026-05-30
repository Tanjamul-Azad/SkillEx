package com.skillex.repository;

import com.skillex.model.UserProgress;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserProgressRepository extends JpaRepository<UserProgress, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM UserProgress p WHERE p.user.id = :userId")
    Optional<UserProgress> findByUserIdForUpdate(@Param("userId") String userId);
}
