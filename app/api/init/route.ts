import { NextResponse } from "next/server";
import { runSeed } from "@/lib/db/runSeed";

export async function GET() {
  try {
    await runSeed();
    return NextResponse.json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Error initializing database:", error);
    return NextResponse.json(
      { error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}
