package com.skillex.service.jobs;

import com.skillex.service.match.IntentEmbeddingCache;
import com.skillex.service.match.MatchResultCache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Invalidates stale match caches every 6 hours.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MatchCacheRefresher {

    private final MatchResultCache matchResultCache;
    private final IntentEmbeddingCache intentEmbeddingCache;

    @Scheduled(cron = "${app.jobs.match-cache-refresh.cron:0 0 */6 * * *}")
    public void refresh() {
        int evicted = matchResultCache.evictOlderThan(Duration.ofHours(6));
        intentEmbeddingCache.clearMemoryCache();
        log.info("[Scheduler] Match cache refresher completed. evicted={}", evicted);
    }
}
