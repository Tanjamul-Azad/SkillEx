package com.skillex.repository;

import com.skillex.model.SkillEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillEmbeddingRepository extends JpaRepository<SkillEmbedding, String> {
}
