CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('FARMER', 'TRADER')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id),
  crop_type TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BID', 'ASK')),
  price REAL NOT NULL CHECK (price > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  delivery_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FILLED', 'CANCELLED')),
  filled_by TEXT REFERENCES users(id),
  filled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  original_order_id TEXT NOT NULL REFERENCES orders(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  crop_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  delivery_date TEXT NOT NULL,
  purchase_price REAL NOT NULL,
  listed_price REAL,
  is_listed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_crop_type ON orders(crop_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_owner ON vouchers(owner_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_listed ON vouchers(is_listed);
