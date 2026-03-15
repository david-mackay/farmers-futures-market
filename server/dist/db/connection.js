"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = process.env.DB_PATH || path_1.default.join(__dirname, '../../data/market.db');
const dataDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const db = new better_sqlite3_1.default(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const schemaPath = path_1.default.join(__dirname, 'schema.sql');
const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
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
    }
    catch (_) {
        // Column already exists or table structure differs
    }
}
exports.default = db;
//# sourceMappingURL=connection.js.map