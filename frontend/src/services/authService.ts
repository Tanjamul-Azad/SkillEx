/**
 * src/services/authService.ts
 *
 * Client-side authentication service — calls the Spring Boot JWT endpoints.
 * Uses ApiClient for HTTP (Inheritance / Composition via OOP).
 *
 * Spring Boot endpoints:
 *   POST /api/auth/login             { email, password } → { token, user }
 *   POST /api/auth/register          { name, email, password, university? } → { token?, user, needsEmailConfirmation? }
 *   GET  /api/auth/me                (Bearer) → User
 *   GET  /api/auth/google            → Spring Security OAuth2 redirect
 */

import type { User } from '@/types';
import { httpClient, TokenStore } from './http/ApiClient';

/** Expose TokenStore under the old export name for backward compat */
export const tokenStore = TokenStore;

export const AuthService = {
  /** Sign in with email & password — stores the returned JWT */
  async login(email: string, password: string): Promise<{ user: User }> {
    const data = await httpClient.post<{ token: string; user: User }>('/auth/login', { email, password });
    TokenStore.set(data.token);
    return { user: data.user };
  },

  /** Register a new account — stores JWT if returned immediately */
  async register(payload: {
    name: string;
    email: string;
    password: string;
    university?: string;
  }): Promise<{ user: User; needsEmailConfirmation: boolean }> {
    const data = await httpClient.post<{ token?: string; user: User; needsEmailConfirmation?: boolean }>('/auth/register', payload);
    if (data.token) TokenStore.set(data.token);
    return {
      user: data.user,
      needsEmailConfirmation: data.needsEmailConfirmation ?? false,
    };
  },

  /** Clear JWT from localStorage — stateless JWT: no server call needed */
  logout(): void {
    TokenStore.clear();
  },

  /** Fetch the authenticated user's profile (returns null if token missing/invalid) */
  async getCurrentUser(): Promise<User | null> {
    if (!TokenStore.get()) return null;
    try {
      return await httpClient.get<User>('/auth/me');
    } catch {
      TokenStore.clear();
      return null;
    }
  },

  /** Redirect to Spring Boot Google OAuth2 initiation URL */
  loginWithGoogle(): void {
    const apiBase = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : '/api';
    window.location.href = `${apiBase}/auth/google`;
  },
};



