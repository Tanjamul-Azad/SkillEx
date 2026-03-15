package com.skillex.repository;

import com.skillex.model.Skill;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String> {
    List<Skill> findByCategoryIgnoreCase(String category);
    List<Skill> findByNameContainingIgnoreCase(String keyword);
    Optional<Skill> findByNameIgnoreCase(String name);

    /**
     * Skills most in demand: ordered by how many users want to learn them.
     * Counts rows in the {@code user_skills_wanted} join table per skill.
     */
    @Query("""
        SELECT s FROM Skill s
        WHERE s.id IN (
            SELECT sw.id FROM User u JOIN u.skillsWanted sw
        )
        ORDER BY (
            SELECT COUNT(u2) FROM User u2 JOIN u2.skillsWanted sw2 WHERE sw2.id = s.id
        ) DESC
        """)
    List<Skill> findMostDemandedSkills(Pageable pageable);

    /**
     * Skills most actively taught: ordered by how many users offer them.
     * Counts rows in the {@code user_skills_offered} join table per skill.
     */
    @Query("""
        SELECT s FROM Skill s
        WHERE s.id IN (
            SELECT so.id FROM User u JOIN u.skillsOffered so
        )
        ORDER BY (
            SELECT COUNT(u2) FROM User u2 JOIN u2.skillsOffered so2 WHERE so2.id = s.id
        ) DESC
        """)
    List<Skill> findMostTaughtSkills(Pageable pageable);
}
