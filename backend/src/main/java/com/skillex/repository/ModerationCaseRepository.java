package com.skillex.repository;

import com.skillex.model.ModerationCase;
import com.skillex.model.ModerationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModerationCaseRepository extends JpaRepository<ModerationCase, String> {
    Page<ModerationCase> findByStatusOrderByUpdatedAtDesc(ModerationStatus status, Pageable pageable);
    Page<ModerationCase> findAllByOrderByUpdatedAtDesc(Pageable pageable);
    Page<ModerationCase> findByTargetUserIdOrderByUpdatedAtDesc(String targetUserId, Pageable pageable);
    long countByStatus(ModerationStatus status);
}
