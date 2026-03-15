import db from '../db/connection';
import { v4 as uuid } from 'uuid';
import { Order, OrderType, OrderStatus, FutureVoucher, UserRole } from '../../../shared/types';
import { getUserById } from './user-service';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function rowToOrder(row: any): Order {
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

function getBuyerId(order: Order): string {
  return order.type === OrderType.ASK ? (order.filled_by!) : order.creator_id;
}

function getSellerId(order: Order): string {
  return order.type === OrderType.ASK ? order.creator_id : (order.filled_by!);
}

/** If order is delivered and 2 days passed with no contest, set funds_released_at. Returns updated order. */
function applyAutoRelease(order: Order): Order {
  if (order.status !== OrderStatus.FILLED || !order.delivered_at || order.contested_at || order.funds_released_at) {
    return order;
  }
  const delivered = new Date(order.delivered_at).getTime();
  if (Date.now() - delivered < TWO_DAYS_MS) return order;
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET funds_released_at = ? WHERE id = ?').run(now, order.id);
  return { ...order, funds_released_at: now };
}

function rowToVoucher(row: any): FutureVoucher {
  return { ...row, is_listed: !!row.is_listed, listed_price: row.listed_price || undefined };
}

export interface OrderFilters {
  crop_type?: string;
  type?: string;
  status?: string;
  delivery_date?: string;
  delivery_month?: string;
  creator_id?: string;
  filled_by?: string;
}

export function getOrders(filters: OrderFilters = {}): Order[] {
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: any[] = [];

  if (filters.crop_type) { sql += ' AND crop_type = ?'; params.push(filters.crop_type); }
  if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
  if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
  if (filters.delivery_date) { sql += ' AND delivery_date = ?'; params.push(filters.delivery_date); }
  if (filters.delivery_month) { sql += " AND strftime('%Y-%m', delivery_date) = ?"; params.push(filters.delivery_month); }
  if (filters.creator_id) { sql += ' AND creator_id = ?'; params.push(filters.creator_id); }
  if (filters.filled_by) { sql += ' AND filled_by = ?'; params.push(filters.filled_by); }

  sql += ' ORDER BY created_at DESC';
  const orders = (db.prepare(sql).all(...params) as any[]).map(rowToOrder);
  return orders.map((o) => applyAutoRelease(o));
}

export function getOrderById(id: string): Order | undefined {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  const order = rowToOrder(row);
  return applyAutoRelease(order);
}

export function createOrder(
  creatorId: string,
  data: { crop_type: string; type: string; price: number; quantity: number; delivery_date: string }
): { order?: Order; error?: string } {
  const user = getUserById(creatorId);
  if (!user) return { error: 'User not found' };

  if (data.type === OrderType.ASK) {
    if (user.role !== UserRole.FARMER) return { error: 'Only farmers can create sell orders' };
    if (!user.is_verified) return { error: 'Farmer must be verified to create sell orders' };
  }

  const id = uuid();
  db.prepare(
    'INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, creatorId, data.crop_type, data.type, data.price, data.quantity, data.delivery_date, OrderStatus.OPEN);

  return { order: getOrderById(id)! };
}

export function fillOrder(userId: string, orderId: string): { order?: Order; voucher?: FutureVoucher; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.OPEN) return { error: 'Order is not open' };
  if (order.creator_id === userId) return { error: 'Cannot fill your own order' };

  const user = getUserById(userId);
  if (!user) return { error: 'User not found' };

  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET status = ?, filled_by = ?, filled_at = ? WHERE id = ?')
    .run(OrderStatus.FILLED, userId, now, orderId);

  let voucher: FutureVoucher | undefined;
  if (order.type === OrderType.ASK) {
    const voucherId = uuid();
    db.prepare(
      'INSERT INTO vouchers (id, original_order_id, owner_id, crop_type, quantity, delivery_date, purchase_price, is_listed) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
    ).run(voucherId, orderId, userId, order.crop_type, order.quantity, order.delivery_date, order.price);
    voucher = getVoucherById(voucherId);
  }

  return { order: getOrderById(orderId)!, voucher };
}

export function cancelOrder(userId: string, orderId: string): { order?: Order; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.OPEN) return { error: 'Order is not open' };
  if (order.creator_id !== userId) return { error: 'Only the creator can cancel this order' };

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(OrderStatus.CANCELLED, orderId);
  return { order: getOrderById(orderId)! };
}

