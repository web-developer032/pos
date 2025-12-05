import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { generateRandomSKU } from "@/lib/utils/skuGenerator";

/**
 * Generate a unique SKU
 * Checks database to ensure uniqueness
 */
async function getHandler(_req: NextRequest) {
  try {
    const maxAttempts = 20;
    let attempts = 0;
    let sku: string = "";
    let isUnique = false;

    // Generate SKU and check for uniqueness
    while (attempts < maxAttempts && !isUnique) {
      sku = generateRandomSKU();

      // Check if SKU already exists in database
      const existing = await client.execute({
        sql: "SELECT id FROM products WHERE sku = ? AND deleted_at IS NULL",
        args: [sku],
      });

      if (existing.rows.length === 0) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    // If still not unique after max attempts, create a more unique version
    if (!isUnique) {
      const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
      const vowels = "AEIOU";
      const numbers = "0123456789";
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits

      // Generate a unique segment with timestamp
      const segment1 =
        consonants.charAt(Math.floor(Math.random() * consonants.length)) +
        vowels.charAt(Math.floor(Math.random() * vowels.length)) +
        timestamp;

      const segment2 =
        consonants.charAt(Math.floor(Math.random() * consonants.length)) +
        vowels.charAt(Math.floor(Math.random() * vowels.length)) +
        numbers.charAt(Math.floor(Math.random() * numbers.length)) +
        numbers.charAt(Math.floor(Math.random() * numbers.length));

      sku = `SKU-${segment1}-${segment2}`;

      // Double-check this one too
      const finalCheck = await client.execute({
        sql: "SELECT id FROM products WHERE sku = ? AND deleted_at IS NULL",
        args: [sku],
      });

      if (finalCheck.rows.length > 0) {
        // Last resort: use date-based format that's still readable
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD format
        const randomPart =
          consonants.charAt(Math.floor(Math.random() * consonants.length)) +
          vowels.charAt(Math.floor(Math.random() * vowels.length)) +
          Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0");
        sku = `SKU-${dateStr}-${randomPart}`;
      }
    }

    // Ensure sku is always assigned (fallback if somehow still empty)
    if (!sku) {
      const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
      const vowels = "AEIOU";
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const randomPart =
        consonants.charAt(Math.floor(Math.random() * consonants.length)) +
        vowels.charAt(Math.floor(Math.random() * vowels.length)) +
        Math.floor(Math.random() * 100)
          .toString()
          .padStart(2, "0");
      sku = `SKU-${dateStr}-${randomPart}`;
    }

    return NextResponse.json({ sku });
  } catch (error) {
    console.error("Error generating SKU:", error);
    return NextResponse.json(
      { error: "Failed to generate SKU" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
