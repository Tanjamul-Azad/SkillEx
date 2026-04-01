# SkillEX Project Overview

For a shorter, non-technical summary for business and leadership audiences, see:
- [PROJECT_OVERVIEW_STAKEHOLDERS.md](PROJECT_OVERVIEW_STAKEHOLDERS.md)

## 1. What This Project Is

SkillEX is a full-stack peer skill exchange platform where users trade knowledge instead of money.
A learner and a mentor connect based on offered/wanted skills, then schedule sessions, exchange feedback, and build community reputation.

This repository is a monorepo with:
- A React + Vite frontend (user interface)
- A Spring Boot backend (REST API, auth, matching, messaging)
- Flyway-managed MySQL database migrations
- Development scripts for local setup, API smoke checks, and match quality evaluation

## 2. Monorepo Layout

```text
SkiilEX/
|- frontend/                # React 19 + TypeScript + Vite
|- backend/                 # Spring Boot 3.4 + Java 21 + Maven
|- database/                # Shared DB notes/resources
|- docs/                    # Project and architecture documentation
|- scripts/                 # Dev automation scripts
|- start.ps1                # Root local launcher helper
|- package.json             # Root concurrent dev scripts
```

## 3. Product Capabilities

### 3.1 Core Marketplace Flow
- User registration and login with JWT authentication
- User profiles with teach/learn skill preferences
- Skill catalog browsing and intent interpretation endpoint
- Match discovery for compatible users
- Exchange request lifecycle (create, view, accept/reject, delete)
- Session scheduling and state transitions (complete/cancel)
- Reviews and ratings after sessions

### 3.2 Community Features
- Community events (create, list, attend)
- Discussions (create, list, upvote)
- Posts/stories feeds and post likes
- Skill circles and membership joins
- Dashboard summary endpoint

### 3.3 Real-Time Collaboration
- STOMP over SockJS WebSocket channel
- User-targeted message queue endpoints
- Real-time inbox updates and notification updates

### 3.4 AI/Intelligence Layer
- Hybrid matching using:
  - Skill graph/semantic similarity
  - Intent-text similarity (lexical + embedding signal)
- Embedding provider abstraction with two runtime modes:
  - Local deterministic hashing provider (offline safe)
  - Gemini API embedding provider (online semantic embeddings)
- Automatic fallback to local embeddings when API mode is unavailable

## 4. Frontend Architecture (frontend)

### 4.1 Stack
- React 19
- TypeScript
- Vite 5
- React Router
- Tailwind CSS + Radix UI
- Framer Motion
- React Hook Form + Zod
- STOMP + SockJS for real-time messaging

### 4.2 Application Structure
- App shell and routing in App.tsx with lazy-loaded pages
- Feature-first folders:
  - auth
  - dashboard
  - match
  - community
  - messages
  - profile
  - settings
  - onboarding
  - marketing
  - error
- Shared cross-cutting modules:
  - components (layout/ui/icons/auth)
  - services (typed API clients by domain)
  - context (auth/theme/toast)
  - hooks (including useWebSocket)
  - config (env/navigation/site)
  - types/lib/styles

