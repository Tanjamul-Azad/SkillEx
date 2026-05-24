package com.skillex.repository;

import com.skillex.model.AiHelperConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiHelperConversationRepository extends JpaRepository<AiHelperConversation, String> {
}
