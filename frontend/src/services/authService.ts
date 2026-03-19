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

/** Maps any user-shaped API response to the frontend User type */
function normalizeUser(raw: Record<string, unknown>): User {
  const mapSkills = (arr: unknown): User['skillsOffered'] =>
    Array.isArray(arr)
      ? arr.map((s: Record<string, unknown>) => ({
          ...(s as unknown as User['skillsOffered'][0]),
          // Backend sends UPPERCASE enum names; frontend uses lowercase
          level: ((s.level as string) ?? 'beginner').toLowerCase() as User['skillsOffered'][0]['level'],
        }))
      : [];

  return {
    ...(raw as unknown as User),
    // Spring Boot returns avatarUrl; frontend expects avatar
    avatar: (raw.avatarUrl as string) ?? (raw.avatar as string) ?? '',
    skillsOffered: mapSkills(raw.skillsOffered),
    skillsWanted:  mapSkills(raw.skillsWanted),
  };
}

export const AuthService = {
  /** Sign in with email & password — stores the returned JWT */
  async login(email: string, password: string): Promise<{ user: User }> {
    // Clear any stale token before logging in — a stale token could cause
    // the backend to reject the request if CORS/auth filter has issues.
    TokenStore.clear();
    const data = await httpClient.post<{ token: string; user: Record<string, unknown> }>('/auth/login', { email, password });
    TokenStore.set(data.token);
    return { user: normalizeUser(data.user) };
  },

  /** Register a new account — stores JWT if returned immediately */
  async register(payload: {
    name: string;
    email: string;
    password: string;
    university?: string;
    skillToTeach?: string;
    skillToLearn?: string;
    level?: string;
  }): Promise<{ user: User; needsEmailConfirmation: boolean }> {
    TokenStore.clear();
    const data = await httpClient.post<{ token?: string; user: Record<string, unknown>; needsEmailConfirmation?: boolean }>('/auth/register', payload);
    if (data.token) TokenStore.set(data.token);
    return {
      user: normalizeUser(data.user),
      needsEmailConfirmation: data.needsEmailConfirmation ?? false,
    };
  },

  /** Clear JWT from localStorage — stateless JWT: no server call needed */
  logout(): void {
    TokenStore.clear();
  },

  /** Fetch the authenticated user's full profile including skills (returns null if token missing/invalid) */
  async getCurrentUser(): Promise<User | null> {
    if (!TokenStore.get()) return null;
    try {
      // /users/me returns UserProfileDto with skillsOffered + skillsWanted
      const raw = await httpClient.get<Record<string, unknown>>('/users/me');
      return normalizeUser(raw);
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



