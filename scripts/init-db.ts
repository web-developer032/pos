import { initializeDatabase } from "../lib/db/schema";
import { seedDatabase } from "../lib/db/seed";

async function init() {
  try {
    console.log("Initializing database...");
    await initializeDatabase();
    console.log("Database schema created successfully!");

    console.log("Seeding database...");
    await seedDatabase();
    console.log("Database seeded successfully!");

    console.log("\nDefault admin credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("\nDatabase initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

init();
