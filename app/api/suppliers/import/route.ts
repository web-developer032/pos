import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const importSchema = z.object({
  suppliers: z.array(supplierSchema),
});

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = importSchema.parse(body);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < validated.suppliers.length; i++) {
      const supplier = validated.suppliers[i];
      try {
        await client.execute({
          sql: "INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)",
          args: [
            supplier.name,
            supplier.contact_person || null,
            supplier.email || null,
            supplier.phone || null,
            supplier.address || null,
          ],
        });
        imported++;
      } catch (error: any) {
        errors.push(`Row ${i + 1} (${supplier.name}): ${error.message || "Failed to import"}`);
      }
    }

    return NextResponse.json({
      message: `Imported ${imported} of ${validated.suppliers.length} suppliers`,
      imported,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error importing suppliers:", error);
    return NextResponse.json(
      { error: "Failed to import suppliers" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);

