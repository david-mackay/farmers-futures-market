import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/market.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: import('better-sqlite3').Database = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Idempotent migrations for existing DBs (ignore if column exists)
const migrations = [
  'ALTER TABLE users ADD COLUMN delivery_address TEXT',
  'ALTER TABLE users ADD COLUMN acreage REAL',
  'ALTER TABLE users ADD COLUMN crops_produced TEXT',
  'ALTER TABLE users ADD COLUMN email TEXT',
  'ALTER TABLE users ADD COLUMN is_farmer INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN verification_submitted_at TEXT',
  'ALTER TABLE orders ADD COLUMN escrow_funded_at TEXT',
  'ALTER TABLE orders ADD COLUMN delivered_at TEXT',
  'ALTER TABLE orders ADD COLUMN contested_at TEXT',
  'ALTER TABLE orders ADD COLUMN funds_released_at TEXT',
];
for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (_) {
    // Column already exists or table structure differs
  }
}

export default db;
