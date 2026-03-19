package com.skillex.repository;

import com.skillex.model.SkillCatalogAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillCatalogAuditRepository extends JpaRepository<SkillCatalogAudit, String> {
}
