# Database (Prisma + PostgreSQL)

## Overview

The app uses **Prisma** as the only data layer. Schema and migrations live in `prisma/`; the runtime client is a singleton from `lib/db.ts`.

## Architecture

### 1. **Server startup** (`instrumentation.ts`)

On Node.js server start, the instrumentation hook runs `ensureDatabaseInitialized()`, which creates the database if missing, runs migrations, then seeds (idempotent).

### 2. **Client** (`lib/db.ts`)

- Exports a **Prisma Client** singleton (Next.js `globalThis` pattern to avoid multiple instances in dev).
- Also exports helpers `sqlQuery` / `sqlExecute` for the few raw-SQL paths (e.g. reports); they rewrite `?` placeholders to `$1, $2, ...` for PostgreSQL.

All API routes and utils import `prisma` (and optionally `sqlQuery`/`sqlExecute`) from `@/lib/db`.

### 3. **Init** (`lib/db/init.ts`)

- `ensureDatabaseInitialized()` creates the database if missing (`ensureDatabaseExists`), runs migrations (`runMigrations`), then seeds (`runSeed`). Safe to call multiple times (thread-safe, promise-cached).

### 4. **Seed** (`lib/db/runSeed.ts`)

- Uses only Prisma Client (e.g. `prisma.user.upsert`, `prisma.setting.upsert`).
- Invoked from `prisma/seed.ts` when you run `pnpm run db:seed` or from init when the server starts.

### 5. **Schema and migrations**

- **Schema:** `prisma/schema.prisma` (single source of truth).
- **Migrations:** `prisma migrate dev` in development; `prisma migrate deploy` in production (e.g. in CI or Vercel build).

## Flow

```
Server Start
    ↓
instrumentation.ts (register)
    ↓
ensureDatabaseInitialized()
    ├── ensureDatabaseExists() (create DB if missing)
    ├── runMigrations() (prisma migrate deploy)
    └── runSeed()
    ↓
API routes use prisma / sqlQuery / sqlExecute
```

## Configuration

- **Env:** `DATABASE_URL` must be a PostgreSQL connection string.
- **Next.js:** No special config required; Prisma Client is used like any Node module.

## Manual seed / init

```bash
# Apply migrations (new DB or after schema changes)
pnpm run db:migrate          # dev
pnpm exec prisma migrate deploy   # production

# Seed
pnpm run init-db
# or
pnpm run db:seed
```

Or trigger init via the app: `GET /api/init` (calls the same seed logic).
