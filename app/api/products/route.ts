import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
  handleValidationError,
  roundPrice,
} from "@/lib/utils/apiHelpers";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const productUnitEnum = z.enum([
  "piece",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
]);

const productSchema = z
  .object({
    name: z.string().min(1),
    barcode: z.string().optional(),
    additional_barcodes: z.array(z.string()).optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    category_id: z.number().optional(),
    cost_price: z.number().min(0),
    selling_price: z.number().min(0),
    stock_quantity: z.number().min(0),
    min_stock_level: z.number().min(0),
    unit: productUnitEnum.default("piece"),
    image_url: z.string().optional(),
    base_product_id: z.number().optional(),
    quantity_multiplier: z.number().optional(),
  })
  .refine(
    (data) => {
      // If base_product_id is set, quantity_multiplier must be > 0
      if (data.base_product_id !== undefined && data.base_product_id !== null) {
        if (
          data.quantity_multiplier === undefined ||
          data.quantity_multiplier === null ||
          data.quantity_multiplier <= 0
        ) {
          return false;
        }
      }
      // If base_product_id is not set, quantity_multiplier should not be set
      if (data.base_product_id === undefined || data.base_product_id === null) {
        if (
          data.quantity_multiplier !== undefined &&
          data.quantity_multiplier !== null
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "If base_product_id is set, quantity_multiplier must be > 0. If base_product_id is not set, quantity_multiplier should not be set.",
    }
  );

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const { page, limit, offset } = getPaginationParams(req);

    let sql = `
      SELECT p.*, 
             c.name as category_name,
             bp.stock_quantity as base_product_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN products bp ON p.base_product_id = bp.id
      WHERE p.deleted_at IS NULL
    `;
    const args: (string | number)[] = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      args.push(categoryId);
    }

    // Add search condition - include product_barcodes table for barcode search
    if (search) {
      const searchTerm = `%${search}%`;
      sql += ` AND (
        p.name LIKE ? OR 
        p.barcode LIKE ? OR 
        p.sku LIKE ? OR
        EXISTS (
          SELECT 1 FROM product_barcodes pb 
          WHERE pb.product_id = p.id AND pb.barcode LIKE ?
        )
      )`;
      args.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const result = await executePaginatedQuery({
      baseSql: sql,
      baseArgs: args,
      orderBy: "p.name",
      page,
      limit,
      offset,
    });

    // Fetch additional barcodes for all products
    const products = result.data as Array<{
      id: number;
      [key: string]: unknown;
    }>;
    const productIds = products.map((p) => p.id);
    const additionalBarcodesMap: Record<number, string[]> = {};

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const barcodesRows = await sqlQuery<{ product_id: number; barcode: string }>(
        `SELECT product_id, barcode FROM product_barcodes WHERE product_id IN (${placeholders})`,
        productIds
      );

      for (const r of barcodesRows) {
        if (!additionalBarcodesMap[r.product_id]) {
          additionalBarcodesMap[r.product_id] = [];
        }
        additionalBarcodesMap[r.product_id].push(r.barcode);
      }
    }

    // Add additional_barcodes to each product
    const productsWithBarcodes = products.map((p) => ({
      ...p,
      additional_barcodes: additionalBarcodesMap[p.id] || [],
    }));

    return NextResponse.json({
      products: productsWithBarcodes,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching products");
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = productSchema.parse(body);

    if (validated.base_product_id) {
      const baseProductRows = await sqlQuery(
        "SELECT id, sku, base_product_id FROM products WHERE id = ? AND deleted_at IS NULL",
        [validated.base_product_id]
      );
      if (baseProductRows.length === 0) {
        return NextResponse.json(
          { error: "Base product not found" },
          { status: 400 }
        );
      }
      const baseProductData = baseProductRows[0] as unknown as {
        id: number;
        sku: string | null;
        base_product_id: number | null;
      };
      // Prevent nested relationships - base product cannot itself be a related product
      if (baseProductData.base_product_id !== null) {
        return NextResponse.json(
          { error: "Base product cannot be a related product itself" },
          { status: 400 }
        );
      }
      // For related products, use the base product's SKU if not provided
      if (!validated.sku && baseProductData.sku) {
        validated.sku = baseProductData.sku;
      }
      // Related products should have stock_quantity = 0 (they use base product's stock)
      validated.stock_quantity = 0;
      validated.min_stock_level = 0;
    }

    const insertRows = await sqlQuery<{ id: number }>(
      `INSERT INTO products (name, barcode, sku, description, category_id, 
            cost_price, selling_price, stock_quantity, min_stock_level, unit, image_url,
            base_product_id, quantity_multiplier, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        validated.name,
        validated.barcode || null,
        validated.sku || null,
        validated.description || null,
        validated.category_id || null,
        roundPrice(validated.cost_price),
        roundPrice(validated.selling_price),
        validated.stock_quantity,
        validated.min_stock_level,
        validated.unit || "piece",
        validated.image_url || null,
        validated.base_product_id || null,
        validated.quantity_multiplier || null,
        getCurrentTimestamp(),
        getCurrentTimestamp(),
      ]
    );

    const productId = insertRows[0].id;

    if (
      validated.additional_barcodes &&
      validated.additional_barcodes.length > 0
    ) {
      for (const barcode of validated.additional_barcodes) {
        if (barcode?.trim()) {
          try {
            await sqlExecute(
              "INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)",
              [productId, barcode.trim()]
            );
          } catch (error) {
            console.warn(`Failed to add barcode ${barcode}:`, error);
          }
        }
      }
    }

    const productRows = await sqlQuery(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    return NextResponse.json({ product: productRows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating product");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await sqlExecute(
        "UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL",
        []
      );

      return NextResponse.json({
        message: "All products deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting products");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);
