package com.skillex.repository;

import com.skillex.model.BadgeDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BadgeDefinitionRepository extends JpaRepository<BadgeDefinition, String> {
    Optional<BadgeDefinition> findByCode(String code);
}
