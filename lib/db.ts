import { createClient } from "@libsql/client";

// Initialize libSQL client
// For local development, you can use a local file database
// For production, use a remote database URL
const client = createClient({
  url: process.env.DATABASE_URL || "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export default client;

