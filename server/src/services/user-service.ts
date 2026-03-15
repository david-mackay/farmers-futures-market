import db from '../db/connection';
import { v4 as uuid } from 'uuid';
import { User, UserRole } from '../../../shared/types';

function rowToUser(row: any): User {
  const isFarmer = row.is_farmer != null ? !!row.is_farmer : row.role === 'FARMER';
  return {
    ...row,
    email: row.email ?? null,
    is_farmer: isFarmer,
    is_verified: !!row.is_verified,
    verification_submitted_at: row.verification_submitted_at ?? null,
    delivery_address: row.delivery_address ?? null,
    acreage: row.acreage ?? null,
    crops_produced: row.crops_produced ?? null,
  };
}

export function getUserById(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row ? rowToUser(row) : undefined;
}

export function getUserByAddress(address: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as any;
  return row ? rowToUser(row) : undefined;
}

export function createUser(
  address: string,
  displayName: string,
  role: UserRole,
  email?: string | null
): User {
  const id = uuid();
  const isFarmer = role === UserRole.FARMER ? 1 : 0;
  db.prepare(
    'INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified) VALUES (?, ?, ?, ?, ?, ?, 0)'
  ).run(id, address, email ?? null, displayName, role, isFarmer);
  return getUserById(id)!;
}

export function getOrCreateUser(
  address: string,
  opts?: { email?: string | null; display_name?: string; is_farmer?: boolean }
): User {
  const existing = getUserByAddress(address);
  if (existing) {
    const patch: { email?: string | null; display_name?: string } = {};
    if (opts?.email !== undefined && opts.email !== existing.email) patch.email = opts.email;
    if (opts?.display_name !== undefined && opts.display_name.trim() && opts.display_name !== existing.display_name)
      patch.display_name = opts.display_name.trim();
    if (patch.email !== undefined)
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(patch.email ?? null, existing.id);
    if (patch.display_name !== undefined)
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(patch.display_name, existing.id);
    return patch.email !== undefined || patch.display_name !== undefined ? getUserById(existing.id)! : existing;
  }
  const displayName = opts?.display_name?.trim() || `User ${address.slice(0, 8)}`;
  const role = opts?.is_farmer ? UserRole.FARMER : UserRole.TRADER;
  return createUser(address, displayName, role, opts?.email);
}

export function updateUser(
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
): User | undefined {
  const user = getUserById(id);
  if (!user) return undefined;

  if (updates.display_name !== undefined) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(updates.display_name, id);
  }
  if (updates.role !== undefined) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(updates.role, id);
  }
  if (updates.is_farmer !== undefined) {
    db.prepare('UPDATE users SET is_farmer = ? WHERE id = ?').run(updates.is_farmer ? 1 : 0, id);
    if (updates.role === undefined) {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(updates.is_farmer ? 'FARMER' : 'TRADER', id);
    }
  }
  if (updates.is_verified !== undefined) {
    db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(updates.is_verified ? 1 : 0, id);
  }
  if (updates.verification_submitted_at !== undefined) {
    db.prepare('UPDATE users SET verification_submitted_at = ? WHERE id = ?').run(
      updates.verification_submitted_at ?? null,
      id
    );
  }
  if (updates.delivery_address !== undefined) {
    db.prepare('UPDATE users SET delivery_address = ? WHERE id = ?').run(updates.delivery_address ?? null, id);
  }
  if (updates.acreage !== undefined) {
    db.prepare('UPDATE users SET acreage = ? WHERE id = ?').run(updates.acreage ?? null, id);
  }
  if (updates.crops_produced !== undefined) {
    db.prepare('UPDATE users SET crops_produced = ? WHERE id = ?').run(updates.crops_produced ?? null, id);
  }

  return getUserById(id)!;
}

export function approveVerification(id: string): User | undefined {
  const now = new Date().toISOString();
  return updateUser(id, { is_verified: true, verification_submitted_at: now });
}

export function getAllUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at').all() as any[];
  return rows.map(rowToUser);
}
