import { v4 as uuid } from 'uuid';
import db from './connection';

const USERS = [
  { id: 'farmer-alice', address: '0xAlice', display_name: 'Alice (Farmer)', role: 'FARMER', is_verified: 1 },
  { id: 'farmer-bob', address: '0xBob', display_name: 'Bob (Farmer)', role: 'FARMER', is_verified: 0 },
  { id: 'trader-carol', address: '0xCarol', display_name: 'Carol (Grocer)', role: 'TRADER', is_verified: 0 },
  { id: 'trader-dave', address: '0xDave', display_name: 'Dave (Grocer)', role: 'TRADER', is_verified: 0 },
];

// quantity = number of lots (1 lot = 100 units)
const ORDERS = [
  // Wheat — delivery July 15, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'WHEAT', type: 'ASK', price: 7.20, quantity: 5, delivery_date: '2026-07-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'WHEAT', type: 'ASK', price: 7.35, quantity: 3, delivery_date: '2026-07-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'WHEAT', type: 'BID', price: 7.00, quantity: 4, delivery_date: '2026-07-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'WHEAT', type: 'BID', price: 6.90, quantity: 2, delivery_date: '2026-07-15', status: 'OPEN' },

  // Wheat — delivery Aug 20, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'WHEAT', type: 'ASK', price: 7.50, quantity: 4, delivery_date: '2026-08-20', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'WHEAT', type: 'BID', price: 7.30, quantity: 6, delivery_date: '2026-08-20', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'WHEAT', type: 'BID', price: 7.10, quantity: 2, delivery_date: '2026-08-20', status: 'OPEN' },

  // Corn — delivery Aug 25, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'CORN', type: 'ASK', price: 5.80, quantity: 10, delivery_date: '2026-08-25', status: 'OPEN' },
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'CORN', type: 'ASK', price: 5.95, quantity: 5, delivery_date: '2026-08-25', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'CORN', type: 'BID', price: 5.60, quantity: 8, delivery_date: '2026-08-25', status: 'OPEN' },

  // Corn — delivery Sep 10, 2026
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'CORN', type: 'BID', price: 5.90, quantity: 12, delivery_date: '2026-09-10', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'CORN', type: 'BID', price: 5.75, quantity: 4, delivery_date: '2026-09-10', status: 'OPEN' },

  // Soybeans — delivery Sep 15, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'SOYBEANS', type: 'ASK', price: 13.50, quantity: 2, delivery_date: '2026-09-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'SOYBEANS', type: 'BID', price: 13.80, quantity: 3, delivery_date: '2026-09-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'SOYBEANS', type: 'BID', price: 13.20, quantity: 1, delivery_date: '2026-09-15', status: 'OPEN' },

  // Tomatoes — delivery Jul 1, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'TOMATOES', type: 'ASK', price: 2.10, quantity: 8, delivery_date: '2026-07-01', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'TOMATOES', type: 'BID', price: 2.30, quantity: 12, delivery_date: '2026-07-01', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'TOMATOES', type: 'BID', price: 2.15, quantity: 5, delivery_date: '2026-07-01', status: 'OPEN' },

  // Strawberries — delivery Jun 15, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'STRAWBERRIES', type: 'ASK', price: 3.50, quantity: 6, delivery_date: '2026-06-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'STRAWBERRIES', type: 'BID', price: 3.80, quantity: 10, delivery_date: '2026-06-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'STRAWBERRIES', type: 'BID', price: 3.60, quantity: 4, delivery_date: '2026-06-15', status: 'OPEN' },

  // Rice — delivery Oct 10, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'RICE', type: 'ASK', price: 15.00, quantity: 3, delivery_date: '2026-10-10', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'RICE', type: 'BID', price: 15.50, quantity: 5, delivery_date: '2026-10-10', status: 'OPEN' },

  // A filled order for demo
  { id: 'filled-order-1', creator_id: 'farmer-alice', crop_type: 'LETTUCE', type: 'ASK', price: 1.80, quantity: 4, delivery_date: '2026-06-20', status: 'FILLED', filled_by: 'trader-carol' },
];

const VOUCHERS = [
  {
    id: uuid(),
    original_order_id: 'filled-order-1',
    owner_id: 'trader-carol',
    crop_type: 'LETTUCE',
    quantity: 4,
    delivery_date: '2026-06-20',
    purchase_price: 1.80,
    listed_price: null,
    is_listed: 0,
  },
];

function seed() {
  db.exec('DELETE FROM vouchers');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM users');

  const insertUser = db.prepare(
    'INSERT INTO users (id, address, display_name, role, is_verified) VALUES (?, ?, ?, ?, ?)'
  );
  for (const u of USERS) {
    insertUser.run(u.id, u.address, u.display_name, u.role, u.is_verified);
  }

  const insertOrder = db.prepare(
    'INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status, filled_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const o of ORDERS) {
    insertOrder.run(o.id, o.creator_id, o.crop_type, o.type, o.price, o.quantity, o.delivery_date, o.status, (o as any).filled_by || null);
  }

  const insertVoucher = db.prepare(
    'INSERT INTO vouchers (id, original_order_id, owner_id, crop_type, quantity, delivery_date, purchase_price, listed_price, is_listed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const v of VOUCHERS) {
    insertVoucher.run(v.id, v.original_order_id, v.owner_id, v.crop_type, v.quantity, v.delivery_date, v.purchase_price, v.listed_price, v.is_listed);
  }

  console.log(`Seeded: ${USERS.length} users, ${ORDERS.length} orders, ${VOUCHERS.length} vouchers`);
}

seed();
