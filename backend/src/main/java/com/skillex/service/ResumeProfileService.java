package com.skillex.service;

import com.skillex.dto.user.ApplyResumeProfileRequest;
import com.skillex.dto.user.ResumeProfileDto;
import com.skillex.dto.user.UserProfileDto;
import org.springframework.web.multipart.MultipartFile;

public interface ResumeProfileService {
    ResumeProfileDto analyze(String userId, MultipartFile file);

    ResumeProfileDto getLatest(String userId);

    UserProfileDto apply(String userId, ApplyResumeProfileRequest request);
}
