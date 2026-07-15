import Database from 'better-sqlite3';
import path from 'path';

// Define the path to the SQLite database file
const dbPath = path.resolve(process.cwd(), 'warung.db');

// Initialize database connection
const db = new Database(dbPath);

// Enable WAL journal mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    address TEXT,
    qr_image_url TEXT,
    commission_rate REAL DEFAULT 1.0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    is_owner INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(store_id, name)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    category_id INTEGER,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    cost_price INTEGER DEFAULT 0,
    barcode TEXT,
    in_stock INTEGER DEFAULT 1,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'qr')),
    total INTEGER NOT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER,
    name_snapshot TEXT NOT NULL,
    price_snapshot INTEGER NOT NULL,
    cost_price_snapshot INTEGER DEFAULT 0,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS commission_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    period TEXT NOT NULL, -- Format: YYYY-MM
    total_sales INTEGER NOT NULL,
    rate_applied REAL NOT NULL,
    amount_owed INTEGER NOT NULL,
    collected INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(store_id, period)
  );
`);

export default db;
