package com.skillex.repository;

import com.skillex.model.XpEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface XpEventRepository extends JpaRepository<XpEvent, String> {
    boolean existsByUserIdAndSourceTypeAndSourceId(String userId, String sourceType, String sourceId);

    Page<XpEvent> findByUserIdOrderByOccurredAtDesc(String userId, Pageable pageable);
}
