import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(_req: NextRequest) {
  try {
    const result = await client.execute("SELECT * FROM settings");
    const settings: { [key: string]: string } = {};
    result.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

async function putHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = body.settings as { [key: string]: string };

    for (const [key, value] of Object.entries(settings)) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        args: [key, value],
      });
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler, ["admin", "manager"]);

