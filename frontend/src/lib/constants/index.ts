/**
 * src/lib/constants/index.ts
 * App-wide constant values.
 * Import with: import { SKILL_LEVELS, MAX_SKILLS_PER_USER, ... } from '@/lib/constants'
 */

/** Valid skill proficiency levels */
export const SKILL_LEVELS = ['beginner', 'moderate', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** Display labels for skill levels */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  moderate: 'Moderate',
  expert: 'Expert',
};

/** Badge color variants per skill level */
export const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  moderate: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  expert: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

/** SkillEx score tier thresholds */
export const SCORE_TIERS = [
  { min: 0,    max: 199,  label: 'Newcomer',          color: 'text-muted-foreground' },
  { min: 200,  max: 499,  label: 'Learner',            color: 'text-blue-500' },
  { min: 500,  max: 799,  label: 'Practitioner',       color: 'text-violet-500' },
  { min: 800,  max: 1099, label: 'Skilled',            color: 'text-amber-500' },
  { min: 1100, max: 1499, label: 'Advanced',           color: 'text-orange-500' },
  { min: 1500, max: Infinity, label: 'Master',         color: 'text-primary' },
] as const;

/** Maximum skills a user can offer or want */
export const MAX_SKILLS_PER_USER = 10;

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

/** Match status display labels */
export const MATCH_STATUS_LABELS = {
  pending:   'Pending',
  active:    'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

/** Session status display labels */
export const SESSION_STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

/** Platform skill categories */
export const SKILL_CATEGORIES = [
  'Tech',
  'Design',
  'Creative',
  'Business',
  'Language',
  'Communication',
  'Lifestyle',
  'Strategy',
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];
