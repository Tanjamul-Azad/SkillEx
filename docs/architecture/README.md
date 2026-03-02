# SkillEx — Project Architecture

## Overview

SkillEx is a **Next.js 15 (App Router)** full-stack application that allows
students to exchange skills instead of money. The project follows a layered
architecture separating frontend, backend, data, and configuration concerns.

---

## Folder Structure

```
skillex/
├── frontend/                    # Frontend source (components, hooks, context, lib, types)
│   ├── components/
│   │   ├── auth/                # Auth-specific components
│   │   ├── features/            # Feature-scoped components
│   │   │   ├── dashboard/
│   │   │   ├── match/
│   │   │   ├── profile/
│   │   │   └── community/
│   │   ├── layout/              # Page layout shells
│   │   ├── icons/               # Custom SVG/icon wrappers
│   │   └── ui/                  # shadcn/ui primitives + custom UI
│   ├── context/                 # React contexts (Auth, Theme, Toast)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   ├── utils.ts             # cn() and generic helpers
│   │   ├── constants/           # App-wide constants & enums
│   │   ├── helpers/             # Pure formatting / utility functions
│   │   └── validations/         # Zod form schemas (frontend)
│   └── types/                   # Global TypeScript types
│
├── src/                         # Next.js App Router (routing only)
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       ├── not-found.tsx
│       ├── (marketing)/         ← Public landing page  (/)
│       ├── (auth)/login/        ← Login/register       (/login)
│       ├── (dashboard)/         ← Protected pages      (/dashboard /match /community /profile/[id])
│       └── api/                 ← REST Route Handlers
│           ├── ai/generate-bio
│           ├── ai/enhance-skill
│           ├── ai/match-recommendations
│           ├── auth/
│           └── users/
│
├── backend/                     ← Server-side logic
│   ├── ai/                      ← Genkit flows
│   ├── services/                ← Business logic
│   ├── repositories/            ← Data-access layer
│   └── middleware/              ← Request guards
│
├── data/                        ← Data layer
│   ├── mock/mockData.ts
│   ├── schemas/
│   └── seeds/
│
├── config/                      ← App configuration
│   ├── site.config.ts
│   ├── navigation.config.ts
│   └── env.config.ts
│
├── scripts/dev/setup.ts
├── public/
└── docs/
```

---

## Path Aliases

| Alias         | Resolves to   | Purpose                            |
|---------------|---------------|------------------------------------|
| `@/*`         | `frontend/*`  | All frontend source files          |
| `@backend/*`  | `backend/*`   | Backend services / AI / repos      |
| `@data/*`     | `data/*`      | Mock data, schemas, seeds          |
| `@config/*`   | `config/*`    | Site & env configuration           |
| `@scripts/*`  | `scripts/*`   | Developer scripts                  |

---

## Data Flow

```
Browser → Next.js Route Handler (src/app/api/*)
             ↓
         Middleware (backend/middleware/)
             ↓
         Service   (backend/services/)
             ↓
         Repository (backend/repositories/)
             ↓
         Database / Mock Data (data/)
```

AI requests also flow through the Route Handler → AI flow (backend/ai/flows/).

---

## Technology Stack

| Layer         | Technology                          |
|---------------|--------------------------------------|
| Framework     | Next.js 15 (App Router, Turbopack)   |
| UI            | React 19 + Tailwind CSS + shadcn/ui  |
| Animation     | Framer Motion                        |
| AI            | Google Genkit + Gemini 2.5 Flash     |
| Forms         | React Hook Form + Zod                |
| Charts        | Recharts                             |
| State/Auth    | React Context (→ planned: NextAuth)  |
| DB            | Planned: PostgreSQL + Prisma/Drizzle |

---

## Adding a New Feature

1. **Types** — define your domain types in `src/types/index.ts`
2. **Schema** — add a Zod schema in `data/schemas/`
3. **Mock data** — add sample data in `data/mock/mockData.ts`
4. **Repository** — add data-access methods in `backend/repositories/`
5. **Service** — add business logic in `backend/services/`
6. **API route** — add a `route.ts` under `src/app/api/`
7. **Page** — add a `page.tsx` in the appropriate route group under `src/app/`
8. **Components** — add feature components in `frontend/components/features/<name>/`
