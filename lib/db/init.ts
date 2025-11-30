import { initializeDatabase } from "./schema";
import { seedDatabase } from "./seed";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Ensures database is initialized (runs migrations and seeds)
 * This function is safe to call multiple times - it will only run once
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  // If already initialized, return immediately
  if (initialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      await initializeDatabase();
      await seedDatabase();
      initialized = true;
      console.log("[DB] Database initialization completed");
    } catch (error) {
      console.error("[DB] Error initializing database:", error);
      initializationPromise = null; // Reset so we can retry
      throw error;
    }
  })();

  return initializationPromise;
}
