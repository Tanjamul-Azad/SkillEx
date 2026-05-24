package com.skillex.repository;

import com.skillex.model.UserRestriction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserRestrictionRepository extends JpaRepository<UserRestriction, String> {
    @Query("""
        SELECT r FROM UserRestriction r
        WHERE r.user.id = :userId
          AND r.status = :status
          AND (r.endsAt IS NULL OR r.endsAt > :now)
        ORDER BY r.createdAt DESC
        """)
    List<UserRestriction> findActiveForUser(
        @Param("userId") String userId,
        @Param("status") UserRestriction.RestrictionStatus status,
        @Param("now") LocalDateTime now
    );

    long countByStatus(UserRestriction.RestrictionStatus status);
}
