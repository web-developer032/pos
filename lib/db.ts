import { createClient } from "@libsql/client";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

// Ensure data/db directory exists
function ensureDbDirectory() {
  if (typeof window === "undefined") {
    // Only run on server side
    const dbDir = join(process.cwd(), "data", "db");
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
  }
}

// Initialize libSQL client
// For production/Vercel: use TURSO_DATABASE_URL and TURSO_AUTH_TOKEN
// For local development: database is stored in data/db folder
const getDbPath = () => {
  // Check for Turso database URL (production/Vercel)
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  // Fallback to DATABASE_URL for backward compatibility
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Use absolute path to ensure consistency for local development
  const dbDir = join(process.cwd(), "data", "db");
  const dbFile = join(dbDir, "local.db");

  // Log the path for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[DB] Database path (absolute):", dbFile);
    console.log("[DB] Database exists:", existsSync(dbFile));
  }

  // For libSQL on Windows, use file:/// with three slashes for absolute paths
  // Convert Windows backslashes to forward slashes
  const normalizedPath = dbFile.replace(/\\/g, "/");
  // Use file:/// format (three slashes) for absolute paths on Windows
  const fileUrl = `file:///${normalizedPath}`;

  if (process.env.NODE_ENV === "development") {
    console.log("[DB] Database URL:", fileUrl);
  }

  return fileUrl;
};

// Get auth token (Turso token for production, optional for local)
const getAuthToken = () => {
  return process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;
};

// Ensure directory exists before creating client (only for local file database)
if (!process.env.TURSO_DATABASE_URL && !process.env.DATABASE_URL) {
  ensureDbDirectory();
}

const dbPath = getDbPath();
const authToken = getAuthToken();

const client = createClient({
  url: dbPath,
  authToken: authToken,
});

export default client;
