import { v4 as uuid } from 'uuid';
import db from './connection';
import { CROPS } from './crops';

const USERS = [
  { id: 'farmer-alice', address: '0xAlice', display_name: 'Alice (Farmer)', role: 'FARMER', is_verified: 1 },
  { id: 'farmer-bob', address: '0xBob', display_name: 'Bob (Farmer)', role: 'FARMER', is_verified: 0 },
  { id: 'trader-carol', address: '0xCarol', display_name: 'Carol (Grocer)', role: 'TRADER', is_verified: 0 },
  { id: 'trader-dave', address: '0xDave', display_name: 'Dave (Grocer)', role: 'TRADER', is_verified: 0 },
];

// All delivery dates are Mondays (contracts end on Monday).
// quantity = kg; price = J$ per kg.
const ORDERS = [
  // Wheat — Mon Jul 13, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'WHEAT', type: 'ASK', price: 7.20, quantity: 500, delivery_date: '2026-07-13', status: 'OPEN' },
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'WHEAT', type: 'ASK', price: 7.35, quantity: 300, delivery_date: '2026-07-13', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'WHEAT', type: 'BID', price: 7.00, quantity: 400, delivery_date: '2026-07-13', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'WHEAT', type: 'BID', price: 6.90, quantity: 200, delivery_date: '2026-07-13', status: 'OPEN' },

  // Wheat — Mon Aug 17, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'WHEAT', type: 'ASK', price: 7.50, quantity: 400, delivery_date: '2026-08-17', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'WHEAT', type: 'BID', price: 7.30, quantity: 600, delivery_date: '2026-08-17', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'WHEAT', type: 'BID', price: 7.10, quantity: 200, delivery_date: '2026-08-17', status: 'OPEN' },

  // Corn — Mon Aug 24, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'CORN', type: 'ASK', price: 5.80, quantity: 1000, delivery_date: '2026-08-24', status: 'OPEN' },
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'CORN', type: 'ASK', price: 5.95, quantity: 500, delivery_date: '2026-08-24', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'CORN', type: 'BID', price: 5.60, quantity: 800, delivery_date: '2026-08-24', status: 'OPEN' },

  // Corn — Mon Sep 7, 2026
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'CORN', type: 'BID', price: 5.90, quantity: 1200, delivery_date: '2026-09-07', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'CORN', type: 'BID', price: 5.75, quantity: 400, delivery_date: '2026-09-07', status: 'OPEN' },

  // Soybeans — Mon Sep 14, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'SOYBEANS', type: 'ASK', price: 13.50, quantity: 200, delivery_date: '2026-09-14', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'SOYBEANS', type: 'BID', price: 13.80, quantity: 300, delivery_date: '2026-09-14', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'SOYBEANS', type: 'BID', price: 13.20, quantity: 100, delivery_date: '2026-09-14', status: 'OPEN' },

  // Tomatoes — Mon Jun 30, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'TOMATOES', type: 'ASK', price: 2.10, quantity: 800, delivery_date: '2026-06-30', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'TOMATOES', type: 'BID', price: 2.30, quantity: 1200, delivery_date: '2026-06-30', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'TOMATOES', type: 'BID', price: 2.15, quantity: 500, delivery_date: '2026-06-30', status: 'OPEN' },

  // Strawberries — Mon Jun 15, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'STRAWBERRIES', type: 'ASK', price: 3.50, quantity: 600, delivery_date: '2026-06-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-carol', crop_type: 'STRAWBERRIES', type: 'BID', price: 3.80, quantity: 1000, delivery_date: '2026-06-15', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'STRAWBERRIES', type: 'BID', price: 3.60, quantity: 400, delivery_date: '2026-06-15', status: 'OPEN' },

  // Rice — Mon Oct 12, 2026
  { id: uuid(), creator_id: 'farmer-alice', crop_type: 'RICE', type: 'ASK', price: 15.00, quantity: 300, delivery_date: '2026-10-12', status: 'OPEN' },
  { id: uuid(), creator_id: 'trader-dave', crop_type: 'RICE', type: 'BID', price: 15.50, quantity: 500, delivery_date: '2026-10-12', status: 'OPEN' },

  // Filled order for demo — Mon Jun 22, 2026
  { id: 'filled-order-1', creator_id: 'farmer-alice', crop_type: 'LETTUCE', type: 'ASK', price: 1.80, quantity: 400, delivery_date: '2026-06-22', status: 'FILLED', filled_by: 'trader-carol' },
];

function seed() {
  const run = db.transaction(() => {
    // Clear in FK order: vouchers → orders → users, plus crop catalog (portable SQL, no shell)
    db.exec('DELETE FROM vouchers');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM crops');

    const insertCrop = db.prepare(`
      INSERT INTO crops (
        id,
        common_name,
        display_name,
        scientific_name,
        category,
        planting_season,
        harvest_start_days,
        harvest_end_days,
        temperature_min_c,
        temperature_max_c,
        optimal_temperature_c,
        altitude_min_m,
        altitude_max_m,
        soil_ph_min,
        soil_ph_max,
        water_mm_per_week,
        sunlight,
        lifecycle,
        yield_kg_per_hectare,
        farmgate_price_jmd_per_kg,
        wholesale_price_jmd_per_kg,
        retail_price_jmd_per_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const crop of CROPS) {
      insertCrop.run(
        crop.id,
        crop.common_name,
        crop.display_name,
        crop.scientific_name,
        crop.category,
        crop.planting_season,
        crop.harvest_start_days,
        crop.harvest_end_days,
        crop.temperature_min_c,
        crop.temperature_max_c,
        crop.optimal_temperature_c,
        crop.altitude_min_m,
        crop.altitude_max_m,
        crop.soil_ph_min,
        crop.soil_ph_max,
        crop.water_mm_per_week,
        crop.sunlight,
        crop.lifecycle,
        crop.yield_kg_per_hectare,
        crop.farmgate_price_jmd_per_kg,
        crop.wholesale_price_jmd_per_kg,
        crop.retail_price_jmd_per_kg
      );
    }

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
  });

  run();
  console.log(`Seeded: ${CROPS.length} crops, ${USERS.length} users, ${ORDERS.length} orders (Monday delivery only, no vouchers)`);
}

seed();
