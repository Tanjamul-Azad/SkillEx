package com.skillex.repository;

import com.skillex.model.AssessmentResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentResponseRepository extends JpaRepository<AssessmentResponse, String> {

    List<AssessmentResponse> findByAssessmentIdOrderByCreatedAtAsc(String assessmentId);
}
