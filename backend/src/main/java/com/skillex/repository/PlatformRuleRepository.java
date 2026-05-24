package com.skillex.repository;

import com.skillex.model.PlatformRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformRuleRepository extends JpaRepository<PlatformRule, String> {
    List<PlatformRule> findByActiveTrueOrderBySeverityDescTitleAsc();
    Optional<PlatformRule> findByCodeIgnoreCase(String code);
}
