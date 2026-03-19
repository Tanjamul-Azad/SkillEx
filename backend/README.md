# Spring Boot Backend – SkillEX

REST API backend for the SkillEX peer skill-exchange platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.4 + Java 21 |
| Database | MySQL 8.0 (Flyway migrations) |
| Security | Spring Security 6 + JWT (jjwt 0.12) |
| ORM | Spring Data JPA (Hibernate) |
| Build | Maven 3.9+ |

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/skillex/
│   │   │   ├── SkillExApplication.java      ← entry point
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java      ← JWT filter chain
│   │   │   │   └── CorsConfig.java          ← allow frontend origin
│   │   │   ├── controller/                  ← REST endpoints (@RestController)
│   │   │   │   ├── AuthController.java      ← POST /api/auth/login|register
│   │   │   │   ├── UserController.java      ← GET/PUT /api/users
│   │   │   │   ├── SkillController.java     ← GET /api/skills
│   │   │   │   └── ExchangeController.java  ← CRUD /api/exchanges
│   │   │   ├── service/                     ← business logic interfaces
│   │   │   │   └── impl/                    ← concrete implementations
│   │   │   ├── repository/                  ← Spring Data JPA repos
│   │   │   ├── model/                       ← JPA @Entity classes
│   │   │   └── dto/                         ← request/response DTOs
│   │   │       ├── auth/
│   │   │       └── common/
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/                ← Flyway SQL files
│   │           └── V1__initial_schema.sql
│   └── test/
└── pom.xml
```

## How Frontend ↔ Backend Connect

```
[React + Vite : 3000]  ──→  Vite proxy /api  ──→  [Spring Boot : 8080]
```

- All API calls from the frontend use the path prefix `/api/*`
- Vite dev server proxies these to `http://localhost:8080` (see `frontend/vite.config.ts`)
- Spring Boot controllers are mapped at `/api/**`
- Communication is **JSON over HTTP REST**
- Auth uses **JWT Bearer tokens** — frontend stores token in `localStorage`, sends as `Authorization: Bearer <token>` header

## AOOP Layers

```
Controller  →  Service (interface)  →  ServiceImpl  →  Repository  →  MySQL
    ↑               ↑                      ↑
  DTO in          business              JPA entity
  DTO out          logic                  (model/)
```

- **Controller**: thin — parse request, call service, return `ApiResponse<T>`
- **Service interface**: defines contract (abstraction)
- **ServiceImpl**: actual logic (encapsulation)
- **Repository**: `extends JpaRepository<Entity, String>` — Spring generates SQL
- **Model**: `@Entity` JPA classes mapping to MySQL tables

## Running

```bash
# 1. Start MySQL and create database
mysql -u root -p -e "CREATE DATABASE skillex;"

# 2. Copy & configure environment
cp .env.example .env
# Set spring.datasource.url / username / password in application.properties

# 3. Run
mvn spring-boot:run
```

The app starts on `http://localhost:8080`. Flyway will automatically run
`V1__initial_schema.sql` on first start.

## Key Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login → JWT |
| GET | /api/auth/me | Get current user |
| GET | /api/users/{id} | Get user profile |
| PUT | /api/users/{id} | Update profile |
| GET | /api/skills | List all skills |
| GET | /api/matches | Get skill matches |
| POST | /api/exchanges | Request exchange |
| GET | /api/exchanges | List exchanges |

## Matching + Embeddings (What Powers Semantic Match)

SkillEX uses a hybrid matcher (catalog skill graph + free-text intent similarity).

### Embedding Generation

- Interface: `TextEmbeddingProvider`
- Active provider: `AdaptiveTextEmbeddingProvider` (runtime switch)
- Modes:
  - `app.embedding.provider=local`
    - Uses `HashingTextEmbeddingProvider`
    - Deterministic 128-d local vector built from normalized tokens + domain synonym expansion
    - Fully offline (no external API call)
  - `app.embedding.provider=api`
    - Uses `GeminiApiTextEmbeddingProvider` (Gemini embedding endpoint)
    - If API fails and `app.embedding.fallback-to-local=true`, it safely falls back to local vectors

### Embedding Cache

- Layer 1: in-memory LRU cache (`app.matching.intent.embedding-cache-max-entries`)
- Layer 2 (optional): Redis cache with TTL (survives backend restart)
  - Enable: `app.matching.intent.redis-enabled=true`
  - TTL: `app.matching.intent.redis-ttl-hours` (default 24h)
  - Key prefix: `app.matching.intent.redis-key-prefix`

If Redis is disabled, a restart causes cold cache warm-up for first requests.