### 4.3 Client-Server Communication
- Frontend calls /api/* paths
- Vite proxy forwards /api to http://localhost:8080
- /uploads and /ws are also proxied to backend

### 4.4 HTTP Client Design
- A shared ApiClient singleton encapsulates:
  - Base URL
  - Bearer token injection
  - JSON response handling and envelope unwrapping
  - Typed ApiError handling
- Token store uses sessionStorage key skillex_token
- FormData requests intentionally avoid forcing Content-Type so browser can set multipart boundary correctly

### 4.5 Frontend Routes
- / (landing)
- /login
- /dashboard
- /match
- /community
- /messages and /messages/:userId
- /profile/:userId
- /settings
- /onboarding
- /about, /careers, /terms, /privacy, /trust

## 5. Backend Architecture (backend)

### 5.1 Stack
- Java 21
- Spring Boot 3.4.3
- Spring Security 6 with JWT
- Spring Data JPA (Hibernate)
- Flyway database migrations
- MySQL 8
- Redis integration (optional caching layer)
- Maven build

### 5.2 Layered Design
- controller: REST endpoints
- service: business contracts
- service/impl: implementations
- repository: JPA data access
- model: entities
- dto: request/response contracts
- config: security, JWT, websocket, exception handling, serialization

### 5.3 Security Model
- Stateless JWT auth for protected APIs
- Public endpoints include login/register and selected read-only resources
- CORS origins configurable via app.cors.allowed-origins
- Custom unauthorized JSON response
- Password hashing via BCrypt

### 5.4 WebSocket Model
- SockJS endpoint: /ws
- STOMP destinations:
  - /app for client-to-server sends
  - /topic for broadcasts
  - /user for user-specific queues
- JWT validation on inbound STOMP CONNECT via channel interceptor

### 5.5 Key API Domains
- Auth: /api/auth/*
- Users: /api/users/*
- Skills: /api/skills/* and /api/skills/pending/*
- Match: /api/match/*
- Exchanges: /api/exchanges/*
- Sessions: /api/sessions/*
- Reviews: /api/reviews/*
- Messages: /api/messages/*
- Notifications: /api/notifications/*
- Community: /api/community/*
- Dashboard: /api/dashboard/stats
- File upload: /api/upload

## 6. Data Model and Persistence

### 6.1 Database Strategy
- Flyway runs migrations from backend/src/main/resources/db/migration
- Baseline plus incremental schema evolution (V1 to V13 currently)

### 6.2 Main Domain Tables
- users
- skills
- user_skills_offered
- user_skills_wanted
- exchanges
- sessions
- reviews
- events
- discussions
- skill_circles
- posts
- stories
- notifications
- messages
- skill_relations
- skill_embeddings
- pending_skills
- skill_catalog_audit

### 6.3 Catalog Governance
- Pending skill submissions tracked in pending_skills
- Approval/rejection actions audited in skill_catalog_audit
- Auto-promotion thresholds are configurable in application properties

## 7. Matching and Scoring Engine

The matching pipeline combines static and dynamic signals:
- Skill overlap and similarity through match strategies
- Intent text comparison using lexical and embedding signals
- Candidate metadata signals (rating, activity, recency, exchange balance)
- New-user boost for low-history accounts

The service namespace includes:
- Basic and smart strategies
- Match engine and graph helpers
- Compatibility calculator with deterministic test coverage
- Embedding cache and provider adapters

## 8. Runtime Configuration

Backend runtime config is managed in application.properties with environment overrides.
Key configurable areas:
- DB connection and credentials
- JWT secret and expiration
- CORS origins
- Embedding provider and fallback options
- Intent matching weights and thresholds
- Redis host/port/TTL for embedding cache

Frontend runtime config uses Vite environment variables via typed env access.

## 9. Local Development Workflow

### 9.1 Standard Start
From repository root:
- npm install
- npm run dev

This launches:
- Backend through scripts/dev/run-backend.ps1
- Frontend through Vite on port 3000

### 9.2 Database Bootstrapping
- scripts/dev/ensure-mysql.ps1 checks DB reachability
- Attempts to start MySQL service or XAMPP MySQL when needed
- Verifies/creates the configured database

### 9.3 Alternative Launcher
- start.ps1 can stop stale java/node processes and run local dev flow

## 10. Quality and Verification Tooling

### 10.1 Automated API Feature Check
scripts/dev/api-feature-check.ps1 performs an end-to-end API smoke run:
- Registers/login users
- Exercises auth/profile/skills
- Runs community interactions
- Runs exchange/session/review workflow
- Validates status codes and response outcomes

### 10.2 Matching Evaluation Harness
scripts/dev/match-eval.ps1 computes offline ranking quality metrics:
- Precision@K
- Recall@K
- Per-case report export to JSON

### 10.3 Tests Present
Current backend test suite includes:
- Spring context test
- Compatibility calculator behavior tests

## 11. Important Notes for Contributors

- Java runtime is currently set to 21 in backend build properties.
- Some older docs in the repository describe a previous architecture and may be stale.
  The actual source tree and this document should be treated as the current reference.
- For multipart uploads from frontend, do not force application/json Content-Type.
- WebSocket and REST both depend on consistent JWT token handling.

## 12. Quick Onboarding Checklist

1. Install Java 21, Node.js, and MySQL (or XAMPP MySQL).
2. Configure backend environment variables (or backend/.env).
3. Run npm install at project root.
4. Start app with npm run dev.
5. Open frontend at http://localhost:3000.
6. Verify backend health by hitting a public endpoint like /api/skills.
7. Optionally run scripts/dev/api-feature-check.ps1 for integration smoke validation.

## 13. Executive Summary

SkillEX is a production-style full-stack skill marketplace with:
- Strong separation of concerns across frontend/backend/data layers
- JWT-secured REST APIs with real-time messaging support
- Structured Flyway-based schema governance
- A hybrid AI-assisted matching engine with safe local fallback mode
- Practical local-dev automation and QA scripts

This architecture is suitable for iterative feature growth and team collaboration while keeping the codebase modular and understandable.
