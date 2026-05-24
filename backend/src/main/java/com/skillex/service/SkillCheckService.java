package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.skillcheck.CreateSkillCheckRequest;
import com.skillex.dto.skillcheck.SkillCheckFeedbackRequest;
import com.skillex.dto.skillcheck.SkillCheckMeetingDto;

public interface SkillCheckService {
    SkillCheckMeetingDto create(String requesterId, CreateSkillCheckRequest request);
    PagedResponse<SkillCheckMeetingDto> listForUser(String userId, int page, int size);
    SkillCheckMeetingDto addFeedback(String userId, String meetingId, SkillCheckFeedbackRequest request);
}
