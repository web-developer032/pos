import { NextResponse } from "next/server";
import client from "@/lib/db";

export async function GET() {
  try {
    // Example: Initialize a table if it doesn't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS example (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Example: Query data
    const result = await client.execute("SELECT * FROM example LIMIT 10");

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { success: false, error: "Database operation failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Example: Insert data
    const result = await client.execute({
      sql: "INSERT INTO example (name) VALUES (?)",
      args: [name],
    });

    return NextResponse.json({
      success: true,
      data: { id: result.lastInsertRowid, name },
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { success: false, error: "Database operation failed" },
      { status: 500 }
    );
  }
}

