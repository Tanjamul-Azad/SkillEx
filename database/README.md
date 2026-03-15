# SkiilEX — Database

> **Single source of truth**: `backend/src/main/resources/db/migration/`
>
> Flyway runs these migrations automatically when Spring Boot starts.
> No manual SQL needed.

## Migrations

| File | Description |
|------|-------------|
| `V1__initial_schema.sql` | Users, skills, exchanges, sessions, reviews |
| `V2__community_tables.sql` | Events, discussions, skill circles, posts |
| `V3__seed_skills.sql` | 25 seed skills |
| `V4__fix_column_types.sql` | Column type corrections |
| `V5__messages_table.sql` | Direct messages table |
| `V6__avatar_text.sql` | Avatar column ? TEXT |
| `V7__skill_relations.sql` | Skill junction tables |

## Connection

- **Database**: MySQL `localhost:3306/skillex`
- **Config**: `backend/src/main/resources/application.properties`

## Running the project

```powershell
# From project root — launches backend (port 8080) + frontend (port 3000)
.\start.ps1
```

Flyway applies pending migrations on startup. The frontend communicates with the database exclusively through the Spring Boot REST API (`/api/**`).
