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
// For local development, database is stored in data/db folder
// For production, use a remote database URL
const getDbPath = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Use absolute path to ensure consistency
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

// Ensure directory exists before creating client
ensureDbDirectory();

const dbPath = getDbPath();
const client = createClient({
  url: dbPath,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export default client;
