# Migrating from LibSQL (local.db) to PostgreSQL

This guide explains how to migrate your data from the old LibSQL `local.db` file to PostgreSQL, and how to use volume mounts for PostgreSQL data (similar to how you mounted `local.db` with LibSQL).

---

## 1. Migrate Data from local.db to PostgreSQL

### Prerequisites

- Your `local.db` file from the LibSQL setup
- PostgreSQL running (locally or in Docker)
- `DATABASE_URL` set in `.env` or `.env.local`

### Steps

1. **Place your `local.db` file** in the project root, or set the path:

   ```bash
   export LIBSQL_DB_PATH=/path/to/your/local.db
   ```

2. **Ensure PostgreSQL is running** and has the `pos` database (the app creates it automatically on first start, or run `pnpm run init-db` after migrations).

3. **Run the migration script:**

   ```bash
   pnpm run migrate:libsql
   ```

4. The script will:
   - Truncate existing PostgreSQL tables (in correct order)
   - Copy all data from `local.db` into PostgreSQL
   - Preserve IDs for foreign key relationships
   - Reset sequences for new inserts

### What the script does

- Reads from SQLite (`local.db` – LibSQL uses SQLite format)
- Writes to PostgreSQL via `DATABASE_URL`
- Migrates tables in dependency order: users, categories, suppliers, products, etc.
- Skips tables that don't exist in either database

### Troubleshooting

- **"local.db not found"** – Place the file in the project root or set `LIBSQL_DB_PATH`
- **"DATABASE_URL is not set"** – Add it to `.env` or `.env.local`
- **Type errors** – If your LibSQL schema differs from the current Prisma schema, you may need to adjust the script or run a manual export/import

---

## 2. Docker and PostgreSQL data

The single `docker-compose.yml` uses a **bind mount** so the database lives in `./postgres-data` on your host:

- Data persists across container restarts.
- You can back up by copying the folder or creating a tarball.
- You can move or reuse the data on another machine or project.

**First run:** Create the folder (Docker will create it if missing; on Linux/macOS you may need `chown 999:999 postgres-data`). Then:

```bash
docker compose up -d
```

**Backup:** `cp -r postgres-data postgres-data-backup` or `tar czf db-backup.tar.gz postgres-data`.

---

## Summary

| Task                          | Command / Action              |
| ----------------------------- | ----------------------------- |
| Migrate local.db → PostgreSQL | `pnpm run migrate:libsql`     |
| Run app with Docker           | `docker compose up -d`        |
| Backup PostgreSQL             | Copy `./postgres-data` folder |
