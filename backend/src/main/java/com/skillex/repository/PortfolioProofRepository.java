package com.skillex.repository;

import com.skillex.model.PortfolioProof;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortfolioProofRepository extends JpaRepository<PortfolioProof, String> {
    Page<PortfolioProof> findByUserIdAndVisibilityOrderByFeaturedDescCreatedAtDesc(
        String userId,
        PortfolioProof.Visibility visibility,
        Pageable pageable
    );

    Page<PortfolioProof> findByUserIdOrderByFeaturedDescCreatedAtDesc(String userId, Pageable pageable);

    long countByUserId(String userId);
}
