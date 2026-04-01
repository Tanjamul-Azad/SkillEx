package com.skillex.service.jobs;

import com.skillex.service.embedding.SkillEmbeddingSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Warms/refreshes skill embedding cache nightly.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddingCacheWarmer {

    private final SkillEmbeddingSyncService skillEmbeddingSyncService;

    @Scheduled(cron = "${app.jobs.embedding-cache-warmer.cron:0 0 3 * * *}")
    public void warm() {
        skillEmbeddingSyncService.refreshEmbeddings();
        log.info("[Scheduler] Embedding cache warmer executed.");
    }
}
