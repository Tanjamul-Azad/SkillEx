package com.skillex.service.match;

import com.skillex.dto.user.MatchUserDto;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory cache for match results keyed by user and limit.
 */
@Component
public class MatchResultCache {

    private record CacheEntry(List<MatchUserDto> value, Instant createdAt) {}

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public List<MatchUserDto> get(String key) {
        CacheEntry entry = cache.get(key);
        return entry == null ? null : entry.value();
    }

    public void put(String key, List<MatchUserDto> value) {
        cache.put(key, new CacheEntry(value, Instant.now()));
    }

    public int evictOlderThan(Duration maxAge) {
        Instant threshold = Instant.now().minus(maxAge);
        int before = cache.size();
        cache.entrySet().removeIf(entry -> entry.getValue().createdAt().isBefore(threshold));
        return before - cache.size();
    }

    public void clear() {
        cache.clear();
    }
}
