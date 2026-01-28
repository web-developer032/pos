/**
 * Runs Prisma migrations (prisma migrate deploy).
 * Ensures tables exist before seed runs.
 */
import { execSync } from "child_process";

export async function runMigrations(): Promise<void> {
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
  } catch {
    throw new Error(
      "Prisma migrate deploy failed. Run 'pnpm run db:migrate' manually."
    );
  }
}
