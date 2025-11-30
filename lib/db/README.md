# Database Initialization Architecture

## Overview

The database initialization system is designed to run **once** when the server starts, not on every request. This ensures optimal performance and prevents unnecessary overhead.

## Architecture

### 1. **Server Startup Initialization** (`instrumentation.ts`)

Uses Next.js's instrumentation hook to initialize the database when the server starts:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await ensureDatabaseInitialized();
  }
}
```

**Benefits:**

- Runs once per server instance
- Executes before any API routes are called
- No performance impact on requests

### 2. **Database Client** (`lib/db.ts`)

Simple, focused module that only creates and exports the database client:

```typescript
// lib/db.ts
const client = createClient({ url: dbPath, authToken: authToken });
export default client;
```

**No initialization logic** - keeps the module clean and focused.

### 3. **Initialization Logic** (`lib/db/init.ts`)

Handles database schema creation and migrations:

```typescript
// lib/db/init.ts
export async function ensureDatabaseInitialized(): Promise<void> {
  // Thread-safe: only runs once, even if called multiple times
  // Uses promise caching to prevent concurrent initializations
}
```

**Features:**

- Thread-safe singleton pattern
- Promise caching prevents concurrent initializations
- Idempotent - safe to call multiple times

### 4. **Schema & Migrations** (`lib/db/schema.ts`)

Contains:

- Table creation (CREATE TABLE IF NOT EXISTS)
- Automatic migrations (ALTER TABLE for new columns)
- Index creation

**Migration Pattern:**

```typescript
// Check if column exists
const tableInfo = await client.execute(`PRAGMA table_info(products)`);
if (!hasColumn) {
  await client.execute(`ALTER TABLE products ADD COLUMN ...`);
}
```

## Flow

```
Server Start
    ↓
instrumentation.ts (register)
    ↓
ensureDatabaseInitialized()
    ↓
initializeDatabase() → Creates tables + runs migrations
    ↓
seedDatabase() → Seeds initial data
    ↓
Server Ready
    ↓
API Routes (no initialization overhead)
```

## API Routes

**No initialization code needed** - database is already initialized:

```typescript
// app/api/products/route.ts
export async function GET(req: NextRequest) {
  // Database is already initialized - just use it!
  const result = await client.execute("SELECT ...");
}
```

## Configuration

Enable instrumentation hook in `next.config.js`:

```javascript
experimental: {
  instrumentationHook: true,
}
```

## Benefits

✅ **Performance**: Initialization runs once, not per request  
✅ **Clean Code**: API routes focus on business logic  
✅ **Reliability**: Thread-safe initialization prevents race conditions  
✅ **Maintainability**: Clear separation of concerns  
✅ **Scalability**: Works with serverless and traditional deployments

## Manual Initialization

For manual initialization (e.g., Docker, scripts):

```bash
# Run initialization script
pnpm tsx scripts/init-db.ts

# Or use API endpoint
curl http://localhost:3000/api/init
```
