# SkillEX — Peer Skill Exchange Platform

Monorepo containing the React frontend, Spring Boot backend, and shared database resources.

## Monorepo Structure

```
SkiilEX/
├── frontend/              ← React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── features/      ← feature-first vertical slices
│   │   ├── services/      ← HTTP client (ApiClient singleton)
│   │   ├── components/    ← shared UI components
│   │   └── types/         ← TypeScript DTOs
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/               ← Spring Boot 3 + Java 21
│   ├── src/main/java/com/skillex/
│   │   ├── controller/    ← REST endpoints (@RestController)
│   │   ├── service/       ← business logic (interface + impl)
│   │   ├── repository/    ← Spring Data JPA repos
│   │   ├── model/         ← JPA @Entity classes
│   │   ├── dto/           ← request/response records
│   │   └── config/        ← Security, JWT, CORS, error handler
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/  ← Flyway SQL (V1__, V2__, ...)
│   └── pom.xml
│
├── database/              ← shared DB resources
│   ├── migrations/        ← source-of-truth SQL (copy to backend)
│   ├── schemas/           ← Zod validation schemas (frontend)
│   ├── mock/              ← mock data for frontend dev
│   └── seeds/             ← seed scripts
│
├── docs/                  ← architecture, API, setup guides
└── scripts/               ← dev/deploy/db automation scripts
```

---

## How Frontend ↔ Backend Connect (AOOP)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vite : 3000)                 │
│                                                                     │
│  Page Component                                                     │
│       │  calls                                                      │
│  Feature Service   (e.g. authService.login())                       │
│       │  uses                                                       │
│  ApiClient (OOP Singleton) ──→  fetch('/api/auth/login')            │
│                                        │                            │
└────────────────────────────────────────│────────────────────────────┘
                                         │  HTTP JSON  (proxied by Vite)
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Spring Boot : 8080)                 │
│                                                                     │
│  JwtAuthFilter  →  @RestController                                  │
│                         │  calls                                    │
│                    Service (interface)                              │
│                         │  impl                                     │
│                    ServiceImpl  →  Repository  →  MySQL 8.0         │
│                                                                     │
│  Response: ApiResponse<T> { success, data, message }               │
└─────────────────────────────────────────────────────────────────────┘
```

### Why REST/HTTP?

| Concern | Choice | Reason |
|---------|--------|--------|
| Transport | HTTP/1.1 REST | Simple, stateless, works across any client |
| Auth | JWT Bearer token | Stateless, scalable, no sessions needed |
| Format | JSON | Shared between TypeScript DTOs and Java records |
| Dev proxy | Vite `/api` → `:8080` | No CORS errors in development |
| Prod | Nginx reverse proxy | Routes `/api` to Spring Boot, `/` to React build |

### AOOP Layers

**Frontend (OOP):**
```
View (React Component)
  └── calls Service method
        └── ApiClient.request<T>()    ← Singleton + Template Method
              └── fetch() with JWT header
```

**Backend (OOP):**
```
Controller (thin, routing only)
  └── Service interface (abstraction)
        └── ServiceImpl (encapsulation, business logic)
              └── Repository (Spring Data JPA)
                    └── MySQL (Flyway-managed schema)
```

---

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev          # starts at http://localhost:3000
```

### Backend
```bash
# Prerequisites: Java 21, Maven 3.9, MySQL 8.0

mysql -u root -p -e "CREATE DATABASE skillex;"

cd backend
# Edit src/main/resources/application.properties with your DB credentials
mvn spring-boot:run   # starts at http://localhost:8080
```

Flyway automatically applies `V1__initial_schema.sql` on first run.

> **Frontend only?** The Vite mock API handles `/api/auth/*` without needing the backend running.

---

## Environment Files

| File | Purpose |
|------|---------|
| `frontend/.env.local` | Vite dev vars (`VITE_API_URL`, `VITE_APP_URL`) |
| `backend/src/main/resources/application.properties` | Spring Boot datasource, JWT secret |
