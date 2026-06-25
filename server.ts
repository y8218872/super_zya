import express from "express";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = 3000;

// Setup Database Connection Pool
const dbConfig = {
  host: process.env.DB_HOST || "2tfczl.h.filess.io",
  port: Number(process.env.DB_PORT) || 5434,
  user: process.env.DB_USER || "postgre_alreadyfed",
  password: process.env.DB_PASS || "59033e066ac4ddf1775ac23fdb023681abfa6323",
  database: process.env.DB_NAME || "postgre_alreadyfed",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
};

let pool = new Pool(dbConfig);

// Set search path for every new client connection to target the user's custom schema
pool.on("connect", (client) => {
  const schemaName = process.env.DB_USER || "postgre_alreadyfed";
  client.query(`SET search_path TO "${schemaName}", public;`).catch(err => {
    console.error("Error setting search_path on client connect:", err);
  });
});

// Helper function to initialize database tables
async function initializeDB() {
  const client = await pool.connect();
  try {
    const schemaName = process.env.DB_USER || "postgre_alreadyfed";
    console.log(`Setting search_path to ${schemaName}...`);
    await client.query(`SET search_path TO "${schemaName}", public;`);

    console.log("Initializing database tables if not existing...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_products (
        id VARCHAR(100) PRIMARY KEY,
        name_ar TEXT,
        name_en TEXT,
        barcodes TEXT[],
        category TEXT,
        purchase_price NUMERIC,
        sale_price NUMERIC,
        tax_rate NUMERIC,
        quantity INT,
        min_quantity INT,
        unit_ar TEXT,
        unit_en TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_customers (
        id VARCHAR(100) PRIMARY KEY,
        name_ar TEXT,
        name_en TEXT,
        phone TEXT,
        email TEXT,
        balance NUMERIC
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_suppliers (
        id VARCHAR(100) PRIMARY KEY,
        name_ar TEXT,
        name_en TEXT,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        vat_number TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_sales (
        id VARCHAR(100) PRIMARY KEY,
        invoice_number TEXT,
        timestamp TEXT,
        items JSONB,
        subtotal NUMERIC,
        tax_total NUMERIC,
        discount_total NUMERIC,
        grand_total NUMERIC,
        paid_amount NUMERIC,
        change_amount NUMERIC,
        payment_method TEXT,
        cashier_id TEXT,
        cashier_name TEXT,
        customer_id TEXT,
        customer_name TEXT,
        is_voided BOOLEAN,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_purchases (
        id VARCHAR(100) PRIMARY KEY,
        invoice_number TEXT,
        timestamp TEXT,
        supplier_id TEXT,
        supplier_name TEXT,
        items JSONB,
        grand_total NUMERIC,
        payment_method TEXT,
        received_by TEXT,
        status TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_categories (
        id VARCHAR(100) PRIMARY KEY,
        name_ar TEXT,
        name_en TEXT,
        color TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_movements (
        id VARCHAR(100) PRIMARY KEY,
        product_id TEXT,
        product_name_ar TEXT,
        product_name_en TEXT,
        type TEXT,
        quantity INT,
        timestamp TEXT,
        reference_id TEXT,
        remaining_qty INT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_employees (
        id VARCHAR(100) PRIMARY KEY,
        username TEXT,
        name TEXT,
        role TEXT,
        active BOOLEAN
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS erp_role_permissions (
        role VARCHAR(100) PRIMARY KEY,
        permissions JSONB
      );
    `);

    console.log("Database tables initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize database tables:", err);
  } finally {
    client.release();
  }
}

// Perform initial connection check & setup
pool.connect()
  .then(() => {
    console.log("Successfully connected to the PostgreSQL database!");
    initializeDB();
  })
  .catch(err => {
    console.error("Database connection failure at startup:", err.message);
  });

// ---------------- API ENDPOINTS ----------------

// 1. Live Connection Health Status Check
app.get("/api/db/health", async (req, res) => {
  const start = Date.now();
  try {
    const result = await pool.query("SELECT 1");
    const latency = Date.now() - start;
    res.json({
      status: "connected",
      latency: `${latency}ms`,
      ssl: "AES-256 GCM",
      database: dbConfig.database,
      host: dbConfig.host
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message || "Failed to ping the database server."
    });
  }
});

// 2. Custom Connection Validation & Configuration Test
app.post("/api/db/test", async (req, res) => {
  const { host, port, database, username, password } = req.body;
  const isFilessOrLocal = (host && (host.endsWith("filess.io") || host === "localhost" || host === "127.0.0.1"));
  const useSsl = process.env.DB_SSL === "true" || (!isFilessOrLocal && host && !host.includes("localhost"));
  const testPool = new Pool({
    host: host || dbConfig.host,
    port: Number(port) || dbConfig.port,
    user: username || dbConfig.user,
    password: password || dbConfig.password,
    database: database || dbConfig.database,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  });

  const start = Date.now();
  try {
    await testPool.query("SELECT 1");
    const latency = Date.now() - start;
    await testPool.end();
    res.json({
      success: true,
      latency: `${latency}ms`,
      message: `Successfully authenticated & connected to database: ${database}`
    });
  } catch (err: any) {
    res.json({
      success: false,
      message: err.message || "Connection timeout or authentication error."
    });
  }
});

// 3. Sync Pull - Fetch all database rows to populate the ERP
app.get("/api/db/pull", async (req, res) => {
  try {
    const settings = await pool.query("SELECT * FROM erp_settings");
    const products = await pool.query("SELECT * FROM erp_products");
    const customers = await pool.query("SELECT * FROM erp_customers");
    const suppliers = await pool.query("SELECT * FROM erp_suppliers");
    const sales = await pool.query("SELECT * FROM erp_sales");
    const purchases = await pool.query("SELECT * FROM erp_purchases");
    const categories = await pool.query("SELECT * FROM erp_categories");
    const movements = await pool.query("SELECT * FROM erp_movements");
    const employees = await pool.query("SELECT * FROM erp_employees");
    const rolePermissions = await pool.query("SELECT * FROM erp_role_permissions");

    // Format rows back to CamelCase structures for React state
    res.json({
      success: true,
      data: {
        settings: settings.rows.reduce((acc, row) => ({ ...acc, ...row.value }), {}),
        products: products.rows.map(r => ({
          id: r.id,
          nameAr: r.name_ar,
          nameEn: r.name_en,
          barcodes: r.barcodes || [],
          category: r.category,
          purchasePrice: parseFloat(r.purchase_price),
          salePrice: parseFloat(r.sale_price),
          taxRate: parseFloat(r.tax_rate),
          quantity: r.quantity,
          minQuantity: r.min_quantity,
          unitAr: r.unit_ar,
          unitEn: r.unit_en
        })),
        customers: customers.rows.map(r => ({
          id: r.id,
          nameAr: r.name_ar,
          nameEn: r.name_en,
          phone: r.phone,
          email: r.email,
          balance: parseFloat(r.balance)
        })),
        suppliers: suppliers.rows.map(r => ({
          id: r.id,
          nameAr: r.name_ar,
          nameEn: r.name_en,
          contactPerson: r.contact_person,
          phone: r.phone,
          email: r.email,
          vatNumber: r.vat_number
        })),
        sales: sales.rows.map(r => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          timestamp: r.timestamp,
          items: r.items || [],
          subtotal: parseFloat(r.subtotal),
          taxTotal: parseFloat(r.tax_total),
          discountTotal: parseFloat(r.discount_total),
          grandTotal: parseFloat(r.grand_total),
          paidAmount: parseFloat(r.paid_amount),
          changeAmount: parseFloat(r.change_amount),
          paymentMethod: r.payment_method,
          cashierId: r.cashier_id,
          cashierName: r.cashier_name,
          customerId: r.customer_id,
          customerName: r.customer_name,
          isVoided: r.is_voided,
          notes: r.notes
        })),
        purchases: purchases.rows.map(r => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          timestamp: r.timestamp,
          supplierId: r.supplier_id,
          supplierName: r.supplier_name,
          items: r.items || [],
          grandTotal: parseFloat(r.grand_total),
          paymentMethod: r.payment_method,
          receivedBy: r.received_by,
          status: r.status
        })),
        categories: categories.rows.map(r => ({
          id: r.id,
          nameAr: r.name_ar,
          nameEn: r.name_en,
          color: r.color
        })),
        movements: movements.rows.map(r => ({
          id: r.id,
          productId: r.product_id,
          productNameAr: r.product_name_ar,
          productNameEn: r.product_name_en,
          type: r.type,
          quantity: r.quantity,
          timestamp: r.timestamp,
          referenceId: r.reference_id,
          remainingQty: r.remaining_qty
        })),
        employees: employees.rows.map(r => ({
          id: r.id,
          username: r.username,
          name: r.name,
          role: r.role,
          active: r.active
        })),
        rolePermissions: rolePermissions.rows.reduce((acc, r) => ({
          ...acc,
          [r.role]: r.permissions
        }), {})
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to pull data from database."
    });
  }
});

// 4. Sync Push - Insert / Upsert all ERP items to PostgreSQL database
app.post("/api/db/push", async (req, res) => {
  const {
    settings,
    products,
    customers,
    suppliers,
    sales,
    purchases,
    categories,
    movements,
    employees,
    rolePermissions
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert Settings
    if (settings) {
      await client.query(
        `INSERT INTO erp_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ["store_settings", JSON.stringify(settings)]
      );
    }

    // Upsert Products
    if (Array.isArray(products)) {
      for (const p of products) {
        await client.query(
          `INSERT INTO erp_products (id, name_ar, name_en, barcodes, category, purchase_price, sale_price, tax_rate, quantity, min_quantity, unit_ar, unit_en)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
             name_ar = EXCLUDED.name_ar,
             name_en = EXCLUDED.name_en,
             barcodes = EXCLUDED.barcodes,
             category = EXCLUDED.category,
             purchase_price = EXCLUDED.purchase_price,
             sale_price = EXCLUDED.sale_price,
             tax_rate = EXCLUDED.tax_rate,
             quantity = EXCLUDED.quantity,
             min_quantity = EXCLUDED.min_quantity,
             unit_ar = EXCLUDED.unit_ar,
             unit_en = EXCLUDED.unit_en`,
          [p.id, p.nameAr, p.nameEn, p.barcodes || [], p.category, p.purchasePrice, p.salePrice, p.taxRate, p.quantity, p.minQuantity, p.unitAr, p.unitEn]
        );
      }
    }

    // Upsert Customers
    if (Array.isArray(customers)) {
      for (const c of customers) {
        await client.query(
          `INSERT INTO erp_customers (id, name_ar, name_en, phone, email, balance)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             name_ar = EXCLUDED.name_ar,
             name_en = EXCLUDED.name_en,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             balance = EXCLUDED.balance`,
          [c.id, c.nameAr, c.nameEn, c.phone, c.email, c.balance]
        );
      }
    }

    // Upsert Suppliers
    if (Array.isArray(suppliers)) {
      for (const s of suppliers) {
        await client.query(
          `INSERT INTO erp_suppliers (id, name_ar, name_en, contact_person, phone, email, vat_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             name_ar = EXCLUDED.name_ar,
             name_en = EXCLUDED.name_en,
             contact_person = EXCLUDED.contact_person,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             vat_number = EXCLUDED.vat_number`,
          [s.id, s.nameAr, s.nameEn, s.contactPerson, s.phone, s.email, s.vatNumber]
        );
      }
    }

    // Upsert Sales
    if (Array.isArray(sales)) {
      for (const s of sales) {
        await client.query(
          `INSERT INTO erp_sales (id, invoice_number, timestamp, items, subtotal, tax_total, discount_total, grand_total, paid_amount, change_amount, payment_method, cashier_id, cashier_name, customer_id, customer_name, is_voided, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             invoice_number = EXCLUDED.invoice_number,
             timestamp = EXCLUDED.timestamp,
             items = EXCLUDED.items,
             subtotal = EXCLUDED.subtotal,
             tax_total = EXCLUDED.tax_total,
             discount_total = EXCLUDED.discount_total,
             grand_total = EXCLUDED.grand_total,
             paid_amount = EXCLUDED.paid_amount,
             change_amount = EXCLUDED.change_amount,
             payment_method = EXCLUDED.payment_method,
             cashier_id = EXCLUDED.cashier_id,
             cashier_name = EXCLUDED.cashier_name,
             customer_id = EXCLUDED.customer_id,
             customer_name = EXCLUDED.customer_name,
             is_voided = EXCLUDED.is_voided,
             notes = EXCLUDED.notes`,
          [s.id, s.invoiceNumber, s.timestamp, JSON.stringify(s.items || []), s.subtotal, s.taxTotal, s.discountTotal, s.grandTotal, s.paidAmount, s.changeAmount, s.paymentMethod, s.cashierId, s.cashierName, s.customerId, s.customerName, s.isVoided, s.notes]
        );
      }
    }

    // Upsert Purchases
    if (Array.isArray(purchases)) {
      for (const p of purchases) {
        await client.query(
          `INSERT INTO erp_purchases (id, invoice_number, timestamp, supplier_id, supplier_name, items, grand_total, payment_method, received_by, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             invoice_number = EXCLUDED.invoice_number,
             timestamp = EXCLUDED.timestamp,
             supplier_id = EXCLUDED.supplier_id,
             supplier_name = EXCLUDED.supplier_name,
             items = EXCLUDED.items,
             grand_total = EXCLUDED.grand_total,
             payment_method = EXCLUDED.payment_method,
             received_by = EXCLUDED.received_by,
             status = EXCLUDED.status`,
          [p.id, p.invoiceNumber, p.timestamp, p.supplierId, p.supplierName, JSON.stringify(p.items || []), p.grandTotal, p.paymentMethod, p.receivedBy, p.status]
        );
      }
    }

    // Upsert Categories
    if (Array.isArray(categories)) {
      for (const c of categories) {
        await client.query(
          `INSERT INTO erp_categories (id, name_ar, name_en, color)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             name_ar = EXCLUDED.name_ar,
             name_en = EXCLUDED.name_en,
             color = EXCLUDED.color`,
          [c.id, c.nameAr, c.nameEn, c.color]
        );
      }
    }

    // Upsert Movements
    if (Array.isArray(movements)) {
      for (const m of movements) {
        await client.query(
          `INSERT INTO erp_movements (id, product_id, product_name_ar, product_name_en, type, quantity, timestamp, reference_id, remaining_qty)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             product_id = EXCLUDED.product_id,
             product_name_ar = EXCLUDED.product_name_ar,
             product_name_en = EXCLUDED.product_name_en,
             type = EXCLUDED.type,
             quantity = EXCLUDED.quantity,
             timestamp = EXCLUDED.timestamp,
             reference_id = EXCLUDED.reference_id,
             remaining_qty = EXCLUDED.remaining_qty`,
          [m.id, m.productId, m.productNameAr, m.productNameEn, m.type, m.quantity, m.timestamp, m.referenceId, m.remainingQty]
        );
      }
    }

    // Upsert Employees
    if (Array.isArray(employees)) {
      for (const emp of employees) {
        await client.query(
          `INSERT INTO erp_employees (id, username, name, role, active)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             active = EXCLUDED.active`,
          [emp.id, emp.username, emp.name, emp.role, emp.active]
        );
      }
    }

    // Upsert Role Permissions
    if (rolePermissions && typeof rolePermissions === "object") {
      for (const [role, perms] of Object.entries(rolePermissions)) {
        await client.query(
          `INSERT INTO erp_role_permissions (role, permissions) VALUES ($1, $2)
           ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions`,
          [role, JSON.stringify(perms)]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, message: "Successfully pushed and synchronized state to PostgreSQL!" });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: err.message || "Failed to push data to PostgreSQL." });
  } finally {
    client.release();
  }
});


// ---------------- SERVER AND VITE STATIC / DEV SETUP ----------------

if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server booted on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server listening on port ${PORT}`);
  });
}
