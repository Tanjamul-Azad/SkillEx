package com.skillex.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * JWT utility — generates and validates tokens.
 *
 * <p>Tokens carry a {@code type} claim that separates short-lived <em>access</em>
 * tokens (sent on every API/WebSocket request) from longer-lived <em>refresh</em>
 * tokens (only accepted by {@code /api/auth/refresh}). This prevents a refresh
 * token from being replayed as an access token and vice versa.</p>
 */
@Component
public class JwtUtil {

    /** Claim key carrying the token kind. */
    public static final String CLAIM_TYPE = "type";
    /** Access token — authorises API and WebSocket calls. */
    public static final String TYPE_ACCESS = "access";
    /** Refresh token — only exchangeable for a new access token. */
    public static final String TYPE_REFRESH = "refresh";

    private final SecretKey secretKey;
    private final long expirationMs;
    private final long refreshExpirationMs;

    public JwtUtil(
        @Value("${app.jwt.secret}") String secret,
        @Value("${app.jwt.expiration-ms}") long expirationMs,
        @Value("${app.jwt.refresh-expiration-ms}") long refreshExpirationMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    /** Builds a short-lived access token carrying the user's identity and role. */
    public String generateToken(String userId, String email, String role) {
        return Jwts.builder()
            .subject(userId)
            .claims(Map.of("email", email, "role", role, CLAIM_TYPE, TYPE_ACCESS))
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(secretKey, Jwts.SIG.HS256)
            .compact();
    }

    /** Builds a long-lived refresh token. Carries no role so it can never grant API access. */
    public String generateRefreshToken(String userId) {
        return Jwts.builder()
            .subject(userId)
            .claims(Map.of(CLAIM_TYPE, TYPE_REFRESH))
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
            .signWith(secretKey, Jwts.SIG.HS256)
            .compact();
    }

    public Claims validateAndExtract(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public String extractUserId(String token) {
        return validateAndExtract(token).getSubject();
    }

    /**
     * Returns the token kind. Tokens issued before the {@code type} claim existed
     * are treated as access tokens for backward compatibility.
     */
    public String extractTokenType(Claims claims) {
        Object type = claims.get(CLAIM_TYPE);
        return type instanceof String value && !value.isBlank() ? value : TYPE_ACCESS;
    }

    /** True when the token is usable to authorise API/WebSocket calls (i.e. not a refresh token). */
    public boolean isAccessToken(Claims claims) {
        return !TYPE_REFRESH.equals(extractTokenType(claims));
    }
}
