package com.webris.ris.service;

import com.webris.ris.repository.UserRepository;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Two-layer login protection:
 *
 * 1. IP-based rate limiting via Bucket4j (in-memory).
 *    — Limits burst login attempts per IP address.
 *    — For multi-instance deployments, replace the ConcurrentHashMap
 *      with a Bucket4j Redis/Hazelcast proxy backed by a shared cache.
 *
 * 2. Account-level lockout stored in the database.
 *    — Survives server restarts and works correctly in all deployment models.
 *    — Time-based: auto-expires after lockDurationMinutes.
 *    — Uses REQUIRES_NEW so the lock is committed even if the outer
 *      login transaction rolls back on BadCredentialsException.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginAttemptService {

    private final UserRepository userRepository;

    @Value("${login.max-attempts:5}")
    private int maxAttempts;

    @Value("${login.lock-duration-minutes:30}")
    private int lockDurationMinutes;

    @Value("${login.rate-limit.ip-capacity:10}")
    private int ipCapacity;

    @Value("${login.rate-limit.ip-refill-minutes:1}")
    private int ipRefillMinutes;

    /** Per-IP Bucket4j buckets (in-memory). */
    private final ConcurrentHashMap<String, Bucket> ipBuckets = new ConcurrentHashMap<>();

    // ── IP rate limiting ──────────────────────────────────────────────────────

    /**
     * Returns true if this IP has exceeded its allowed login attempts per minute.
     * Call this BEFORE the authentication attempt.
     */
    public boolean isIpRateLimited(String ipAddress) {
        Bucket bucket = ipBuckets.computeIfAbsent(ipAddress, this::createIpBucket);
        boolean allowed = bucket.tryConsume(1);
        if (!allowed) {
            log.warn("Rate limit exceeded for IP: {}", ipAddress);
        }
        return !allowed;
    }

    private Bucket createIpBucket(String ip) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(ipCapacity)
                .refillIntervally(ipCapacity, Duration.ofMinutes(ipRefillMinutes))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    // ── Account-level lockout (DB-backed) ────────────────────────────────────

    /**
     * Increments the failed-attempt counter for the user identified by identifier
     * (email / mobile / username). Locks the account once maxAttempts is reached.
     *
     * REQUIRES_NEW ensures this commit is independent of the caller's transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedAttempt(String identifier) {
        userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByMobile(identifier))
                .or(() -> userRepository.findByUsername(identifier))
                .ifPresent(user -> {
                    int attempts = (user.getFailedLoginAttempts() == null
                            ? 0 : user.getFailedLoginAttempts()) + 1;
                    user.setFailedLoginAttempts(attempts);

                    if (attempts >= maxAttempts) {
                        user.setAccountLocked(true);
                        user.setLockExpiresAt(
                                LocalDateTime.now().plusMinutes(lockDurationMinutes));
                        log.warn("Account locked after {} failed attempts: username={}",
                                attempts, user.getUsername());
                    }
                    userRepository.save(user);
                });
    }

    /**
     * Resets the failed-attempt counter and clears any lock on successful login.
     *
     * REQUIRES_NEW so this commit is always written regardless of outer transaction state.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resetFailedAttempts(String identifier) {
        userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByMobile(identifier))
                .or(() -> userRepository.findByUsername(identifier))
                .ifPresent(user -> {
                    if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0
                            || Boolean.TRUE.equals(user.getAccountLocked())) {
                        user.setFailedLoginAttempts(0);
                        user.setAccountLocked(false);
                        user.setLockExpiresAt(null);
                        userRepository.save(user);
                    }
                });
    }
}
