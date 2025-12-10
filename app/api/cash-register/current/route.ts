import { NextResponse } from "next/server";
import client from "@/lib/db";

// GET /api/cash-register/current - Get current open session
export async function GET() {
  try {
    const result = await client.execute({
      sql: `
        SELECT 
          crs.*,
          u.username as user_name
        FROM cash_register_sessions crs
        LEFT JOIN users u ON crs.user_id = u.id
        WHERE crs.status = 'open'
        ORDER BY crs.opened_at DESC
        LIMIT 1
      `,
      args: [],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ session: null, isOpen: false });
    }

    return NextResponse.json({
      session: result.rows[0],
      isOpen: true,
    });
  } catch (error) {
    console.error("Error fetching current session:", error);
    return NextResponse.json(
      { error: "Failed to fetch current session" },
      { status: 500 }
    );
  }
}

