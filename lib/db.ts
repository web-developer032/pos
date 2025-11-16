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
const dbPath = process.env.DATABASE_URL || "file:./data/db/local.db";

// Ensure directory exists before creating client
ensureDbDirectory();

const client = createClient({
  url: dbPath,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export default client;

