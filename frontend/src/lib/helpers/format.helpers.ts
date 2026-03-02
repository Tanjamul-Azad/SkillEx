/**
 * src/lib/helpers/format.helpers.ts
 * Pure utility functions for formatting display values.
 * Import: import { formatScore, formatRating, ... } from '@/lib/helpers/format.helpers'
 */

import { SCORE_TIERS } from '@/lib/constants';

/** Format a SkillEx score with commas (e.g. 1234 → "1,234"). */
export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

/** Get the tier label for a SkillEx score. */
export function getScoreTier(score: number) {
  return (
    SCORE_TIERS.find((t) => score >= t.min && score <= t.max) ?? SCORE_TIERS[0]
  );
}

/** Format a decimal rating to one decimal place (e.g. 4.666 → "4.7"). */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** Format a large number with a K/M suffix (e.g. 1500 → "1.5K"). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Format a duration in minutes as a human-readable string. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Truncate a string to maxLength, appending "…" if needed. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

/** Capitalize the first letter of a string. */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Returns initials from a full name (e.g. "Rahim Ahmed" → "RA"). */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/** Convert an ISO date string to a relative time label (e.g. "3 days ago"). */
export function timeAgo(isoDate: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / 1000
  );

  const intervals: [number, string][] = [
    [31536000, 'year'],
    [2592000,  'month'],
    [604800,   'week'],
    [86400,    'day'],
    [3600,     'hour'],
    [60,       'minute'],
  ];

  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }

  return 'just now';
}
