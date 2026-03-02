package com.skillex.service;

import com.skillex.dto.auth.AuthResponse;
import com.skillex.dto.auth.LoginRequest;
import com.skillex.dto.auth.RegisterRequest;
import com.skillex.model.User;

/**
 * Contract for authentication operations.
 * Implementations are in service/impl/AuthServiceImpl.java
 */
public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    User getCurrentUser(String userId);
}
