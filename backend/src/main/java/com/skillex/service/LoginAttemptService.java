package com.skillex.service;

import com.skillex.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory, per-client login throttle that slows credential brute-forcing.
 *
 * <p>Keyed by client IP (not account) so an attacker cannot lock a victim out of
 * their own account from a different network. After {@code maxAttempts} failures
 * within {@code windowSeconds}, the client is blocked for {@code blockSeconds}.
 * Successful logins reset the counter.</p>
 *
 * <p>Deliberately in-memory: it matches the project's "degrade gracefully without
 * external infra" stance (no Redis required) and is fail-open — if the tracking map
 * is saturated it stops recording rather than rejecting legitimate users.</p>
 */
@Service
public class LoginAttemptService {

    /** Hard cap on tracked clients to bound memory; fail-open beyond this. */
    private static final int MAX_TRACKED_CLIENTS = 50_000;

    private final int maxAttempts;
    private final long windowMs;
    private final long blockMs;

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(
        @Value("${app.security.login.max-attempts:10}") int maxAttempts,
        @Value("${app.security.login.window-seconds:900}") long windowSeconds,
        @Value("${app.security.login.block-seconds:900}") long blockSeconds
    ) {
        this.maxAttempts = maxAttempts;
        this.windowMs = Duration.ofSeconds(windowSeconds).toMillis();
        this.blockMs = Duration.ofSeconds(blockSeconds).toMillis();
    }

    /** Rejects the request with HTTP 429 if the client is currently blocked. */
    public void assertNotBlocked(String clientKey) {
        if (clientKey == null) {
            return;
        }
        Attempt attempt = attempts.get(clientKey);
        if (attempt == null) {
            return;
        }
        long now = System.currentTimeMillis();
        synchronized (attempt) {
            if (attempt.blockedUntil > now) {
                long retryAfterSeconds = Math.max(1, (attempt.blockedUntil - now) / 1000);
                throw new TooManyRequestsException(
                    "Too many failed login attempts. Try again in " + retryAfterSeconds + " seconds.");
            }
        }
    }

    /** Records a failed login and starts a block once the threshold is exceeded. */
    public void recordFailure(String clientKey) {
        if (clientKey == null) {
            return;
        }
        long now = System.currentTimeMillis();
        if (attempts.size() >= MAX_TRACKED_CLIENTS) {
            pruneExpired(now);
            if (attempts.size() >= MAX_TRACKED_CLIENTS && !attempts.containsKey(clientKey)) {
                return; // fail-open rather than grow unbounded
            }
        }
        Attempt attempt = attempts.computeIfAbsent(clientKey, k -> new Attempt(now));
        synchronized (attempt) {
            // Reset the counter when the sliding window has elapsed.
            if (now - attempt.windowStart > windowMs) {
                attempt.windowStart = now;
                attempt.failures = 0;
            }
            attempt.failures++;
            if (attempt.failures >= maxAttempts) {
                attempt.blockedUntil = now + blockMs;
            }
        }
    }

    /** Clears the counter after a successful login. */
    public void recordSuccess(String clientKey) {
        if (clientKey != null) {
            attempts.remove(clientKey);
        }
    }

    private void pruneExpired(long now) {
        attempts.values().removeIf(a -> {
            synchronized (a) {
                return a.blockedUntil <= now && now - a.windowStart > windowMs;
            }
        });
    }

    private static final class Attempt {
        private long windowStart;
        private int failures;
        private long blockedUntil;

        private Attempt(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
