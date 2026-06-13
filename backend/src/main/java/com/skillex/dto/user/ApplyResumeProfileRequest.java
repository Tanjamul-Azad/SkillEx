package com.skillex.dto.user;

import java.util.List;

public record ApplyResumeProfileRequest(
    Boolean applyBio,
    Boolean applyTeachIntent,
    Boolean applyContact,
    String learnIntentText,
    List<SelectedResumeSkill> offeredSkills
) {
    public record SelectedResumeSkill(
        String name,
        String category,
        String level,
        String evidence
    ) {}
}
