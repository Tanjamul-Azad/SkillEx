package com.skillex.repository;

import com.skillex.model.Discussion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, String> {

    Page<Discussion> findByCategoryIgnoreCase(String category, Pageable pageable);

    Page<Discussion> findByIsPinnedTrueOrderByCreatedAtDesc(Pageable pageable);

    Page<Discussion> findByAuthorId(String authorId, Pageable pageable);

    long countByAuthorId(String authorId);
}
