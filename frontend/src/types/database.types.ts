/**
 * src/types/database.types.ts
 *
 * TypeScript DTO (Data Transfer Object) interfaces that mirror the
 * Spring Boot JPA entities and the MySQL schema in database/migrations/V1__initial_schema.sql.
 *
 * These types represent the shape of JSON payloads returned by the
 * Spring Boot REST API — NOT the raw SQL row types.
 *
 * Naming convention: PascalCase interface names = Spring Boot entity class names.
 * All date/time fields are ISO-8601 strings as serialised by Jackson.
 */

// ── Primitives ────────────────────────────────────────────────

export type SkillLevel  = 'beginner' | 'moderate' | 'expert';
export type UserLevel   = 'Newcomer' | 'Learner' | 'Practitioner' | 'Skilled' | 'Advanced' | 'Master';
export type UserRole    = 'student' | 'admin';

export type ExchangeStatus  = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type SessionStatus   = 'scheduled' | 'completed' | 'cancelled';
export type ActivityLevel   = '🔥 Very Active' | '⚡ Active' | '😴 Quiet';

// ── Entity DTOs ──────────────────────────────────────────────

/** Mirrors: skills table / Skill.java */
export interface SkillDto {
  id:          string;
  name:        string;
  icon:        string;   // Lucide icon name
  category:    string;
  description: string;
  level:       SkillLevel; // added at join with user_skills_offered/wanted
}

/** Mirrors: users table / User.java (public-facing projection) */
export interface UserDto {
  id:                string;
  name:              string;
  email:             string;
  avatar:            string;
  university:        string;
  bio:               string;
  skillexScore:      number;
  level:             UserLevel;
  sessionsCompleted: number;
  rating:            number;
  isOnline:          boolean;
  role:              UserRole;
  joinedAt:          string;  // ISO-8601
  skillsOffered:     SkillDto[];
  skillsWanted:      SkillDto[];
}

/** Mirrors: exchanges table / Exchange.java */
export interface ExchangeDto {
  id:           string;
  requesterId:  string;
  receiverId:   string;
  offeredSkill: SkillDto | null;
  wantedSkill:  SkillDto | null;
  message:      string | null;
  status:       ExchangeStatus;
  sessionDate:  string | null; // ISO-8601
  createdAt:    string;
  updatedAt:    string;
  requester:    UserDto;        // populated by Spring Boot @ManyToOne fetch
  receiver:     UserDto;
}

/** Mirrors: sessions table / Session.java */
export interface SessionDto {
  id:            string;
  exchangeId:    string;
  teacherId:     string;
  learnerId:     string;
  skill:         SkillDto;
  scheduledAt:   string;        // ISO-8601
  durationMins:  number;
  status:        SessionStatus;
  meetLink:      string | null;
  createdAt:     string;
  updatedAt:     string;
}

/** Mirrors: reviews table / Review.java */
export interface ReviewDto {
  id:        string;
  sessionId: string;
  fromUser:  UserDto;
  toUser:    UserDto;
  skill:     SkillDto;
  rating:    number;   // 1–5
  comment:   string | null;
  createdAt: string;
}

/** Mirrors: events table / Event.java */
export interface EventDto {
  id:             string;
  title:          string;
  description:    string;
  host:           UserDto;
  eventDate:      string;  // ISO-8601
  location:       string;
  isOnline:       boolean;
  coverGradient:  string;
  skills:         SkillDto[];
  createdAt:      string;
}

/** Mirrors: discussions table / Discussion.java */
export interface DiscussionDto {
  id:        string;
  title:     string;
  content:   string;
  author:    UserDto;
  category:  string;
  upvotes:   number;
  replies:   number;
  views:     number;
  isPinned:  boolean;
  createdAt: string;
}

/** Mirrors: skill_circles table / SkillCircle.java */
export interface SkillCircleDto {
  id:           string;
  name:         string;
  icon:         string;
  memberCount:  number;
  activity:     ActivityLevel;
  skills:       SkillDto[];
  members:      UserDto[];
  lastSession:  string | null;
}

// ── Common API response wrappers ─────────────────────────────
// Spring Boot typically returns: { data: T, message?: string, page?, size?, total? }

export interface PagedResponse<T> {
  data:    T[];
  total:   number;
  page:    number;
  size:    number;
}

export interface ApiResponse<T> {
  data:     T;
  message?: string;
}
