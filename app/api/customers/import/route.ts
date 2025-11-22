import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyalty_points: z.number().int().min(0).optional(),
});

const importSchema = z.object({
  customers: z.array(customerSchema),
});

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = importSchema.parse(body);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < validated.customers.length; i++) {
      const customer = validated.customers[i];
      try {
        await client.execute({
          sql: "INSERT INTO customers (name, email, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?)",
          args: [
            customer.name,
            customer.email || null,
            customer.phone || null,
            customer.address || null,
            customer.loyalty_points || 0,
          ],
        });
        imported++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to import";
        errors.push(`Row ${i + 1} (${customer.name}): ${errorMessage}`);
      }
    }

    return NextResponse.json({
      message: `Imported ${imported} of ${validated.customers.length} customers`,
      imported,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error importing customers:", error);
    return NextResponse.json(
      { error: "Failed to import customers" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);
