package com.skillex.config;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtTokenProviderTest {

    private static final String SECRET = "01234567890123456789012345678901";

    @Test
    void shouldGenerateAndValidateToken() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000, 120_000);

        String token = jwtUtil.generateToken("user-1", "u@example.com", "STUDENT");
        Claims claims = jwtUtil.validateAndExtract(token);

        assertEquals("user-1", claims.getSubject());
        assertEquals("u@example.com", claims.get("email"));
    }

    @Test
    void shouldRejectExpiredToken() throws Exception {
        JwtUtil jwtUtil = new JwtUtil(SECRET, 1, 120_000);
        String token = jwtUtil.generateToken("user-1", "u@example.com", "STUDENT");
        Thread.sleep(10);

        assertThrows(Exception.class, () -> jwtUtil.validateAndExtract(token));
    }

    @Test
    void accessTokenIsMarkedAsAccess() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000, 120_000);

        Claims claims = jwtUtil.validateAndExtract(
            jwtUtil.generateToken("user-1", "u@example.com", "STUDENT"));

        assertEquals(JwtUtil.TYPE_ACCESS, jwtUtil.extractTokenType(claims));
        assertTrue(jwtUtil.isAccessToken(claims));
    }

    @Test
    void refreshTokenCannotBeUsedAsAccessToken() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000, 120_000);

        Claims claims = jwtUtil.validateAndExtract(jwtUtil.generateRefreshToken("user-1"));

        assertEquals("user-1", claims.getSubject());
        assertEquals(JwtUtil.TYPE_REFRESH, jwtUtil.extractTokenType(claims));
        assertFalse(jwtUtil.isAccessToken(claims));
    }
}
