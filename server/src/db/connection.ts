import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Use the Supabase connection pool URL (Settings → Database → Connection string → URI, transaction pooler port 6543).'
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export interface DbRow {
  [key: string]: unknown;
}

async function query(sql: string, params: unknown[] = []): Promise<DbRow[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return (result.rows as DbRow[]) ?? [];
  } finally {
    client.release();
  }
}

async function get(sql: string, params: unknown[] = []): Promise<DbRow | undefined> {
  const rows = await query(sql, params);
  return rows[0];
}

async function run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { changes: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

async function runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const tx: Tx = {
    get: (sql: string, params: unknown[] = []) =>
      client.query(sql, params).then((r: { rows: unknown[]; rowCount: number | null }) => (r.rows[0] as DbRow) ?? undefined),
    all: (sql: string, params: unknown[] = []) =>
      client.query(sql, params).then((r: { rows: unknown[] }) => r.rows as DbRow[]),
    run: (sql: string, params: unknown[] = []) =>
      client.query(sql, params).then((r: { rowCount: number | null }) => ({ changes: r.rowCount ?? 0 })),
  };
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export interface Tx {
  get: (sql: string, params?: unknown[]) => Promise<DbRow | undefined>;
  all: (sql: string, params?: unknown[]) => Promise<DbRow[]>;
  run: (sql: string, params?: unknown[]) => Promise<{ changes: number }>;
}

const db = {
  get: (sql: string, params?: unknown[]) => get(sql, params ?? []),
  all: (sql: string, params?: unknown[]) => query(sql, params ?? []),
  run: (sql: string, params?: unknown[]) => run(sql, params ?? []),
  runInTransaction,
};

export default db;
