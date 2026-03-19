package com.skillex.repository;

import com.skillex.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Page<User> findByNameContainingIgnoreCaseOrUniversityContainingIgnoreCase(
        String name, String university, Pageable pageable);

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

    /**
     * Fetch all users with their <b>wanted</b> skills eagerly loaded
     * (single query, no N+1).  Used by {@link com.skillex.service.match.graph.ExchangeGraphBuilder}
     * together with {@link #findAllWithOfferedSkills()} to populate each node.
     */
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.skillsWanted")
    List<User> findAllWithWantedSkills();

    /**
     * Top mentors: users ordered by sessions completed descending, then rating descending.
     * Used by the analytics engine to surface the most experienced teachers.
     */
    @Query("SELECT u FROM User u ORDER BY u.sessionsCompleted DESC, u.rating DESC")
    List<User> findTopMentors(Pageable pageable);
}
