import client from "../db";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  // Check if admin user already exists
  const existingAdmin = await client.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: ["admin"],
  });

  if (existingAdmin.rows.length === 0) {
    // Create default admin user
    const passwordHash = await bcrypt.hash("admin123", 10);
    await client.execute({
      sql: "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      args: ["admin", "admin@pos.com", passwordHash, "admin"],
    });
  }

  // Seed default categories
  const categories = [
    { name: "Electronics", description: "Electronic items" },
    { name: "Food & Beverages", description: "Food and drink items" },
    { name: "Clothing", description: "Clothing and apparel" },
    { name: "Home & Kitchen", description: "Home and kitchen items" },
    { name: "Health & Beauty", description: "Health and beauty products" },
  ];

  for (const category of categories) {
    const existing = await client.execute({
      sql: "SELECT id FROM categories WHERE name = ?",
      args: [category.name],
    });

    if (existing.rows.length === 0) {
      await client.execute({
        sql: "INSERT INTO categories (name, description) VALUES (?, ?)",
        args: [category.name, category.description],
      });
    }
  }

  // Seed default settings
  const settings = [
    { key: "store_name", value: "Super Store" },
    { key: "tax_rate", value: "10" },
    { key: "currency", value: "USD" },
    { key: "currency_symbol", value: "$" },
  ];

  for (const setting of settings) {
    await client.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      args: [setting.key, setting.value],
    });
  }
}
