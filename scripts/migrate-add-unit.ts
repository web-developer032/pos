import client from "../lib/db";

async function migrate() {
  try {
    console.log("Checking if 'unit' column exists in products table...");

    // Check if column exists
    const tableInfo = await client.execute(`PRAGMA table_info(products)`);
    const hasUnitColumn = tableInfo.rows.some((row) => {
      const name = row.name as string | undefined;
      return name === "unit";
    });

    if (hasUnitColumn) {
      console.log("✓ 'unit' column already exists. No migration needed.");
      process.exit(0);
    }

    console.log("Adding 'unit' column to products table...");
    await client.execute(`
      ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece' CHECK(unit IN ('piece', 'gram', 'kilogram', 'liter', 'milliliter', 'meter', 'centimeter', 'box', 'pack', 'bottle', 'can', 'bag'))
    `);

    // Update existing products to have 'piece' as default unit
    await client.execute(`
      UPDATE products SET unit = 'piece' WHERE unit IS NULL OR unit = ''
    `);

    console.log("✓ Migration completed successfully!");
    console.log("All existing products have been set to 'piece' unit.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
