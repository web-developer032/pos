import { ensureDatabaseExists } from "./ensureDatabaseExists";
import { runMigrations } from "./runMigrations";
import { runSeed } from "./runSeed";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Ensures database exists, migrations are applied, and seed is run.
 * Safe to call multiple times.
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await ensureDatabaseExists();
      await runMigrations();
      await runSeed();
      initialized = true;
      console.log("[DB] Database initialization (seed) completed");
    } catch (error) {
      console.error("[DB] Error initializing database:", error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}
