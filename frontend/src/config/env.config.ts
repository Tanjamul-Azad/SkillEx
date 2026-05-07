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

  // ── Firebase Auth (Google popup) ──────────────────────────────
  FIREBASE_API_KEY: getViteEnv('VITE_FIREBASE_API_KEY', ''),
  FIREBASE_AUTH_DOMAIN: getViteEnv('VITE_FIREBASE_AUTH_DOMAIN', ''),
  FIREBASE_PROJECT_ID: getViteEnv('VITE_FIREBASE_PROJECT_ID', ''),
  FIREBASE_APP_ID: getViteEnv('VITE_FIREBASE_APP_ID', ''),
  FIREBASE_STORAGE_BUCKET: getViteEnv('VITE_FIREBASE_STORAGE_BUCKET', ''),
  FIREBASE_MESSAGING_SENDER_ID: getViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),

} as const;

export type Env = typeof env;
