package com.skillex.repository;

import com.skillex.model.ContentReport;
import com.skillex.model.ModerationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContentReportRepository extends JpaRepository<ContentReport, String> {
    Page<ContentReport> findByStatusOrderByCreatedAtDesc(ModerationStatus status, Pageable pageable);
    Page<ContentReport> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByStatus(ModerationStatus status);
}
