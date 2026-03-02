# SkillEX — Project Architecture

## Stack Overview

| Layer             | Technology                                           |
|-------------------|------------------------------------------------------|
| Frontend          | React 19 + TypeScript + Vite                         |
| UI Components     | Radix UI primitives + Tailwind CSS (shadcn/ui style)  |
| Animations        | Framer Motion                                        |
| Routing           | React Router DOM v6                                  |
| Forms             | React Hook Form + Zod (schema validation)            |
| State             | React Context API (Auth, Theme, Toast)               |
| Backend (planned) | Spring Boot 3 + Java 21 (REST + JWT)                 |
| Auth              | Spring Security — JWT + Google OAuth2                |
| Database          | MySQL 8.0+ (Spring Data JPA + Flyway migrations)     |

---

## Directory Structure

```
SkiilEX/
├── src/                          # All frontend source code
│   ├── App.tsx                   # Root router & provider tree
│   ├── main.tsx                  # Vite entry point
│   ├── vite-env.d.ts
│   │
│   ├── features/                 ← FEATURE-FIRST layout (vertical slice)
│   │   ├── auth/
│   │   │   ├── pages/LoginPage.tsx
│   │   │   └── index.ts          ← barrel export
│   │   ├── marketing/
│   │   │   └── pages/LandingPage.tsx
│   │   ├── dashboard/
│   │   │   └── pages/DashboardPage.tsx
│   │   ├── match/
│   │   │   ├── pages/MatchPage.tsx
│   │   │   └── components/RequestExchangeDialog.tsx
│   │   ├── community/
│   │   │   └── pages/CommunityPage.tsx
│   │   ├── profile/
│   │   │   ├── pages/ProfilePage.tsx
│   │   │   └── components/AddSkillDialog.tsx
│   │   ├── settings/
│   │   │   └── pages/SettingsPage.tsx
│   │   ├── onboarding/
│   │   │   └── pages/OnboardingPage.tsx
│   │   └── error/
│   │       └── NotFoundPage.tsx
│   │
│   ├── components/               ← SHARED components (not feature-specific)
│   │   ├── ui/                   ← Primitive UI (Button, Card, Input, …)
│   │   ├── layout/               ← Layout shells (DashboardLayout, MarketingLayout)
│   │   ├── auth/                 ← Auth-specific shared components
│   │   └── icons/                ← SVG icon components
│   │
│   ├── services/                 ← Service layer (API calls → Spring Boot)
│   │   ├── http/
│   │   │   └── ApiClient.ts      ← Singleton HTTP client (OOP base class)
│   │   ├── api.ts                ← Legacy re-export alias
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── skillService.ts
│   │   ├── matchService.ts
│   │   ├── sessionService.ts
│   │   ├── reviewService.ts
│   │   ├── communityService.ts
│   │   ├── exchangeService.ts
│   │   └── index.ts              ← barrel export
│   │
│   ├── context/                  ← React Context providers
│   │   ├── AuthContext.tsx        (User session, login/logout/register)
│   │   ├── ThemeContext.tsx       (dark/light/system)
│   │   └── ToastContext.tsx       (notification state)
│   │
│   ├── hooks/                    ← Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useCounter.ts
│   │   ├── useExchanges.ts
│   │   ├── useMatchUsers.ts
│   │   ├── useScrollAnimation.ts
│   │   ├── useTheme.ts
│   │   └── use-toast.ts
│   │
│   ├── types/                    ← TypeScript domain types
│   │   ├── index.ts              (User, Skill, Match, Session, Review, …)
│   │   └── database.types.ts
│   │
│   ├── lib/                      ← Utilities, constants, helpers
│   │   ├── utils.ts              (cn() merge helper)
│   │   ├── constants/index.ts    (SKILL_LEVELS, SCORE_TIERS, …)
│   │   ├── helpers/
│   │   │   └── format.helpers.ts
│   │   └── placeholder-images.ts
│   │
│   ├── config/                   ← App-wide configuration
│   │   ├── site.config.ts        (metadata, feature flags)
│   │   ├── env.config.ts         (typed Vite env vars)
│   │   └── navigation.config.ts  (nav links, route groups)
│   │
│   └── styles/
│       └── globals.css           ← Tailwind base styles + CSS variables
│
├── database/                     ← Database artefacts (MySQL)
│   ├── migrations/               ← Flyway SQL files (V1__*.sql, V2__*.sql …)
│   ├── schemas/                  ← TypeScript Zod entity schemas
│   ├── seeds/                    ← Dev seed scripts
│   └── mock/                     ← Mock data (used until Spring Boot is live)
│
├── public/                       ← Static assets (images, fonts, icons)
├── scripts/                      ← Dev & deployment scripts
├── docs/                         ← Documentation
├── vite.config.ts                ← Vite + dev mock API plugin
├── tailwind.config.ts
└── tsconfig.json
```

