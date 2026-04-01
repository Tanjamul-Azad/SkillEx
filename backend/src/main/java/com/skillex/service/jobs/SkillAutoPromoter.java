package com.skillex.service.jobs;

import com.skillex.service.SkillCatalogGovernanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily governance job that auto-promotes pending skills suggested by
 * enough distinct users.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SkillAutoPromoter {

    private final SkillCatalogGovernanceService governanceService;

    @Scheduled(cron = "${app.jobs.skill-auto-promoter.cron:0 0 0 * * *}")
    public void autoPromote() {
        int promoted = governanceService.autoPromoteEligiblePendingSkills();
        log.info("[Scheduler] Skill auto-promoter completed. promoted={}", promoted);
    }
}
