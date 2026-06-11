package com.skillex.repository;

import com.skillex.model.TutorBotConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TutorBotConversationRepository extends JpaRepository<TutorBotConversation, String> {

    /**
     * Find the conversation for a user and skill (unique per user-skill pair)
     */
    Optional<TutorBotConversation> findByUserIdAndSkillId(String userId, String skillId);

    /**
     * Find all conversations for a user
     */
    List<TutorBotConversation> findByUserIdOrderByLastInteractionAtDesc(String userId);

    /**
     * Find active conversations for a user
     */
    @Query("SELECT c FROM TutorBotConversation c WHERE c.user.id = :userId AND c.active = true ORDER BY c.lastInteractionAt DESC")
    List<TutorBotConversation> findActiveConversations(String userId);

    /**
     * Delete conversation for a user-skill pair
     */
    void deleteByUserIdAndSkillId(String userId, String skillId);
}
