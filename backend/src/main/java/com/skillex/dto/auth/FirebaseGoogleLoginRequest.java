package com.skillex.dto.auth;

import jakarta.validation.constraints.NotBlank;

/** Request body for POST /api/auth/firebase/google */
public record FirebaseGoogleLoginRequest(
    @NotBlank
    String idToken
) {}
