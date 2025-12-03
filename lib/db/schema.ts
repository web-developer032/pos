import client from "../db";

export async function initializeDatabase() {
  // Users table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'manager')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Suppliers table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      sku TEXT UNIQUE,
      description TEXT,
      category_id INTEGER,
      supplier_id INTEGER,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      min_stock_level REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'piece' CHECK(unit IN ('piece', 'gram', 'kilogram', 'liter', 'milliliter')),
      image_url TEXT,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // Migration: Add unit and deleted_at columns to existing products table if they don't exist
  try {
    // Check if columns exist by querying table info
    const tableInfo = await client.execute(`PRAGMA table_info(products)`);
    const hasUnitColumn = tableInfo.rows.some((row) => {
      const name = row.name as string | undefined;
      return name === "unit";
    });
    const hasDeletedAtColumn = tableInfo.rows.some((row) => {
      const name = row.name as string | undefined;
      return name === "deleted_at";
    });

    if (!hasUnitColumn) {
      await client.execute(`
        ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'piece' CHECK(unit IN ('piece', 'gram', 'kilogram', 'liter', 'milliliter'))
      `);
      console.log("Migration: Added 'unit' column to products table");

      // Update existing products to have 'piece' as default unit
      await client.execute(`
        UPDATE products SET unit = 'piece' WHERE unit IS NULL OR unit = ''
      `);
    }

    if (!hasDeletedAtColumn) {
      await client.execute(`
        ALTER TABLE products ADD COLUMN deleted_at DATETIME
      `);
      console.log("Migration: Added 'deleted_at' column to products table");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      "Migration warning: Failed to check/add columns:",
      errorMessage
    );
  }

  // Migration: Change stock_quantity and min_stock_level to REAL if they're INTEGER
  try {
    // SQLite doesn't support ALTER COLUMN, so we'll handle this in application logic
    // The schema now uses REAL for both fields to support decimal quantities
  } catch {
    // Ignore migration errors
  }

  // Customers table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      final_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Sale items table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Migration: Add cost_price column to sale_items if it doesn't exist
  try {
    const tableInfo = await client.execute(`PRAGMA table_info(sale_items)`);
    const hasCostPriceColumn = tableInfo.rows.some(
      (row) => (row.name as string) === "cost_price"
    );
    if (!hasCostPriceColumn) {
      await client.execute(`
        ALTER TABLE sale_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0
      `);
      console.log("Migration: Added 'cost_price' column to sale_items table");

      // Update existing sale_items with cost_price from products table
      await client.execute(`
        UPDATE sale_items 
        SET cost_price = (
          SELECT COALESCE(p.cost_price, 0) 
          FROM products p 
          WHERE p.id = sale_items.product_id
        )
        WHERE cost_price = 0
      `);
      console.log(
        "Migration: Updated existing sale_items with cost_price from products"
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      "Migration warning: Failed to check/add cost_price column:",
      errorMessage
    );
  }

  // Payments table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    )
  `);

  // Purchase orders table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      discount_type TEXT CHECK(discount_type IN ('percentage', 'amount')),
      discount_value REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Migration: Add discount columns if they don't exist
  try {
    const tableInfo = await client.execute(
      `PRAGMA table_info(purchase_orders)`
    );
    const hasDiscountType = tableInfo.rows.some(
      (row) => (row.name as string | undefined) === "discount_type"
    );
    const hasDiscountValue = tableInfo.rows.some(
      (row) => (row.name as string | undefined) === "discount_value"
    );

    if (!hasDiscountType) {
      await client.execute(`
        ALTER TABLE purchase_orders ADD COLUMN discount_type TEXT CHECK(discount_type IN ('percentage', 'amount'))
      `);
      console.log(
        "Migration: Added 'discount_type' column to purchase_orders table"
      );
    }

    if (!hasDiscountValue) {
      await client.execute(`
        ALTER TABLE purchase_orders ADD COLUMN discount_value REAL DEFAULT 0
      `);
      console.log(
        "Migration: Added 'discount_value' column to purchase_orders table"
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      "Migration warning: Failed to check/add discount columns:",
      errorMessage
    );
  }

  // Purchase order items table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Inventory transactions table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale', 'purchase', 'adjustment', 'return')),
      quantity INTEGER NOT NULL,
      reference_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Migration: Update inventory_transactions CHECK constraint to include 'return'
  try {
    // SQLite doesn't support ALTER TABLE to modify CHECK constraints
    // So we need to recreate the table if the constraint doesn't include 'return'
    const tableInfo = await client.execute(
      `PRAGMA table_info(inventory_transactions)`
    );
    const hasTable = tableInfo.rows.length > 0;

    if (hasTable) {
      // Try to insert a test record to see if 'return' is allowed
      // We'll use a transaction to rollback if it fails
      try {
        // Check if we can insert 'return' type (test with invalid product_id that won't exist)
        await client.execute({
          sql: `INSERT INTO inventory_transactions (product_id, transaction_type, quantity) VALUES (?, ?, ?)`,
          args: [999999, "return", 0],
        });
        // If successful, delete the test record
        await client.execute({
          sql: `DELETE FROM inventory_transactions WHERE product_id = 999999 AND transaction_type = 'return'`,
        });
        // Table already supports 'return', no migration needed
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          "Migration warning: Failed to insert test record for 'return' type:",
          errorMessage
        );

        // Create new table with updated constraint
        await client.execute(`
          CREATE TABLE inventory_transactions_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale', 'purchase', 'adjustment', 'return')),
            quantity INTEGER NOT NULL,
            reference_id INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
          )
        `);

        // Copy existing data
        await client.execute(`
          INSERT INTO inventory_transactions_new 
          SELECT * FROM inventory_transactions
        `);

        // Drop old table
        await client.execute(`DROP TABLE inventory_transactions`);

        // Rename new table
        await client.execute(
          `ALTER TABLE inventory_transactions_new RENAME TO inventory_transactions`
        );

        // Recreate indexes
        await client.execute(
          `CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id)`
        );

        console.log(
          "Migration: Successfully updated inventory_transactions to support 'return' type"
        );
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      "Migration warning: Failed to update inventory_transactions constraint:",
      errorMessage
    );
  }

  // Discounts table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed')),
      value REAL NOT NULL,
      applicable_to TEXT NOT NULL CHECK(applicable_to IN ('product', 'category', 'all')),
      applicable_id INTEGER,
      start_date DATETIME,
      end_date DATETIME,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Supplier payments table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      purchase_order_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'check', 'other')),
      reference_number TEXT,
      notes TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Product barcodes table (for multiple barcodes per product)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS product_barcodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(barcode)
    )
  `);

  // Settings table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_supplier_payments_po ON supplier_payments(purchase_order_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_product_barcodes_product ON product_barcodes(product_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_product_barcodes_barcode ON product_barcodes(barcode)`
  );

  // Returns table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      sale_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      refund_amount REAL NOT NULL DEFAULT 0,
      refund_method TEXT NOT NULL CHECK(refund_method IN ('cash', 'card', 'digital', 'store_credit')),
      reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Return items table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      sale_item_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      refund_amount REAL NOT NULL,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Migration: Update returns table to add ON DELETE CASCADE to sale_id foreign key
  try {
    const tableInfo = await client.execute(`PRAGMA table_info(returns)`);
    const hasTable = tableInfo.rows.length > 0;

    if (hasTable) {
      // Check if we need to migrate by checking foreign key info
      // SQLite doesn't expose foreign key constraints easily, so we'll try to recreate
      // First, check if there are any returns
      const returnsCount = await client.execute({
        sql: `SELECT COUNT(*) as count FROM returns`,
      });
      const count =
        (returnsCount.rows[0] as unknown as { count: number })?.count || 0;

      if (count > 0) {
        console.log(
          "Migration: Updating returns table to add ON DELETE CASCADE..."
        );

        // Create new table with updated foreign key
        await client.execute(`
          CREATE TABLE returns_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_number TEXT UNIQUE NOT NULL,
            sale_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL DEFAULT 0,
            refund_amount REAL NOT NULL DEFAULT 0,
            refund_method TEXT NOT NULL CHECK(refund_method IN ('cash', 'card', 'digital', 'store_credit')),
            reason TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        // Copy existing data
        await client.execute(`
          INSERT INTO returns_new 
          SELECT * FROM returns
        `);

        // Drop old table
        await client.execute(`DROP TABLE returns`);

        // Rename new table
        await client.execute(`ALTER TABLE returns_new RENAME TO returns`);

        // Recreate indexes
        await client.execute(
          `CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id)`
        );
        await client.execute(
          `CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(created_at)`
        );

        console.log(
          "Migration: Successfully updated returns table with ON DELETE CASCADE"
        );
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      "Migration warning: Failed to update returns table foreign key:",
      errorMessage
    );
  }

  // Create indexes for returns
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_returns_sale ON returns(sale_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(created_at)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON return_items(sale_item_id)`
  );

  // Capital/Investment table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS capital (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('investment', 'withdrawal')),
      notes TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Expenses table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
      reference_number TEXT,
      notes TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_capital_user ON capital(user_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_capital_date ON capital(created_at)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(created_at)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)`
  );
}
