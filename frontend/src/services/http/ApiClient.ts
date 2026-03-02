/**
 * src/services/http/ApiClient.ts
 *
 * Core HTTP client following the Singleton + Template-Method OOP patterns.
 *
 * Design decisions:
 *  - Single instance (Singleton) ensures one base URL + auth header across the app
 *  - Protected `request<T>()` template method — subclasses can call it or extend it
 *  - `ApiError` encapsulates HTTP error data (error object, not raw code)
 *  - JWT is read lazily from localStorage on every request (stateless from client POV)
 *
 * Spring Boot counterpart: All calls target /api/* which Vite proxies to localhost:8080
 */

const TOKEN_KEY = 'skillex_token';

// ──────────────────────────────────────────────────────────────────────────────
//  ApiError – typed error object (Encapsulation principle)
// ──────────────────────────────────────────────────────────────────────────────

/** Thrown whenever the server returns a non-2xx status */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: unknown,
  ) {
    super(`[API ${status}] ${statusText}`);
    this.name = 'ApiError';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  TokenStore – Single-responsibility helper for JWT storage
// ──────────────────────────────────────────────────────────────────────────────

/** Manages the JWT stored in localStorage — isolated responsibility */
export const TokenStore = {
  get:   ()           => localStorage.getItem(TOKEN_KEY),
  set:   (t: string)  => localStorage.setItem(TOKEN_KEY, t),
  clear: ()           => localStorage.removeItem(TOKEN_KEY),
} as const;

// ──────────────────────────────────────────────────────────────────────────────
//  ApiClient – Abstract base HTTP client (Abstraction + Encapsulation)
// ──────────────────────────────────────────────────────────────────────────────

export class ApiClient {
  /** Resolves once at class construction — no VITE_API_URL = Vite proxy handles /api */
  protected readonly baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : '/api';
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private authHeader(): Record<string, string> {
    const token = TokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ── Protected template method — call from service subclasses ─────────────

  protected async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.authHeader(),
      ...(options?.headers as Record<string, string> ?? {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, response.statusText, errorData);
    }

    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
  }

  // ── Public convenience methods (Polymorphism via method overloads) ────────

  get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  Singleton instance — shared across all service modules
// ──────────────────────────────────────────────────────────────────────────────

/** Global singleton instance — import `httpClient` in service files */
export const httpClient = new ApiClient();

/**
 * Legacy alias — keeps old `import { api } from '@/services/api'` imports
 * working while the codebase gradually migrates to `httpClient`.
 * @deprecated Use `httpClient` instead.
 */
export const api = httpClient;
