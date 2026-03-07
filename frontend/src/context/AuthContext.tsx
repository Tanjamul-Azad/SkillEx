
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types';
import { AuthService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => void;
  logout: () => void;
  register: (data: { name: string; email: string; password: string; university?: string }) => Promise<{ success: boolean; needsEmailConfirmation?: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // On mount — restore session from stored JWT
  useEffect(() => {
    AuthService.getCurrentUser()
      .then((profile) => setUser(profile))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (
    email: string, password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // login now returns the full profile including skillsOffered / skillsWanted
      const { user } = await AuthService.login(email, password);
      setUser(user);
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
    navigate('/login');
  }, [navigate]);

  const register = useCallback(async (
    data: { name: string; email: string; password: string; university?: string }
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
    () => ({ user, isAuthenticated: !!user, isLoading, login, loginWithGoogle, logout, register }),
    [user, isLoading, login, loginWithGoogle, logout, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