---

## OOP Design — Service Layer

```
ApiClient (src/services/http/ApiClient.ts)
│
│   ← Singleton instance: httpClient
│   ← Encapsulates: base URL, JWT auth header, fetch
│   ← Template method: request<T>() used by all services
│
├── AuthService        POST /api/auth/login|register  GET /api/auth/me
├── UserService        GET|PATCH /api/users/:id
├── SkillService       GET /api/skills
├── MatchService       GET /api/users/:id/matches|chains
├── SessionService     GET /api/users/:id/sessions  GET /api/sessions/:id
├── ReviewService      GET /api/users/:id/reviews
├── ExchangeService    CRUD /api/exchanges
└── CommunityService   GET /api/community/events|posts|discussions|…
```

Each service is a **plain object literal** with typed async methods — clean, testable, zero inheritance overhead on the call-site. The base `ApiClient` class handles all HTTP concerns (Single Responsibility Principle).

---

## Spring Boot Backend Contract (planned)

All REST endpoints live under `/api` (proxied by Vite dev plugin to `localhost:8080`).

| Method | Endpoint                          | Controller           |
|--------|-----------------------------------|----------------------|
| POST   | /api/auth/login                   | AuthController       |
| POST   | /api/auth/register                | AuthController       |
| GET    | /api/auth/me                      | AuthController       |
| GET    | /api/auth/google                  | OAuth2 redirect      |
| GET    | /api/users                        | UserController       |
| GET    | /api/users/:id                    | UserController       |
| PATCH  | /api/users/:id                    | UserController       |
| GET    | /api/users/:id/matches            | MatchController      |
| GET    | /api/users/:id/chains             | MatchController      |
| GET    | /api/users/:id/sessions           | SessionController    |
| GET    | /api/users/:id/reviews            | ReviewController     |
| GET    | /api/skills                       | SkillController      |
| CRUD   | /api/exchanges                    | ExchangeController   |
| GET    | /api/community/events             | CommunityController  |
| GET    | /api/community/posts              | CommunityController  |
| GET    | /api/community/discussions        | CommunityController  |
| GET    | /api/community/skill-circles      | CommunityController  |

---

## Running the App

```bash
# Install dependencies
npm install

# Start Vite dev server (mock API enabled)
npm run dev          # http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview
```

> The Vite dev server includes an in-memory mock API for `/api/auth/*` so the
> app works fully **without a running Spring Boot backend**.
> All other `/api/*` calls proxy to `http://localhost:8080`.

---

## Adding a New Feature

1. Create `src/features/<feature-name>/`
2. Add `pages/<FeatureName>Page.tsx` for the route component
3. Add `components/` for feature-local UI
4. Add `index.ts` barrel re-exporting the page + components
5. Register the route in `src/App.tsx`
6. Add nav link in `src/config/navigation.config.ts`
7. Add/extend service method in `src/services/<feature-name>Service.ts`

---

## OOP Principles Applied

| Principle              | Implementation                                               |
|------------------------|--------------------------------------------------------------|
| **Encapsulation**      | `ApiClient` hides HTTP, JWT, base URL details                |
| **Abstraction**        | Services expose clean typed methods, hide fetch internals    |
| **Single Responsibility** | Each service owns exactly one domain                      |
| **Open/Closed**        | Add services without modifying `ApiClient`                   |
| **DRY**               | `httpClient` singleton reused across all services            |
| **Separation of Concerns** | Features / Services / Components / Config are isolated   |
