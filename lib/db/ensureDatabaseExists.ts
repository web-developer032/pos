/**
 * Creates the database from DATABASE_URL if it doesn't exist.
 * Connects to the default "postgres" database to run CREATE DATABASE.
 */
import { Client } from "pg";

function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1) || "postgres",
  };
}

export async function ensureDatabaseExists(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || typeof url !== "string") {
    throw new Error("DATABASE_URL is not set");
  }

  const { host, port, user, password, database } = parseDatabaseUrl(url);

  if (database === "postgres" || database === "template1") {
    return;
  }

  const client = new Client({
    host,
    port,
    user,
    password: password || undefined,
    database: "postgres",
  });

  try {
    await client.connect();

    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database]
    );

    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
      console.log(`[DB] Created database "${database}"`);
    }
  } finally {
    await client.end();
  }
}
