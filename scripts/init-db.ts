/**
 * Run migrations and seed. Use when setting up a new database.
 * Requires DATABASE_URL (PostgreSQL).
 *
 * Migrations: pnpm exec prisma migrate deploy
 * Seed: uses runSeed from lib/db/runSeed
 */
import { runSeed } from "../lib/db/runSeed";

async function init() {
  try {
    console.log("Seeding database...");
    await runSeed();
    console.log("\nDefault admin credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("\nRun 'pnpm db:migrate' first to apply migrations to a new database.");
    console.log("Database seed complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

init();
