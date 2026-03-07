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
     * Finds users who share any skills with the current user (offered or wanted overlap).
     * Used by MatchService; finer bilateral scoring happens in memory.
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
}
