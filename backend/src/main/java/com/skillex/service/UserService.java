package com.skillex.service;

import com.skillex.dto.common.PagedResponse;
import com.skillex.dto.user.*;

public interface UserService {

    UserProfileDto getProfile(String userId);

    UserProfileDto updateProfile(String userId, UpdateProfileRequest req);

    void changePassword(String userId, ChangePasswordRequest req);

    void addSkill(String userId, AddSkillRequest req);

    void removeSkill(String userId, String skillId, String type);

    PagedResponse<UserSummaryDto> searchUsers(String query, int page, int size);

    void deleteAccount(String userId);
}
