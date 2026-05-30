package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.progress.UserProgressDto;
import com.skillex.dto.progress.XpEventDto;

public interface ProgressService {
    UserProgressDto getProgress(String userId);

    PagedResponse<XpEventDto> getXpEvents(String userId, int page, int size);

    void awardXp(String userId, String sourceType, String sourceId, int xpDelta, String reason);
}
