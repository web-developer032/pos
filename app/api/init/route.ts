import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db/schema";
import { seedDatabase } from "@/lib/db/seed";

export async function GET() {
  try {
    await initializeDatabase();
    await seedDatabase();
    return NextResponse.json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Error initializing database:", error);
    return NextResponse.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}

