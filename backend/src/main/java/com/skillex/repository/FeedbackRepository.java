package com.skillex.repository;

import com.skillex.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, String> {
    
    /**
     * Retrieve all feedbacks ordered by creation timestamp in descending order.
     */
    List<Feedback> findAllByOrderByCreatedAtDesc();
}
