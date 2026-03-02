# database/

Single source of truth for all database artefacts.
**Database: MySQL 8.0+** — managed by Spring Boot + Flyway.

## Structure

```
database/
├── migrations/         SQL migration files — Flyway naming convention (V1__*, V2__*, …)
│   └── V1__initial_schema.sql
├── schemas/            TypeScript Zod schemas (used for frontend form validation)
│   └── user.schema.ts
├── seeds/              Dev seed scripts (run manually or via npm run db:seed)
│   └── seed.ts
└── mock/               In-memory mock data used by the frontend until Spring Boot is live
    └── mockData.ts
```

## Running Migrations

Spring Boot runs Flyway automatically on startup when configured:

```properties
# src/main/resources/application.properties (Spring Boot side)
spring.datasource.url=jdbc:mysql://localhost:3306/skillex?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_password
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
```

Copy `V1__initial_schema.sql` into your Spring Boot project at:
```
backend/src/main/resources/db/migration/V1__initial_schema.sql
```

## Manual Setup (Quick Start)

```bash
mysql -u root -p
CREATE DATABASE skillex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillex;
source database/migrations/V1__initial_schema.sql
```

## Mock Data

`database/mock/mockData.ts` is used by the React frontend via `@data/mock/mockData`.
It is **dev-only** — once Spring Boot is connected, all data flows from `/api/*`.


## Structure

```
database/
├── migrations/     SQL files — run in filename order against PostgreSQL
│   ├── 001_initial_schema.sql
│   └── 20250201000000_initial_schema.sql
├── schemas/        TypeScript entity schema definitions (for validation)
│   └── user.schema.ts
├── seeds/          Dev seed scripts to populate test data
│   └── seed.ts
└── mock/           In-memory mock data used by the frontend until Spring Boot is live
    └── mockData.ts
```

## Running Migrations

Against Supabase (dev):
```bash
supabase db push
```

Against a local PostgreSQL (Spring Boot dev):
```bash
psql -U postgres -d skillex_db -f database/migrations/001_initial_schema.sql
```

## Mock Data

`database/mock/mockData.ts` is imported with `@data/mock/mockData` alias.
It is **only** used during development. Once the Spring Boot API is live,
all components should fetch from `/api/*` via the service layer.
