/**
 * Migrate data from LibSQL/SQLite local.db to PostgreSQL.
 *
 * Usage:
 *   1. Place your local.db file in the project root (or set LIBSQL_DB_PATH)
 *   2. Ensure PostgreSQL is running and DATABASE_URL is set in .env or .env.local
 *   3. Run: pnpm run migrate:libsql
 *
 * Uses sql.js (pure JS/WebAssembly) - no native bindings, works on all platforms.
 */

import "dotenv/config";
import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
interface SqlJsDb {
  exec: (sql: string) => { columns: string[]; values: unknown[][] }[];
  close: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require("sql.js") as () => Promise<{
  Database: new (data?: ArrayLike<number> | Buffer) => SqlJsDb;
}>;

import { Client } from "pg";

// Load .env.local (overrides .env)
config({ path: path.join(process.cwd(), ".env.local") });

const LIBSQL_DB_PATH =
  process.env.LIBSQL_DB_PATH || path.join(process.cwd(), "local.db");

const TABLE_ORDER = [
  "users",
  "categories",
  "suppliers",
  "products",
  "product_barcodes",
  "customers",
  "settings",
  "employees",
  "cash_register_sessions",
  "sales",
  "sale_items",
  "payments",
  "purchase_orders",
  "purchase_order_items",
  "returns",
  "return_items",
  "inventory_transactions",
  "capital",
  "expenses",
  "other_income",
  "salary_payments",
  "supplier_payments",
  "customer_payments",
  "discounts",
];

function escapeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function getSqliteTables(db: SqlJsDb): string[] {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  if (result.length === 0) return [];
  const nameIdx = result[0].columns.indexOf("name");
  return result[0].values.map((r: unknown[]) => String(r[nameIdx]));
}

function getTableColumns(db: SqlJsDb, table: string): string[] {
  const result = db.exec(`PRAGMA table_info(${escapeIdentifier(table)})`);
  if (result.length === 0) return [];
  const nameIdx = result[0].columns.indexOf("name");
  return result[0].values.map((r: unknown[]) => String(r[nameIdx]));
}

function getTableRows(db: SqlJsDb, table: string): Record<string, unknown>[] {
  const result = db.exec(`SELECT * FROM ${escapeIdentifier(table)}`);
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

async function migrate() {
  if (!fs.existsSync(LIBSQL_DB_PATH)) {
    console.error(`Error: ${LIBSQL_DB_PATH} not found.`);
    console.error(
      "Place your local.db file in the project root, or set LIBSQL_DB_PATH."
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log(`Reading from SQLite: ${LIBSQL_DB_PATH}`);
  console.log("Connecting to PostgreSQL...");

  const fileBuffer = fs.readFileSync(LIBSQL_DB_PATH);
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database(fileBuffer);
  const pg = new Client({ connectionString: databaseUrl });
  await pg.connect();

  try {
    const sqliteTables = new Set(getSqliteTables(sqlite));
    const tablesToMigrate = TABLE_ORDER.filter((t) => sqliteTables.has(t));

    if (tablesToMigrate.length === 0) {
      console.log("No matching tables found in local.db. Available tables:", [
        ...sqliteTables,
      ]);
      process.exit(1);
    }

    console.log(`Migrating ${tablesToMigrate.length} tables...`);

    await pg.query("SET session_replication_role = replica");
    for (const table of [...tablesToMigrate].reverse()) {
      try {
        await pg.query(`TRUNCATE TABLE ${escapeIdentifier(table)} CASCADE`);
        console.log(`  Truncated ${table}`);
      } catch (e) {
        console.warn(`  Skip truncate ${table}:`, (e as Error).message);
      }
    }
    await pg.query("SET session_replication_role = DEFAULT");

    let totalRows = 0;
    for (const table of tablesToMigrate) {
      if (!sqliteTables.has(table)) continue;

      const columns = getTableColumns(sqlite, table);
      if (columns.length === 0) continue;

      let rows = getTableRows(sqlite, table);
      if (rows.length === 0) {
        console.log(`  ${table}: 0 rows`);
        continue;
      }

      // For supplier_payments: null out purchase_order_id if the PO doesn't exist (orphaned refs)
      if (
        table === "supplier_payments" &&
        columns.includes("purchase_order_id")
      ) {
        const poResult = await pg.query("SELECT id FROM purchase_orders");
        const validPoIds = new Set(
          poResult.rows.map((r: { id: number }) => r.id)
        );
        rows = rows.map((row) => {
          const poId = row.purchase_order_id;
          if (poId != null && !validPoIds.has(Number(poId))) {
            return { ...row, purchase_order_id: null };
          }
          return row;
        });
      }

      // For purchase_orders: use 0 for null discount_value/tax_value (NOT NULL in PostgreSQL)
      if (table === "purchase_orders") {
        rows = rows.map((row) => ({
          ...row,
          discount_value: row.discount_value ?? 0,
          tax_value: row.tax_value ?? 0,
        }));
      }

      // For purchase_order_items: skip rows where po_id doesn't exist (orphaned refs)
      if (table === "purchase_order_items" && columns.includes("po_id")) {
        const poResult = await pg.query("SELECT id FROM purchase_orders");
        const validPoIds = new Set(
          poResult.rows.map((r: { id: number }) => r.id)
        );
        const before = rows.length;
        rows = rows.filter((row) => validPoIds.has(Number(row.po_id)));
        if (before > rows.length) {
          console.warn(
            `  Skipped ${before - rows.length} orphaned purchase_order_items (po_id not in purchase_orders)`
          );
        }
      }

      const colList = columns.map(escapeIdentifier).join(", ");
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${escapeIdentifier(table)} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      for (const row of rows) {
        const values = columns.map((col) => {
          const v = row[col];
          if (v === null || v === undefined) return null;
          if (typeof v === "number" && isNaN(v)) return null;
          return v;
        });
        try {
          await pg.query(sql, values);
          totalRows++;
        } catch (e) {
          console.error(
            `  Error inserting into ${table}:`,
            (e as Error).message
          );
          console.error("  Row:", JSON.stringify(row, null, 2).slice(0, 200));
        }
      }
      console.log(`  ${table}: ${rows.length} rows`);
    }

    const seqTables = [
      "users",
      "categories",
      "suppliers",
      "products",
      "customers",
      "sales",
      "sale_items",
      "payments",
      "purchase_orders",
      "purchase_order_items",
      "returns",
      "return_items",
      "inventory_transactions",
      "capital",
      "expenses",
      "other_income",
      "employees",
      "salary_payments",
      "supplier_payments",
      "customer_payments",
      "discounts",
      "product_barcodes",
      "cash_register_sessions",
    ];
    for (const table of seqTables) {
      if (!sqliteTables.has(table)) continue;
      try {
        const q = `SELECT setval(pg_get_serial_sequence('${table.replace(/'/g, "''")}', 'id'), COALESCE((SELECT MAX(id) FROM ${escapeIdentifier(table)}), 1))`;
        await pg.query(q);
      } catch {
        // Ignore if no serial column
      }
    }

    console.log(`\nDone. Migrated ${totalRows} rows total.`);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
