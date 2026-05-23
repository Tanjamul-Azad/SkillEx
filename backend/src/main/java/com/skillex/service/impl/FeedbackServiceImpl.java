package com.skillex.service.impl;

import com.skillex.dto.feedback.CreateFeedbackRequest;
import com.skillex.dto.feedback.FeedbackDto;
import com.skillex.model.Feedback;
import com.skillex.model.User;
import com.skillex.repository.FeedbackRepository;
import com.skillex.repository.UserRepository;
import com.skillex.service.DtoMapper;
import com.skillex.service.FeedbackService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final DtoMapper mapper;

    @Override
    @Transactional
    public FeedbackDto submitFeedback(String userId, CreateFeedbackRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        Feedback feedback = Feedback.builder()
            .user(user)
            .rating(request.rating())
            .comment(request.comment())
            .build();

        Feedback saved = feedbackRepository.save(feedback);
        return mapper.toFeedback(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackDto> getAllFeedback() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(mapper::toFeedback)
            .toList();
    }
}
