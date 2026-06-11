package com.skillex.repository;

import com.skillex.model.ResumeProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResumeProfileRepository extends JpaRepository<ResumeProfile, String> {
    Optional<ResumeProfile> findByUserId(String userId);
}
