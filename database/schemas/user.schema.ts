/**
 * data/schemas/user.schema.ts
 * Zod validation schemas for User entities.
 * Shared between frontend forms and backend validation.
 *
 * Usage: import { userSchema, createUserSchema } from '@data/schemas/user.schema'
 */

import { z } from 'zod';
import { SKILL_LEVELS } from '@/lib/constants';

export const skillLevelSchema = z.enum([...SKILL_LEVELS]);

export const skillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.string().min(1),
  category: z.string().min(1),
  level: skillLevelSchema,
  description: z.string().min(1).max(500),
});

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  avatar: z.string().url().optional().or(z.literal('')),
  university: z.string().min(1).max(200),
  bio: z.string().max(500).optional().or(z.literal('')),
  skillsOffered: z.array(skillSchema),
  skillsWanted: z.array(skillSchema),
  skillexScore: z.number().min(0),
  level: z.string().min(1),
  sessionsCompleted: z.number().min(0),
  rating: z.number().min(0).max(5),
  isOnline: z.boolean(),
  joinedAt: z.string().datetime(),
});

/** Schema for creating a new user (omits server-generated fields) */
export const createUserSchema = userSchema.omit({
  id: true,
  skillexScore: true,
  level: true,
  sessionsCompleted: true,
  rating: true,
  isOnline: true,
  joinedAt: true,
});

/** Schema for updating a user (all fields optional except id) */
export const updateUserSchema = userSchema
  .partial()
  .required({ id: true });

export type UserSchemaType = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
