import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

/**
 * Generate a unique barcode
 * Uses internal barcode format starting with "2" (commonly used for in-store products)
 * Format: 2XXXXXXXXXXX (12 digits total, EAN-13 compatible without check digit)
 */
function generateRandomBarcode(): string {
  // Start with "2" for internal/in-store use (per GS1 standards)
  // Then add timestamp-based portion for uniqueness
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0"); // 3 random digits
  
  return `2${timestamp}${random}`;
}

async function getHandler(_req: NextRequest) {
  try {
    const maxAttempts = 20;
    let attempts = 0;
    let barcode: string = "";
    let isUnique = false;

    // Generate barcode and check for uniqueness
    while (attempts < maxAttempts && !isUnique) {
      barcode = generateRandomBarcode();

      const existing = await sqlQuery(
        `SELECT id FROM products WHERE barcode = ? AND deleted_at IS NULL
              UNION
              SELECT product_id as id FROM product_barcodes WHERE barcode = ?`,
        [barcode, barcode]
      );

      if (existing.length === 0) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    // If still not unique after max attempts, add more randomness
    if (!isUnique) {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      barcode = `2${timestamp.slice(-7)}${random}`;

      const finalCheck = await sqlQuery(
        `SELECT id FROM products WHERE barcode = ? AND deleted_at IS NULL
              UNION
              SELECT product_id as id FROM product_barcodes WHERE barcode = ?`,
        [barcode, barcode]
      );

      if (finalCheck.length > 0) {
        // Last resort: use full timestamp
        barcode = `2${Date.now().toString().slice(-11)}`;
      }
    }

    return NextResponse.json({ barcode });
  } catch (error) {
    console.error("Error generating barcode:", error);
    return NextResponse.json(
      { error: "Failed to generate barcode" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

