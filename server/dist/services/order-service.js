"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrders = getOrders;
exports.getOrderById = getOrderById;
exports.createOrder = createOrder;
exports.fillOrder = fillOrder;
exports.cancelOrder = cancelOrder;
exports.fundEscrow = fundEscrow;
exports.attestDelivery = attestDelivery;
exports.confirmReceipt = confirmReceipt;
exports.contestDelivery = contestDelivery;
exports.resolveDispute = resolveDispute;
exports.getVoucherById = getVoucherById;
exports.getVouchersByOwner = getVouchersByOwner;
exports.listVoucher = listVoucher;
exports.buyVoucher = buyVoucher;
exports.getListedVouchers = getListedVouchers;
const connection_1 = __importDefault(require("../db/connection"));
const uuid_1 = require("uuid");
const types_1 = require("../../../shared/types");
const user_service_1 = require("./user-service");
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
function rowToOrder(row) {
    return {
        ...row,
        filled_by: row.filled_by || undefined,
        filled_at: row.filled_at || undefined,
        escrow_funded_at: row.escrow_funded_at ?? undefined,
        delivered_at: row.delivered_at ?? undefined,
        contested_at: row.contested_at ?? undefined,
        funds_released_at: row.funds_released_at ?? undefined,
    };
}
function getBuyerId(order) {
    return order.type === types_1.OrderType.ASK ? (order.filled_by) : order.creator_id;
}
function getSellerId(order) {
    return order.type === types_1.OrderType.ASK ? order.creator_id : (order.filled_by);
}
/** If order is delivered and 2 days passed with no contest, set funds_released_at. Returns updated order. */
function applyAutoRelease(order) {
    if (order.status !== types_1.OrderStatus.FILLED || !order.delivered_at || order.contested_at || order.funds_released_at) {
        return order;
    }
    const delivered = new Date(order.delivered_at).getTime();
    if (Date.now() - delivered < TWO_DAYS_MS)
        return order;
    const now = new Date().toISOString();
    connection_1.default.prepare('UPDATE orders SET funds_released_at = ? WHERE id = ?').run(now, order.id);
    return { ...order, funds_released_at: now };
}
function rowToVoucher(row) {
    return { ...row, is_listed: !!row.is_listed, listed_price: row.listed_price || undefined };
}
function getOrders(filters = {}) {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (filters.crop_type) {
        sql += ' AND crop_type = ?';
        params.push(filters.crop_type);
    }
    if (filters.type) {
        sql += ' AND type = ?';
        params.push(filters.type);
    }
    if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
    }
    if (filters.delivery_date) {
        sql += ' AND delivery_date = ?';
        params.push(filters.delivery_date);
    }
    if (filters.delivery_month) {
        sql += " AND strftime('%Y-%m', delivery_date) = ?";
        params.push(filters.delivery_month);
    }
    if (filters.creator_id) {
        sql += ' AND creator_id = ?';
        params.push(filters.creator_id);
    }
    if (filters.filled_by) {
        sql += ' AND filled_by = ?';
        params.push(filters.filled_by);
    }
    sql += ' ORDER BY created_at DESC';
    const orders = connection_1.default.prepare(sql).all(...params).map(rowToOrder);
    return orders.map((o) => applyAutoRelease(o));
}
function getOrderById(id) {
    const row = connection_1.default.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!row)
        return undefined;
    const order = rowToOrder(row);
    return applyAutoRelease(order);
}
function createOrder(creatorId, data) {
    const user = (0, user_service_1.getUserById)(creatorId);
    if (!user)
        return { error: 'User not found' };
    if (data.type === types_1.OrderType.ASK) {
        if (user.role !== types_1.UserRole.FARMER)
            return { error: 'Only farmers can create sell orders' };
        if (!user.is_verified)
            return { error: 'Farmer must be verified to create sell orders' };
    }
    const id = (0, uuid_1.v4)();
    connection_1.default.prepare('INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, creatorId, data.crop_type, data.type, data.price, data.quantity, data.delivery_date, types_1.OrderStatus.OPEN);
    return { order: getOrderById(id) };
}
function fillOrder(userId, orderId) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.OPEN)
        return { error: 'Order is not open' };
    if (order.creator_id === userId)
        return { error: 'Cannot fill your own order' };
    const user = (0, user_service_1.getUserById)(userId);
    if (!user)
        return { error: 'User not found' };
    const now = new Date().toISOString();
    connection_1.default.prepare('UPDATE orders SET status = ?, filled_by = ?, filled_at = ? WHERE id = ?')
        .run(types_1.OrderStatus.FILLED, userId, now, orderId);
    let voucher;
    if (order.type === types_1.OrderType.ASK) {
        const voucherId = (0, uuid_1.v4)();
        connection_1.default.prepare('INSERT INTO vouchers (id, original_order_id, owner_id, crop_type, quantity, delivery_date, purchase_price, is_listed) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(voucherId, orderId, userId, order.crop_type, order.quantity, order.delivery_date, order.price);
        voucher = getVoucherById(voucherId);
    }
    return { order: getOrderById(orderId), voucher };
}
function cancelOrder(userId, orderId) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.OPEN)
        return { error: 'Order is not open' };
    if (order.creator_id !== userId)
        return { error: 'Only the creator can cancel this order' };
    connection_1.default.prepare('UPDATE orders SET status = ? WHERE id = ?').run(types_1.OrderStatus.CANCELLED, orderId);
    return { order: getOrderById(orderId) };
}
function fundEscrow(userId, orderId) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.FILLED)
        return { error: 'Order is not filled' };
    if (getBuyerId(order) !== userId)
        return { error: 'Only the buyer can fund escrow' };
    if (order.escrow_funded_at)
        return { error: 'Escrow already funded' };
    const now = new Date().toISOString();
    connection_1.default.prepare('UPDATE orders SET escrow_funded_at = ? WHERE id = ?').run(now, orderId);
    return { order: getOrderById(orderId) };
}
function attestDelivery(userId, orderId) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.FILLED)
        return { error: 'Order is not filled' };
    if (getSellerId(order) !== userId)
        return { error: 'Only the seller can attest delivery' };
    if (!order.escrow_funded_at)
        return { error: 'Escrow must be funded before seller can attest delivery' };
    if (order.delivered_at)
        return { error: 'Delivery already attested' };
    const now = new Date().toISOString();
    connection_1.default.prepare('UPDATE orders SET delivered_at = ? WHERE id = ?').run(now, orderId);
    return { order: getOrderById(orderId) };
}
function confirmReceipt(userId, orderId) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.FILLED)
        return { error: 'Order is not filled' };
    if (getBuyerId(order) !== userId)
        return { error: 'Only the buyer can confirm receipt' };
    if (!order.delivered_at)
        return { error: 'Seller must attest delivery first' };
    if (order.contested_at)
        return { error: 'Order is contested; wait for resolution' };
    if (order.funds_released_at)
        return { error: 'Funds already released' };
    const now = new Date().toISOString();
    connection_1.default.prepare('UPDATE orders SET funds_released_at = ? WHERE id = ?').run(now, orderId);
    return { order: getOrderById(orderId) };
}
function contestDelivery(userId, orderId) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.FILLED)
        return { error: 'Order is not filled' };
    if (getBuyerId(order) !== userId)
        return { error: 'Only the buyer can contest delivery' };
    if (!order.delivered_at)
        return { error: 'Cannot contest before seller attests delivery' };
    if (order.funds_released_at)
        return { error: 'Funds already released' };
    if (order.contested_at)
        return { error: 'Already contested' };
    const now = new Date().toISOString();
    connection_1.default.prepare('UPDATE orders SET contested_at = ? WHERE id = ?').run(now, orderId);
    return { order: getOrderById(orderId) };
}
/** Platform resolves dispute: release to seller or (for dev) leave contested for manual refund. */
function resolveDispute(orderId, resolution) {
    const order = getOrderById(orderId);
    if (!order)
        return { error: 'Order not found' };
    if (order.status !== types_1.OrderStatus.FILLED)
        return { error: 'Order is not filled' };
    if (!order.contested_at)
        return { error: 'Order is not contested' };
    if (order.funds_released_at)
        return { error: 'Funds already released' };
    if (resolution === 'release') {
        const now = new Date().toISOString();
        connection_1.default.prepare('UPDATE orders SET funds_released_at = ? WHERE id = ?').run(now, orderId);
        return { order: getOrderById(orderId) };
    }
    return { order: getOrderById(orderId) };
}
function getVoucherById(id) {
    const row = connection_1.default.prepare('SELECT * FROM vouchers WHERE id = ?').get(id);
    return row ? rowToVoucher(row) : undefined;
}
function getVouchersByOwner(ownerId) {
    return connection_1.default.prepare('SELECT * FROM vouchers WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId).map(rowToVoucher);
}
function listVoucher(ownerId, voucherId, listedPrice) {
    const voucher = getVoucherById(voucherId);
    if (!voucher)
        return { error: 'Voucher not found' };
    if (voucher.owner_id !== ownerId)
        return { error: 'Not the owner of this voucher' };
    if (voucher.is_listed)
        return { error: 'Voucher is already listed' };
    connection_1.default.prepare('UPDATE vouchers SET is_listed = 1, listed_price = ? WHERE id = ?').run(listedPrice, voucherId);
    return { voucher: getVoucherById(voucherId) };
}
function buyVoucher(buyerId, voucherId) {
    const voucher = getVoucherById(voucherId);
    if (!voucher)
        return { error: 'Voucher not found' };
    if (!voucher.is_listed)
        return { error: 'Voucher is not listed for sale' };
    if (voucher.owner_id === buyerId)
        return { error: 'Cannot buy your own voucher' };
    connection_1.default.prepare('UPDATE vouchers SET owner_id = ?, is_listed = 0, purchase_price = ?, listed_price = NULL WHERE id = ?')
        .run(buyerId, voucher.listed_price, voucherId);
    return { voucher: getVoucherById(voucherId) };
}
function getListedVouchers() {
    return connection_1.default.prepare('SELECT * FROM vouchers WHERE is_listed = 1 ORDER BY created_at DESC').all().map(rowToVoucher);
}
//# sourceMappingURL=order-service.js.map