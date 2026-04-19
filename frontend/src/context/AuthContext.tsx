
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';
import { AuthService } from '@/services/authService';
import { ApiError } from '@/services/http/ApiClient';
import { registerOn401Handler, clearOn401Handler } from '@/services/http/ApiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => void;
  logout: () => void;
  register: (data: { name: string; email: string; password: string; university?: string; skillToTeach?: string; skillToLearn?: string; level?: string }) => Promise<{ success: boolean; needsEmailConfirmation?: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_CACHE_KEY = 'skillex_auth_user';

function readCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null): void {
  if (!user) {
    sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
    return;
  }

  sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // On mount — restore session from stored JWT
  useEffect(() => {
    let active = true;

    const restore = async () => {
      AuthService.consumeGoogleCallbackFromUrl();
      try {
        const profile = await AuthService.getCurrentUser();
        if (!active) return;
        setUser(profile);
        writeCachedUser(profile);
      } catch (error) {
        if (!active) return;
        const isTransientFailure =
          error instanceof ApiError &&
          (error.status === 0 || error.status >= 500);

        if (!isTransientFailure) {
          setUser(null);
          writeCachedUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  // Register global 401 handler — clears session when token expires
  useEffect(() => {
    registerOn401Handler(() => {
      setUser(null);
      writeCachedUser(null);
      navigate('/login');
    });
    return () => clearOn401Handler();
  }, [navigate]);

  const login = useCallback(async (
    email: string, password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // login now returns the full profile including skillsOffered / skillsWanted
      const { user } = await AuthService.login(email, password);
      setUser(user);
      writeCachedUser(user);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      console.warn('[auth] Login failed:', message);
      return { success: false, error: message };
    }
  }, []);

  const loginWithGoogle = useCallback((): void => {
    AuthService.loginWithGoogle();
    // Browser redirects to Spring Boot → Google → back to /dashboard or /onboarding
  }, []);

  const logout = useCallback((): void => {
    AuthService.logout();
    setUser(null);
    writeCachedUser(null);
    navigate('/login');
  }, [navigate]);

  const refreshUser = useCallback(async (): Promise<void> => {
    const profile = await AuthService.getCurrentUser();
    setUser(profile);
    writeCachedUser(profile);
  }, []);

  const register = useCallback(async (
    data: { name: string; email: string; password: string; university?: string; skillToTeach?: string; skillToLearn?: string; level?: string }
  ): Promise<{ success: boolean; needsEmailConfirmation?: boolean; error?: string }> => {
    try {
      const { needsEmailConfirmation } = await AuthService.register(data);
      // Don't auto-login — user is redirected to the login tab to sign in explicitly
      // Clear the JWT so the session isn't silently restored before they log in
      AuthService.logout();
      return { success: true, needsEmailConfirmation };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      console.warn('[auth] Registration failed:', message);
      return { success: false, error: message };
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, loginWithGoogle, logout, register, refreshUser }),
    [user, isLoading, login, loginWithGoogle, logout, register, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

