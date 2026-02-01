import { NextResponse } from "next/server";
import { requireAuth, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId, whereUserId } from "@/lib/auth/requestContext";
import { prisma } from "@/lib/db";

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const rows = await prisma.setting.findMany({
      where: whereUserId(userId),
    });
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

async function putHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const body = await req.json();
    const settings = body.settings as { [key: string]: string };

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value },
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

export const GET = requireAuth(getHandler, {
  requiredFeature: "settings",
  allowedRoles: ["admin", "manager"],
});
export const PUT = requireAuth(putHandler, {
  requiredFeature: "settings",
  allowedRoles: ["admin", "manager"],
});
