package com.skillex.repository;

import com.skillex.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    interface UserSearchCardProjection {
        String getId();
        String getName();
        String getUsername();
        String getAvatar();
        String getUniversity();
        Integer getSkillexScore();
        BigDecimal getRating();
        Integer getSessionsCompleted();
        Boolean getIsOnline();
    }

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT COUNT(u) FROM User u WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :suffix))")
    long countByEmailSuffix(@Param("suffix") String suffix);

    boolean existsByUsername(String username);

    boolean existsByUsernameIgnoreCase(String username);

    Page<User> findByNameContainingIgnoreCaseOrUniversityContainingIgnoreCase(
        String name, String university, Pageable pageable);

    Page<User> findByUsernameContainingIgnoreCaseOrNameContainingIgnoreCaseOrUniversityContainingIgnoreCase(
        String username,
        String name,
        String university,
        Pageable pageable);

    @Query("""
        SELECT
            u.id AS id,
            u.name AS name,
            u.username AS username,
            u.avatar AS avatar,
            u.university AS university,
            u.skillexScore AS skillexScore,
            u.rating AS rating,
            u.sessionsCompleted AS sessionsCompleted,
            u.isOnline AS isOnline
        FROM User u
        WHERE u.id <> :viewerId
          AND (
              :query IS NULL OR :query = ''
              OR LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%'))
              OR LOWER(COALESCE(u.university, '')) LIKE LOWER(CONCAT('%', :query, '%'))
          )
        """)
    Page<UserSearchCardProjection> searchUserCards(
        @Param("viewerId") String viewerId,
        @Param("query") String query,
        Pageable pageable);

    /**
     * Finds users who <b>offer</b> any skill in the given set.
     * Used by BasicMatchStrategy and as one half of SmartMatchStrategy's candidate pool.
     */
    @Query("""
        SELECT DISTINCT u.id FROM User u
        JOIN u.skillsOffered so
        WHERE so.id IN :skillIds
          AND u.id <> :currentUserId
        """)
    List<String> findMatchCandidates(
        @Param("currentUserId") String currentUserId,
        @Param("skillIds") java.util.Collection<String> skillIds,
        Pageable pageable);

    /**
     * Finds users who <b>want to learn</b> any skill in the given set.
     * Used by SmartMatchStrategy to surface candidates who want what the current
     * user can teach — a direction missed by {@link #findMatchCandidates}.
     */
    @Query("""
        SELECT DISTINCT u.id FROM User u
        JOIN u.skillsWanted sw
        WHERE sw.id IN :skillIds
          AND u.id <> :currentUserId
        """)
    List<String> findCandidatesByWantedSkills(
        @Param("currentUserId") String currentUserId,
        @Param("skillIds") java.util.Collection<String> skillIds,
        Pageable pageable);

    /**
     * Intent-candidate pool: users who have at least one free-text intent.
     * Used to support hybrid intent/tag matching even when exact catalog overlap is weak.
     */
    @Query("""
        SELECT u.id FROM User u
        WHERE u.id <> :currentUserId
          AND (u.teachIntentText IS NOT NULL OR u.learnIntentText IS NOT NULL)
        """)
    List<String> findIntentCandidates(
        @Param("currentUserId") String currentUserId,
        Pageable pageable);

    /**
     * Fetch all users with their <b>offered</b> skills eagerly loaded
     * (single query, no N+1).  Used by {@link com.skillex.service.match.graph.ExchangeGraphBuilder}
     * to build the exchange graph without a Hibernate session per user.
     */
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.skillsOffered")
    List<User> findAllWithOfferedSkills();

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.skillsOffered WHERE u.id IN :userIds")
    List<User> findAllWithOfferedSkillsByIds(@Param("userIds") Collection<String> userIds);

    /**
     * Fetch all users with their <b>wanted</b> skills eagerly loaded
     * (single query, no N+1).  Used by {@link com.skillex.service.match.graph.ExchangeGraphBuilder}
     * together with {@link #findAllWithOfferedSkills()} to populate each node.
     */
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.skillsWanted")
    List<User> findAllWithWantedSkills();

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.skillsWanted WHERE u.id IN :userIds")
    List<User> findAllWithWantedSkillsByIds(@Param("userIds") Collection<String> userIds);

    /**
     * Top mentors: users ordered by sessions completed descending, then rating descending.
     * Used by the analytics engine to surface the most experienced teachers.
     */
    @Query("SELECT u FROM User u ORDER BY u.sessionsCompleted DESC, u.rating DESC")
    List<User> findTopMentors(Pageable pageable);

    long countByIsOnlineTrue();
}
