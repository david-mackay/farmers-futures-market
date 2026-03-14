CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('FARMER', 'TRADER')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  delivery_address TEXT,
  acreage REAL,
  crops_produced TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY,
  common_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  category TEXT NOT NULL,
  planting_season TEXT NOT NULL,
  harvest_start_days INTEGER NOT NULL,
  harvest_end_days INTEGER NOT NULL,
  temperature_min_c REAL NOT NULL,
  temperature_max_c REAL NOT NULL,
  optimal_temperature_c REAL NOT NULL,
  altitude_min_m REAL NOT NULL,
  altitude_max_m REAL NOT NULL,
  soil_ph_min REAL NOT NULL,
  soil_ph_max REAL NOT NULL,
  water_mm_per_week REAL NOT NULL,
  sunlight TEXT NOT NULL,
  lifecycle TEXT NOT NULL,
  yield_kg_per_hectare REAL NOT NULL,
  farmgate_price_jmd_per_kg REAL NOT NULL,
  wholesale_price_jmd_per_kg REAL NOT NULL,
  retail_price_jmd_per_kg REAL NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_crops_category ON crops(category);
CREATE INDEX IF NOT EXISTS idx_crops_common_name ON crops(common_name);
CREATE INDEX IF NOT EXISTS idx_vouchers_owner ON vouchers(owner_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_listed ON vouchers(is_listed);
