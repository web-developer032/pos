import { initializeDatabase } from "./schema";
import { seedDatabase } from "./seed";

let initialized = false;

export async function ensureDatabaseInitialized() {
  if (initialized) return;
  
  try {
    await initializeDatabase();
    await seedDatabase();
    initialized = true;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

