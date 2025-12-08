import client from "../db";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  // Quick check: if admin exists, database is already seeded - skip everything
  const existingAdmin = await client.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: ["admin"],
  });

  if (existingAdmin.rows.length > 0) {
    // Database already seeded, nothing to do
    return;
  }

  console.log("[DB] Seeding database with default data...");

  // Create default admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  await client.execute({
    sql: "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
    args: ["admin", "admin@pos.com", passwordHash, "admin"],
  });

  // Seed default categories (including "Other" as default)
  const categories = [
    { name: "Other", description: "Default category for uncategorized items" },
    { name: "Electronics", description: "Electronic items" },
    { name: "Food & Beverages", description: "Food and drink items" },
    { name: "Clothing", description: "Clothing and apparel" },
    { name: "Home & Kitchen", description: "Home and kitchen items" },
    { name: "Health & Beauty", description: "Health and beauty products" },
  ];

  for (const category of categories) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)",
      args: [category.name, category.description],
    });
  }

  // Seed default supplier "Other"
  await client.execute({
    sql: "INSERT OR IGNORE INTO suppliers (name, contact_person, email) VALUES (?, ?, ?)",
    args: ["Other", "Default Supplier", "other@pos.com"],
  });

  // Seed default settings
  const settings = [
    { key: "store_name", value: "Super Store" },
    { key: "tax_rate", value: "10" },
    { key: "currency", value: "USD" },
    { key: "currency_symbol", value: "$" },
  ];

  for (const setting of settings) {
    await client.execute({
      sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
      args: [setting.key, setting.value],
    });
  }

  console.log("[DB] Seeding complete");
}
