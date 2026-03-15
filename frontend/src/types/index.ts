
import type { SkillLevel } from '@/lib/constants';
export type { SkillLevel };

export type MatchStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type NotificationType = 'MATCH_REQUEST' | 'SESSION_SCHEDULED' | 'REVIEW_LEFT' | 'SYSTEM_UPDATE';

export interface Skill {
  id: string;
  name: string;
  icon: string;
  category: string;
  level: SkillLevel;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  university: string;
  bio: string;
  skillsOffered: Skill[];
  skillsWanted: Skill[];
  skillexScore: number;
  level: string;
  sessionsCompleted: number;
  rating: number;
  isOnline: boolean;
  joinedAt: string;
}

export interface SkillMatch {
  id: string;
  userA: User;
  userB: User;
  skillATeaches: Skill;
  skillBTeaches: Skill;
  compatibilityScore: number;
  status: MatchStatus;
  sessionsCompleted: number;
  totalSessions: number;
  nextSession?: string;
}

export interface SkillChain {
  id: string;
  members: User[];
  skills: Skill[];
  status: MatchStatus;
}

export interface Session {
  id: string;
  /** Maps to SessionDto.exchangeId */
  exchangeId: string;
  /** Maps to SessionDto.teacher (UserSummaryDto) */
  teacher: { id: string; name: string; avatar: string | null; university: string | null };
  /** Maps to SessionDto.learner (UserSummaryDto) */
  learner: { id: string; name: string; avatar: string | null; university: string | null };
  skill: { id: string; name: string; icon: string; category: string };
  scheduledAt: string;
  /** Maps to SessionDto.durationMins */
  durationMins: number;
  status: SessionStatus;
  meetLink?: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  fromUser: User;
  toUser: User;
  skill: Skill;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  host: User;
  /** Maps to EventDto.eventDate from backend */
  eventDate: string;
  location: string;
  isOnline: boolean;
  skills: Skill[];
  attendees: User[];
  coverGradient: string;
}

export interface Discussion {
  id: string;
  title: string;
  author: User;
  category: string;
  content: string;
  upvotes: number;
  replies: number;
  views: number;
  createdAt: string;
  isPinned: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  fromUser?: User;
  createdAt: string;
  isRead: boolean;
}

/** Backend enum values serialized as strings */
export type ActivityLevel = 'VERY_ACTIVE' | 'ACTIVE' | 'QUIET';

export interface SkillCircle {
  id: string;
  name: string;
  icon: string; // emoji
  activity: ActivityLevel;
  skills: Skill[];
  memberCount: number;
  members: User[]; // for avatars
  lastSession: string;
}

export interface Story {
  id: string;
  user: User;
  isSeen: boolean;
}

export type PostType = 'showcase' | 'achievement' | 'exchange' | 'question';

export interface Post {
  id: string;
  type: PostType;
  author: User;
  createdAt: string;
  content: string; // for questions or general posts
  skill?: Skill; // for showcase or questions
  badge?: { name: string; icon: string }; // for achievements
  exchangePartners?: [User, User];
  likes: number;
  comments: number;
  shares: number;
}
