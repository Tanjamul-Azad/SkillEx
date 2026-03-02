/**
 * site.config.ts
 * Central place for site-wide metadata and feature flags.
 * Import this anywhere with: import { siteConfig } from '@config/site.config'
 */

export const siteConfig = {
  name: 'SkillEx',
  tagline: 'The Skill Exchange Platform',
  description:
    'Trade skills instead of money. Connect with students, exchange knowledge, and grow together.',
  url: (import.meta as { env?: Record<string, string> }).env?.['VITE_APP_URL'] ?? 'http://localhost:3000',
  ogImage: '/assets/images/og-image.png',
  keywords: ['skill exchange', 'peer learning', 'student platform', 'Bangladesh'],
  author: {
    name: 'SkillEx Team',
    url: 'https://skillex.app',
  },
  socials: {
    twitter: 'https://twitter.com/skillex',
    github: 'https://github.com/skillex',
    linkedin: 'https://linkedin.com/company/skillex',
  },
} as const;

/**
 * Feature flags – toggle features without code changes.
 * In the future, these can be driven by env vars or a remote config service.
 */
export const featureFlags = {
  enableAI: true,
  enableCommunity: true,
  enableSkillChains: true,
  enableSessionScheduler: false, // coming soon
  enablePayments: false,         // coming soon
  enableNotifications: false,    // coming soon
} as const;

export type FeatureFlag = keyof typeof featureFlags;
