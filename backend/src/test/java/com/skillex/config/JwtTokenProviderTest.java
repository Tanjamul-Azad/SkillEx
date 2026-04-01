package com.skillex.config;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtTokenProviderTest {

    @Test
    void shouldGenerateAndValidateToken() {
        JwtUtil jwtUtil = new JwtUtil("01234567890123456789012345678901", 60_000);

        String token = jwtUtil.generateToken("user-1", "u@example.com", "STUDENT");
        Claims claims = jwtUtil.validateAndExtract(token);

        assertEquals("user-1", claims.getSubject());
        assertEquals("u@example.com", claims.get("email"));
    }

    @Test
    void shouldRejectExpiredToken() throws Exception {
        JwtUtil jwtUtil = new JwtUtil("01234567890123456789012345678901", 1);
        String token = jwtUtil.generateToken("user-1", "u@example.com", "STUDENT");
        Thread.sleep(10);

        assertThrows(Exception.class, () -> jwtUtil.validateAndExtract(token));
    }
}
