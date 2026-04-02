---
name: SkiilEX workspace instructions
description: "Project-specific guidance for AI agents on SkiilEX (React + Spring Boot). Includes build commands, architecture, style conventions, and ‘link, don’t embed’ references."
applyTo: "**"
---

# SkiilEX workspace instructions

## 1) Project overview
- Monorepo with backend and frontend in same workspace:
  - `backend/`: Spring Boot 3 + Java 21 + Gradle
  - `frontend/`: React 19 + TypeScript + Vite
- REST API in backend under `/api/**` and proxied from frontend `/api` in dev.
- Auth: JWT from frontend via `sessionStorage`; backend Spring Security.
- DB: MySQL + Flyway migrations.

## 2) Setup and run commands
- root: `npm run dev` (frontend + backend with proxy)
- frontend:
  - `npm install`
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
- backend:
  - `./gradlew build`
  - `./gradlew test`
  - `./gradlew bootRun`

## 3) Key architectural boundaries
- Frontend invokes `src/services/*` through `src/services/api.ts` (ApiClient)
- Backend route layer: `src/main/java/com/skillex/web/**` controllers
- Services layer: `.../service/**`, Repositories: `.../repository/**`
- Response envelope: `ApiResponse<T>` for all REST output.

## 4) Agent code conventions to follow
### Frontend
- Use existing services, don't create duplicate APIs.
- In `ApiClient`, for `FormData` requests, do NOT set `Content-Type` manually; let browser set multipart boundary.
- Use React contexts in `src/context/` for auth, toast, theme.
- Feature folders under `src/features/*` (auth, match, community, etc.).
- Keep component class/style naming consistent with Tailwind use in `*components*`.

### Backend
- Use Spring DI with `@RestController`, `@Service`, `@Repository`, `@RequiredArgsConstructor`.
- Requests and responses mostly use Jakarta Validation and `@Valid`.
- Use Java records for small DTOs as project style.
- Add unit tests under `backend/src/test/java` using JUnit.
- Prefer service layer for business logic, controllers only for request/response.

## 5) Documentation and references
- Do not duplicate docs; link to existing resources instead:
  - `README.md` (root), `backend/README.md`, `docs/architecture/README.md`
  - `frontend/package.json` scripts and config files
- If adding instructions or behavior semantics, cross-reference these docs.

## 6) Common pitfalls
- `httpClient` FormData content-type issue from old memory: skip `Content-Type`, avoid `JSON.stringify` for non-JSON body.
- Proxy `frontend/vite.config.ts` maps `/api`, `/uploads`, `/ws`; avoid hard-coded CORS bypass by adding to proxy config.

## 7) Working with agent-customization
- Keep this file minimal, with links to deeper docs.
- For code formatting or pre-commit, prefer adding `.github/hooks` or file-specific instruction with `applyTo` globs.

## 8) Example prompts for this repo
- "Refactor frontend `MatchService` to use new typed response interfaces while preserving existing API behavior."
- "Add backend endpoint `GET /api/dashboard/metrics` returning `ApiResponse<DashboardMetrics>` and tests."
- "Fix file upload API to store images in `uploads/images/` and keep current DB entity behavior."

## 9) Suggested next customization
- Add `.github/instructions/frontend.instructions.md` with React/TS rules and lint-to-fix style.
- Add `.github/instructions/backend.instructions.md` for Spring Boot patterns + middlewares.
- Add `.github/agents/modernize-java.agent.md` for upgrade tasks (Java 21/Spring Boot 3.2, layer migration).
