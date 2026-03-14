import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/market.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

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
];
for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (_) {
    // Column already exists or table structure differs
  }
}

export default db;
