/**
 * Legacy one-off migration: ensure products.unit exists.
 * With Prisma + PostgreSQL, schema is managed by prisma/migrations.
 * This script is kept for reference; run prisma migrate deploy for schema changes.
 */
import { prisma, sqlQuery } from "../lib/db";

async function migrate() {
  try {
    console.log("Checking if 'unit' column exists in products table...");

    const rows = await sqlQuery<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'unit'`
    );
    const hasUnitColumn = rows.length > 0;

    if (hasUnitColumn) {
      console.log("✓ 'unit' column already exists. No migration needed.");
      process.exit(0);
    }

    console.log("Adding 'unit' column to products table...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece', 'gram', 'kilogram', 'liter', 'milliliter'))
    `);

    console.log("✓ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
