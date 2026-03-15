import db from '../db/connection';
import { v4 as uuid } from 'uuid';
import { User, UserRole } from '../shared/types';

function rowToUser(row: Record<string, unknown>): User {
  const isFarmer = (row.is_farmer as number) != null ? !!(row.is_farmer as number) : row.role === 'FARMER';
  return {
    id: row.id as string,
    address: row.address as string,
    email: (row.email as string) ?? null,
    display_name: row.display_name as string,
    role: row.role as UserRole,
    is_farmer: isFarmer,
    is_verified: !!(row.is_verified as number),
    verification_submitted_at: (row.verification_submitted_at as string) ?? null,
    delivery_address: (row.delivery_address as string) ?? null,
    acreage: (row.acreage as number) ?? null,
    crops_produced: (row.crops_produced as string) ?? null,
    created_at: row.created_at as string,
  };
}

export async function getUserById(id: string): Promise<User | undefined> {
  const row = await db.get('SELECT * FROM users WHERE id = $1', [id]);
  return row ? rowToUser(row) : undefined;
}

export async function getUserByAddress(address: string): Promise<User | undefined> {
  const row = await db.get('SELECT * FROM users WHERE address = $1', [address]);
  return row ? rowToUser(row) : undefined;
}

export async function createUser(
  address: string,
  displayName: string,
  role: UserRole,
  email?: string | null
): Promise<User> {
  const id = uuid();
  const isFarmer = role === UserRole.FARMER ? 1 : 0;
  await db.run(
    'INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified) VALUES ($1, $2, $3, $4, $5, $6, 0)',
    [id, address, email ?? null, displayName, role, isFarmer]
  );
  return (await getUserById(id))!;
}

export async function getOrCreateUser(
  address: string,
  opts?: { email?: string | null; display_name?: string; is_farmer?: boolean }
): Promise<User> {
  const existing = await getUserByAddress(address);
  if (existing) {
    const patch: { email?: string | null; display_name?: string } = {};
    if (opts?.email !== undefined && opts.email !== existing.email) patch.email = opts.email;
    if (opts?.display_name !== undefined && opts.display_name.trim() && opts.display_name !== existing.display_name)
      patch.display_name = opts.display_name.trim();
    if (patch.email !== undefined)
      await db.run('UPDATE users SET email = $1 WHERE id = $2', [patch.email ?? null, existing.id]);
    if (patch.display_name !== undefined)
      await db.run('UPDATE users SET display_name = $1 WHERE id = $2', [patch.display_name, existing.id]);
    return (patch.email !== undefined || patch.display_name !== undefined ? await getUserById(existing.id) : existing)!;
  }
  const displayName = opts?.display_name?.trim() || `User ${address.slice(0, 4)}…${address.slice(-4)}`;
  const role = opts?.is_farmer ? UserRole.FARMER : UserRole.TRADER;
  return createUser(address, displayName, role, opts?.email);
}

export async function updateUser(
  id: string,
  updates: {
    display_name?: string;
    role?: string;
    is_farmer?: boolean;
    is_verified?: boolean;
    verification_submitted_at?: string | null;
    delivery_address?: string | null;
    acreage?: number | null;
    crops_produced?: string | null;
  }
): Promise<User | undefined> {
  const user = await getUserById(id);
  if (!user) return undefined;

  if (updates.display_name !== undefined) {
    await db.run('UPDATE users SET display_name = $1 WHERE id = $2', [updates.display_name, id]);
  }
  if (updates.role !== undefined) {
    await db.run('UPDATE users SET role = $1 WHERE id = $2', [updates.role, id]);
  }
  if (updates.is_farmer !== undefined) {
    await db.run('UPDATE users SET is_farmer = $1 WHERE id = $2', [updates.is_farmer ? 1 : 0, id]);
    if (updates.role === undefined) {
      await db.run('UPDATE users SET role = $1 WHERE id = $2', [updates.is_farmer ? 'FARMER' : 'TRADER', id]);
    }
  }
  if (updates.is_verified !== undefined) {
    await db.run('UPDATE users SET is_verified = $1 WHERE id = $2', [updates.is_verified ? 1 : 0, id]);
  }
  if (updates.verification_submitted_at !== undefined) {
    await db.run('UPDATE users SET verification_submitted_at = $1 WHERE id = $2', [
      updates.verification_submitted_at ?? null,
      id,
    ]);
  }
  if (updates.delivery_address !== undefined) {
    await db.run('UPDATE users SET delivery_address = $1 WHERE id = $2', [updates.delivery_address ?? null, id]);
  }
  if (updates.acreage !== undefined) {
    await db.run('UPDATE users SET acreage = $1 WHERE id = $2', [updates.acreage ?? null, id]);
  }
  if (updates.crops_produced !== undefined) {
    await db.run('UPDATE users SET crops_produced = $1 WHERE id = $2', [updates.crops_produced ?? null, id]);
  }

  return getUserById(id)!;
}

export async function approveVerification(id: string): Promise<User | undefined> {
  const now = new Date().toISOString();
  return updateUser(id, { is_verified: true, verification_submitted_at: now });
}

export async function getAllUsers(): Promise<User[]> {
  const rows = (await db.all('SELECT * FROM users ORDER BY created_at')) as Record<string, unknown>[];
  return rows.map(rowToUser);
}
