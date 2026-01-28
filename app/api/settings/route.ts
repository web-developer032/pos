import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";

async function getHandler(_req: NextRequest) {
  try {
    const rows = await prisma.setting.findMany();
    const settings: { [key: string]: string } = {};
    rows.forEach((row) => {
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
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
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