export function fundEscrow(userId: string, orderId: string): { order?: Order; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.FILLED) return { error: 'Order is not filled' };
  if (getBuyerId(order) !== userId) return { error: 'Only the buyer can fund escrow' };
  if (order.escrow_funded_at) return { error: 'Escrow already funded' };
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET escrow_funded_at = ? WHERE id = ?').run(now, orderId);
  return { order: getOrderById(orderId)! };
}

export function attestDelivery(userId: string, orderId: string): { order?: Order; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.FILLED) return { error: 'Order is not filled' };
  if (getSellerId(order) !== userId) return { error: 'Only the seller can attest delivery' };
  if (!order.escrow_funded_at) return { error: 'Escrow must be funded before seller can attest delivery' };
  if (order.delivered_at) return { error: 'Delivery already attested' };
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET delivered_at = ? WHERE id = ?').run(now, orderId);
  return { order: getOrderById(orderId)! };
}

export function confirmReceipt(userId: string, orderId: string): { order?: Order; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.FILLED) return { error: 'Order is not filled' };
  if (getBuyerId(order) !== userId) return { error: 'Only the buyer can confirm receipt' };
  if (!order.delivered_at) return { error: 'Seller must attest delivery first' };
  if (order.contested_at) return { error: 'Order is contested; wait for resolution' };
  if (order.funds_released_at) return { error: 'Funds already released' };
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET funds_released_at = ? WHERE id = ?').run(now, orderId);
  return { order: getOrderById(orderId)! };
}

export function contestDelivery(userId: string, orderId: string): { order?: Order; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.FILLED) return { error: 'Order is not filled' };
  if (getBuyerId(order) !== userId) return { error: 'Only the buyer can contest delivery' };
  if (!order.delivered_at) return { error: 'Cannot contest before seller attests delivery' };
  if (order.funds_released_at) return { error: 'Funds already released' };
  if (order.contested_at) return { error: 'Already contested' };
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET contested_at = ? WHERE id = ?').run(now, orderId);
  return { order: getOrderById(orderId)! };
}

/** Platform resolves dispute: release to seller or (for dev) leave contested for manual refund. */
export function resolveDispute(orderId: string, resolution: 'release' | 'refund'): { order?: Order; error?: string } {
  const order = getOrderById(orderId);
  if (!order) return { error: 'Order not found' };
  if (order.status !== OrderStatus.FILLED) return { error: 'Order is not filled' };
  if (!order.contested_at) return { error: 'Order is not contested' };
  if (order.funds_released_at) return { error: 'Funds already released' };
  if (resolution === 'release') {
    const now = new Date().toISOString();
    db.prepare('UPDATE orders SET funds_released_at = ? WHERE id = ?').run(now, orderId);
    return { order: getOrderById(orderId)! };
  }
  return { order: getOrderById(orderId)! };
}

export function getVoucherById(id: string): FutureVoucher | undefined {
  const row = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(id) as any;
  return row ? rowToVoucher(row) : undefined;
}

export function getVouchersByOwner(ownerId: string): FutureVoucher[] {
  return (db.prepare('SELECT * FROM vouchers WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId) as any[]).map(rowToVoucher);
}

export function listVoucher(ownerId: string, voucherId: string, listedPrice: number): { voucher?: FutureVoucher; error?: string } {
  const voucher = getVoucherById(voucherId);
  if (!voucher) return { error: 'Voucher not found' };
  if (voucher.owner_id !== ownerId) return { error: 'Not the owner of this voucher' };
  if (voucher.is_listed) return { error: 'Voucher is already listed' };

  db.prepare('UPDATE vouchers SET is_listed = 1, listed_price = ? WHERE id = ?').run(listedPrice, voucherId);
  return { voucher: getVoucherById(voucherId)! };
}

export function buyVoucher(buyerId: string, voucherId: string): { voucher?: FutureVoucher; error?: string } {
  const voucher = getVoucherById(voucherId);
  if (!voucher) return { error: 'Voucher not found' };
  if (!voucher.is_listed) return { error: 'Voucher is not listed for sale' };
  if (voucher.owner_id === buyerId) return { error: 'Cannot buy your own voucher' };

  db.prepare('UPDATE vouchers SET owner_id = ?, is_listed = 0, purchase_price = ?, listed_price = NULL WHERE id = ?')
    .run(buyerId, voucher.listed_price, voucherId);
  return { voucher: getVoucherById(voucherId)! };
}

export function getListedVouchers(): FutureVoucher[] {
  return (db.prepare('SELECT * FROM vouchers WHERE is_listed = 1 ORDER BY created_at DESC').all() as any[]).map(rowToVoucher);
}
