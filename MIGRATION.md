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

## 2. Volume Mount for PostgreSQL (like local.db)

With LibSQL, you mounted a single file: `local.db`. PostgreSQL stores data in a **directory**, not a single file. You have two options:

### Option A: Named Docker Volume (default)

The current `docker-compose.yml` uses a named volume:

```yaml
volumes:
  pos-db-data:
    driver: local
    name: pos-database
```

Data persists in Docker's volume storage. To back up or move it, see [DOCKER_VOLUME_TRANSFER.md](./DOCKER_VOLUME_TRANSFER.md).

### Option B: Bind Mount (folder on your host)

To store PostgreSQL data in a folder on your machine (like having `local.db` in a known location):

1. Create a `docker-compose.override.yml` in the project root:

```yaml
services:
  postgres:
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
```

2. Create the folder and set permissions (PostgreSQL runs as user 999 in the container):

   **Linux/macOS:**

   ```bash
   mkdir -p postgres-data
   chown 999:999 postgres-data
   ```

   **Windows (Docker Desktop):** Create `postgres-data` in the project root; Docker Desktop handles permissions.

3. Start with the override:

   ```bash
   docker compose up -d
   ```

4. Your PostgreSQL data will now live in `./postgres-data/` on your host. You can:
   - Back it up by copying the folder
   - Move it to another machine
   - Inspect files (though the format is PostgreSQL-specific, not a single `.db` file)

### Important notes for bind mount

- **First run:** If `postgres-data` is empty, PostgreSQL will initialize it. If you already have data from a named volume, you'd need to copy it into `postgres-data` first.
- **One or the other:** Use either the named volume OR the bind mount, not both. The override replaces the volume for the postgres service.
- **Backup:** For bind mount, backup = `cp -r postgres-data postgres-data-backup`. For named volume, use the commands in DOCKER_VOLUME_TRANSFER.md.

---

## Summary

| Task                             | Command / Action                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------- |
| Migrate local.db → PostgreSQL    | `pnpm run migrate:libsql`                                                         |
| Use bind mount for PG data       | Add `docker-compose.override.yml` with `./postgres-data:/var/lib/postgresql/data` |
| Backup PostgreSQL (bind mount)   | Copy `./postgres-data` folder                                                     |
| Backup PostgreSQL (named volume) | See DOCKER_VOLUME_TRANSFER.md                                                     |
