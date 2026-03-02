/**
 * env.config.ts
 * Typed, validated environment variable access for Vite.
 * All env vars should be prefixed with VITE_ in .env.local
 *
 * Usage: import { env } from '@config/env.config'
 */

function getViteEnv(key: string, fallback = ''): string {
  // import.meta.env is available at runtime in Vite builds
  const meta = (import.meta as { env?: Record<string, string> }).env ?? {};
  return meta[key] ?? fallback;
}

/** All environment configuration */
export const env = {
  // ── App ──────────────────────────────────────────────────────────
  APP_URL: getViteEnv('VITE_APP_URL', 'http://localhost:3000'),
  // Base URL for Spring Boot API calls.
  // Empty = Vite dev proxy forwards /api → http://localhost:8080
  API_URL: getViteEnv('VITE_API_URL', ''),
  IS_PROD: getViteEnv('MODE', 'development') === 'production',
  IS_DEV:  getViteEnv('MODE', 'development') !== 'production',

} as const;

export type Env = typeof env;
