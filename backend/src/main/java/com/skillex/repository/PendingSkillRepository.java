package com.skillex.repository;

import com.skillex.model.PendingSkill;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PendingSkillRepository extends JpaRepository<PendingSkill, String> {

    Optional<PendingSkill> findByNormalizedName(String normalizedName);

    @Query("SELECT p FROM PendingSkill p WHERE (:status IS NULL OR p.status = :status) ORDER BY p.lastSeenAt DESC")
    List<PendingSkill> findByStatusOrderByLastSeen(@Param("status") PendingSkill.Status status, Pageable pageable);
}
