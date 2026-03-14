import db from '../db/connection';
import { v4 as uuid } from 'uuid';
import { User, UserRole } from '../../../shared/types';

function rowToUser(row: any): User {
  return {
    ...row,
    is_verified: !!row.is_verified,
    delivery_address: row.delivery_address ?? null,
    acreage: row.acreage ?? null,
    crops_produced: row.crops_produced ?? null,
  };
}

export function getUserById(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return row ? rowToUser(row) : undefined;
}

export function createUser(address: string, displayName: string, role: UserRole): User {
  const id = uuid();
  db.prepare(
    'INSERT INTO users (id, address, display_name, role, is_verified) VALUES (?, ?, ?, ?, 0)'
  ).run(id, address, displayName, role);
  return getUserById(id)!;
}

export function updateUser(
  id: string,
  updates: {
    display_name?: string;
    role?: string;
    is_verified?: boolean;
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
  if (updates.is_verified !== undefined) {
    db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(updates.is_verified ? 1 : 0, id);
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

export function getAllUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at').all() as any[];
  return rows.map(rowToUser);
}
