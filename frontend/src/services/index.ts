/**
 * src/services/index.ts
 *
 * Barrel re-export for the entire service layer.
 * Import ANY service from '@/services' — no need to know file paths.
 *
 * OOP structure:
 *   http/ApiClient  → Singleton base HTTP client (Abstraction + Encapsulation)
 *   authService     → JWT authentication + Google OAuth
 *   userService     → User profile CRUD
 *   skillService    → Skill catalog operations
 *   matchService    → Skill-match discovery
 *   sessionService  → Teaching session management
 *   exchangeService → Peer exchange requests lifecycle
 *   reviewService   → Post-session reviews
 *   communityService→ Feed, events, circles, discussions
 */

// Core HTTP primitives
export { httpClient, ApiClient, ApiError, TokenStore } from './http/ApiClient';
export { api } from './api'; // legacy alias

// Domain services
export { AuthService, tokenStore } from './authService';
export { UserService }             from './userService';
export { SkillService }            from './skillService';
export { MatchService }            from './matchService';
export { SessionService }          from './sessionService';
export { ReviewService }           from './reviewService';
export { CommunityService }        from './communityService';
export { exchangeService }         from './exchangeService';
export type { Exchange } from './exchangeService';

