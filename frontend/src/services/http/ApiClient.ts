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
    // Prefer the server's own message (inside ApiResponse envelope) over the raw HTTP status text
    const serverMessage =
      data != null && typeof data === 'object' && 'message' in data && typeof (data as Record<string, unknown>).message === 'string'
        ? (data as Record<string, unknown>).message as string
        : null;
    super(serverMessage ?? `Request failed (${status})`);
    this.name = 'ApiError';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
//  TokenStore – Single-responsibility helper for JWT storage
// ──────────────────────────────────────────────────────────────────────────────

/** Manages the JWT stored in sessionStorage — cleared when the browser tab is closed */
export const TokenStore = {
  get:   ()           => sessionStorage.getItem(TOKEN_KEY),
  set:   (t: string)  => sessionStorage.setItem(TOKEN_KEY, t),
  clear: ()           => sessionStorage.removeItem(TOKEN_KEY),
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

    const body = options?.body;
    const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;

    const headers: Record<string, string> = {
      ...this.authHeader(),
      ...(options?.headers as Record<string, string> ?? {}),
    };

    const hasContentTypeHeader =
      Object.keys(headers).some((k) => k.toLowerCase() === 'content-type');

    // Only default to JSON when the caller did not provide Content-Type and the body is not FormData.
    // FormData must let the browser set boundary automatically.
    if (!hasContentTypeHeader && !isFormDataBody) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Network request failed';
      throw new ApiError(0, 'Network Error', {
        message: `Unable to reach API server. Make sure backend is running. (${message})`,
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, response.statusText, errorData);
    }

    if (response.status === 204) return {} as T;
    const json = await response.json();

    // Unwrap Spring Boot's ApiResponse<T> envelope: { success: boolean, data: T, message?: string }
    if (json !== null && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  }

  // ── Public convenience methods (Polymorphism via method overloads) ────────

  get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    const payload =
      (typeof FormData !== 'undefined' && body instanceof FormData) ||
      body instanceof Blob ||
      body instanceof URLSearchParams ||
      typeof body === 'string'
        ? body
        : JSON.stringify(body);
    return this.request<T>(path, { ...options, method: 'POST', body: payload });
  }

  put<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    const payload =
      (typeof FormData !== 'undefined' && body instanceof FormData) ||
      body instanceof Blob ||
      body instanceof URLSearchParams ||
      typeof body === 'string'
        ? body
        : JSON.stringify(body);
    return this.request<T>(path, { ...options, method: 'PUT', body: payload });
  }

  patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    const payload =
      (typeof FormData !== 'undefined' && body instanceof FormData) ||
      body instanceof Blob ||
      body instanceof URLSearchParams ||
      typeof body === 'string'
        ? body
        : JSON.stringify(body);
    return this.request<T>(path, { ...options, method: 'PATCH', body: payload });
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
