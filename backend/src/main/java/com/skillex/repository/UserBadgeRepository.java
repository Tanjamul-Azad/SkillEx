package com.skillex.repository;

import com.skillex.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserBadgeRepository extends JpaRepository<UserBadge, String> {
    List<UserBadge> findByUserIdAndStatusOrderByAwardedAtDesc(String userId, UserBadge.BadgeStatus status);
    Optional<UserBadge> findByUserIdAndBadgeCodeAndSkillId(String userId, String badgeCode, String skillId);
    List<UserBadge> findByUserIdAndStatus(String userId, UserBadge.BadgeStatus status);
}
