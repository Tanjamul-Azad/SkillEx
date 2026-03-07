package com.skillex.repository;

import com.skillex.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {

    Page<Review> findByToUserId(String toUserId, Pageable pageable);

    Page<Review> findByFromUserId(String fromUserId, Pageable pageable);

    // Used to prevent duplicate reviews for the same session by the same user
    boolean existsByFromUserIdAndSessionId(String fromUserId, String sessionId);

    // Calculates avg rating for a user to update User.rating
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.toUser.id = :userId")
    Double findAverageRatingByToUserId(@Param("userId") String userId);
}
