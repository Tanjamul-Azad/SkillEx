package com.skillex.dto.user;

import java.util.List;

public record ApplyResumeProfileRequest(
    Boolean applyBio,
    Boolean applyTeachIntent,
    Boolean applyLearnIntent,
    List<SelectedResumeSkill> offeredSkills,
    List<SelectedResumeSkill> wantedSkills
) {
    public record SelectedResumeSkill(
        String name,
        String category,
        String level,
        String evidence
    ) {}
}
