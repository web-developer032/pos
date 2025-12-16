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
      sku TEXT,
      description TEXT,
      category_id INTEGER,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      min_stock_level REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'piece' CHECK(unit IN ('piece', 'gram', 'kilogram', 'liter', 'milliliter')),
      image_url TEXT,
      base_product_id INTEGER,
      quantity_multiplier REAL,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (base_product_id) REFERENCES products(id)
    )
  `);

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
      tax_type TEXT CHECK(tax_type IN ('percentage', 'amount')),
      tax_value REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Purchase order items table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      retail_price REAL,
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

  // Other Income table (for miscellaneous income like selling cardboard, etc.)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS other_income (
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
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_other_income_user ON other_income(user_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_other_income_date ON other_income(created_at)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_other_income_category ON other_income(category)`
  );

  // Employees table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      salary_type TEXT NOT NULL CHECK(salary_type IN ('monthly', 'daily')),
      base_salary REAL NOT NULL DEFAULT 0,
      join_date DATE,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Salary Payments table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS salary_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('salary', 'advance', 'bonus', 'deduction')),
      period TEXT NOT NULL,
      days_worked INTEGER,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank_transfer', 'check', 'other')),
      notes TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes for employees and salary payments
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(created_at)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_salary_payments_period ON salary_payments(period)`
  );

  // Cash Register Sessions table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cash_register_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      closing_balance REAL,
      expected_balance REAL,
      variance REAL,
      status TEXT NOT NULL CHECK(status IN ('open', 'closed')) DEFAULT 'open',
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes for cash register sessions
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_user ON cash_register_sessions(user_id)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_status ON cash_register_sessions(status)`
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_opened_at ON cash_register_sessions(opened_at)`
  );

  // ============ MIGRATIONS ============
  // Add retail_price column to purchase_order_items if it doesn't exist
  const poItemsInfo = await client.execute(
    `PRAGMA table_info(purchase_order_items)`
  );
  const hasRetailPrice = poItemsInfo.rows.some(
    (row) => (row as Record<string, unknown>).name === "retail_price"
  );
  if (!hasRetailPrice) {
    console.log("[DB] Adding retail_price column to purchase_order_items...");
    await client.execute(
      `ALTER TABLE purchase_order_items ADD COLUMN retail_price REAL`
    );
  }

  // Add product_name column to purchase_order_items if it doesn't exist
  const hasProductName = poItemsInfo.rows.some(
    (row) => (row as Record<string, unknown>).name === "product_name"
  );
  if (!hasProductName) {
    console.log("[DB] Adding product_name column to purchase_order_items...");
    await client.execute(
      `ALTER TABLE purchase_order_items ADD COLUMN product_name TEXT`
    );
  }

  // Backfill product_name for existing purchase order items that don't have it
  const nullProductNames = await client.execute(
    `SELECT COUNT(*) as count FROM purchase_order_items WHERE product_name IS NULL`
  );
  const nullCount = (nullProductNames.rows[0] as Record<string, unknown>)
    .count as number;
  if (nullCount > 0) {
    console.log(
      `[DB] Backfilling product_name for ${nullCount} purchase order items...`
    );
    await client.execute(`
      UPDATE purchase_order_items 
      SET product_name = (
        SELECT COALESCE(p.name, 'Unknown Product')
        FROM products p 
        WHERE p.id = purchase_order_items.product_id
      )
      WHERE product_name IS NULL
    `);
    console.log("[DB] Product names backfilled successfully");
  }

  // Add tax_type and tax_value columns to purchase_orders if they don't exist
  const poInfo = await client.execute(`PRAGMA table_info(purchase_orders)`);
  const hasTaxType = poInfo.rows.some(
    (row) => (row as Record<string, unknown>).name === "tax_type"
  );
  if (!hasTaxType) {
    console.log("[DB] Adding tax_type column to purchase_orders...");
    await client.execute(
      `ALTER TABLE purchase_orders ADD COLUMN tax_type TEXT CHECK(tax_type IN ('percentage', 'amount'))`
    );
  }
  const hasTaxValue = poInfo.rows.some(
    (row) => (row as Record<string, unknown>).name === "tax_value"
  );
  if (!hasTaxValue) {
    console.log("[DB] Adding tax_value column to purchase_orders...");
    await client.execute(
      `ALTER TABLE purchase_orders ADD COLUMN tax_value REAL DEFAULT 0`
    );
  }
}
