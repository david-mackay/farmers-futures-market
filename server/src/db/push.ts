/**
 * Push schema.sql to the database specified by DATABASE_URL.
 * Usage: npm run db:push (from server dir) or npm run db:push (from root)
 * Requires: DATABASE_URL in env or in server/.env
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

// Load server/.env so DATABASE_URL is available when run from server dir
config({ path: path.join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required. Set it in .env or the environment.');
  process.exit(1);
}

const schemaPath = path.join(__dirname, 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('schema.sql not found at', schemaPath);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf-8').trim();

async function push() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Failed to apply schema:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

push();
