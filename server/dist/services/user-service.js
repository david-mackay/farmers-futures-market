"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getUserByAddress = getUserByAddress;
exports.createUser = createUser;
exports.getOrCreateUser = getOrCreateUser;
exports.updateUser = updateUser;
exports.approveVerification = approveVerification;
exports.getAllUsers = getAllUsers;
const connection_1 = __importDefault(require("../db/connection"));
const uuid_1 = require("uuid");
const types_1 = require("../../../shared/types");
function rowToUser(row) {
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
function getUserById(id) {
    const row = connection_1.default.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? rowToUser(row) : undefined;
}
function getUserByAddress(address) {
    const row = connection_1.default.prepare('SELECT * FROM users WHERE address = ?').get(address);
    return row ? rowToUser(row) : undefined;
}
function createUser(address, displayName, role, email) {
    const id = (0, uuid_1.v4)();
    const isFarmer = role === types_1.UserRole.FARMER ? 1 : 0;
    connection_1.default.prepare('INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified) VALUES (?, ?, ?, ?, ?, ?, 0)').run(id, address, email ?? null, displayName, role, isFarmer);
    return getUserById(id);
}
function getOrCreateUser(address, opts) {
    const existing = getUserByAddress(address);
    if (existing) {
        const patch = {};
        if (opts?.email !== undefined && opts.email !== existing.email)
            patch.email = opts.email;
        if (opts?.display_name !== undefined && opts.display_name.trim() && opts.display_name !== existing.display_name)
            patch.display_name = opts.display_name.trim();
        if (patch.email !== undefined)
            connection_1.default.prepare('UPDATE users SET email = ? WHERE id = ?').run(patch.email ?? null, existing.id);
        if (patch.display_name !== undefined)
            connection_1.default.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(patch.display_name, existing.id);
        return patch.email !== undefined || patch.display_name !== undefined ? getUserById(existing.id) : existing;
    }
    const displayName = opts?.display_name?.trim() || `User ${address.slice(0, 8)}`;
    const role = opts?.is_farmer ? types_1.UserRole.FARMER : types_1.UserRole.TRADER;
    return createUser(address, displayName, role, opts?.email);
}
function updateUser(id, updates) {
    const user = getUserById(id);
    if (!user)
        return undefined;
    if (updates.display_name !== undefined) {
        connection_1.default.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(updates.display_name, id);
    }
    if (updates.role !== undefined) {
        connection_1.default.prepare('UPDATE users SET role = ? WHERE id = ?').run(updates.role, id);
    }
    if (updates.is_farmer !== undefined) {
        connection_1.default.prepare('UPDATE users SET is_farmer = ? WHERE id = ?').run(updates.is_farmer ? 1 : 0, id);
        if (updates.role === undefined) {
            connection_1.default.prepare('UPDATE users SET role = ? WHERE id = ?').run(updates.is_farmer ? 'FARMER' : 'TRADER', id);
        }
    }
    if (updates.is_verified !== undefined) {
        connection_1.default.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(updates.is_verified ? 1 : 0, id);
    }
    if (updates.verification_submitted_at !== undefined) {
        connection_1.default.prepare('UPDATE users SET verification_submitted_at = ? WHERE id = ?').run(updates.verification_submitted_at ?? null, id);
    }
    if (updates.delivery_address !== undefined) {
        connection_1.default.prepare('UPDATE users SET delivery_address = ? WHERE id = ?').run(updates.delivery_address ?? null, id);
    }
    if (updates.acreage !== undefined) {
        connection_1.default.prepare('UPDATE users SET acreage = ? WHERE id = ?').run(updates.acreage ?? null, id);
    }
    if (updates.crops_produced !== undefined) {
        connection_1.default.prepare('UPDATE users SET crops_produced = ? WHERE id = ?').run(updates.crops_produced ?? null, id);
    }
    return getUserById(id);
}
function approveVerification(id) {
    const now = new Date().toISOString();
    return updateUser(id, { is_verified: true, verification_submitted_at: now });
}
function getAllUsers() {
    const rows = connection_1.default.prepare('SELECT * FROM users ORDER BY created_at').all();
    return rows.map(rowToUser);
}
//# sourceMappingURL=user-service.js.map