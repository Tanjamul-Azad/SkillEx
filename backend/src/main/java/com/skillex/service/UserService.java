package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.user.*;

public interface UserService {

    UserProfileDto getProfile(String userId);

    UserSkillsDto getSkills(String userId);

    UserProfileDto updateProfile(String userId, UpdateProfileRequest req);

    void changePassword(String userId, ChangePasswordRequest req);

    AddSkillResult addSkill(String userId, AddSkillRequest req);

    void updateSkillSubtitle(String userId, String skillId, String subtitle);

    void removeSkill(String userId, String skillId, String type);

    PagedResponse<UserSearchResultDto> searchUsers(String viewerId, String query, int page, int size);

    void deleteAccount(String userId);

    void requestEmailConnectOtp(String userId, RequestOtpRequest req);

    void verifyEmailConnectOtp(String userId, VerifyOtpRequest req);
}
