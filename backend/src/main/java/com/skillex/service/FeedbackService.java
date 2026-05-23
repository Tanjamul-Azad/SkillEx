package com.skillex.service;

import com.skillex.dto.feedback.CreateFeedbackRequest;
import com.skillex.dto.feedback.FeedbackDto;

import java.util.List;

public interface FeedbackService {

    /**
     * Submit a new feedback for the platform from a registered user.
     *
     * @param userId The ID of the submitting user.
     * @param request The request details containing rating and comment.
     * @return The created Feedback response DTO.
     */
    FeedbackDto submitFeedback(String userId, CreateFeedbackRequest request);

    /**
     * Retrieve all feedbacks submitted by users, sorted by creation time in descending order.
     *
     * @return A list of all Feedback response DTOs.
     */
    List<FeedbackDto> getAllFeedback();
}
