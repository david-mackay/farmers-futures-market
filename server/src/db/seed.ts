import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { CONTRACT_DELIVERY_DAYS } from '../../../shared/constants';
import db from './connection';
import { CROPS } from './crops';

const SEED_FARMER_ID = 'seed-farmer-001';
const SEED_FARMER_ADDRESS = '0xseed00000000000000000000000000000000000001';
const SEED_BUYER_ID = 'seed-buyer-002';
const SEED_BUYER_ADDRESS = '0xseed00000000000000000000000000000000000002';

interface JamaicanCrop {
  common_name: string;
  display_name: string;
  wholesale_price_jmd_per_kg: number;
  yield_kg_per_hectare: number;
}

/** Next N contract delivery days (CONTRACT_DELIVERY_DAYS) as YYYY-MM-DD, from today onward. */
function getNextContractDays(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const set = new Set(CONTRACT_DELIVERY_DAYS);
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 365 && out.length < count; i++) {
    if (set.has(d.getDay())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      if (dateStr >= todayStr) out.push(dateStr);
    }
    d.setDate(d.getDate() + 1);
  }
  return out.slice(0, count);
}

/** common_name to crop_type (UPPER_SNAKE) for orders table. */
function toCropType(commonName: string): string {
  return commonName.toUpperCase().replace(/-/g, '_');
}

function seed() {
  const jsonPath = path.join(__dirname, '../../../jamaican_crops.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('jamaican_crops.json not found at', jsonPath);
    process.exit(1);
  }
  const crops: JamaicanCrop[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const deliveryDates = getNextContractDays(4);

  const run = db.transaction(() => {
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

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, ?, 'FARMER', 1, 1, ?)`
    ).run(SEED_FARMER_ID, SEED_FARMER_ADDRESS, 'Seed Farmer', now);

    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, ?, 'TRADER', 0, 0, ?)`
    ).run(SEED_BUYER_ID, SEED_BUYER_ADDRESS, 'Seed Buyer', now);

    const insertOrder = db.prepare(
      `INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`
    );

    const quantities = [100, 250, 500, 1000];
    let orderIndex = 0;
    for (const crop of crops) {
      const cropType = toCropType(crop.common_name);
      const askPrice = crop.wholesale_price_jmd_per_kg;
      for (let m = 0; m < deliveryDates.length; m++) {
        const qty = quantities[orderIndex % quantities.length];
        insertOrder.run(
          uuid(),
          SEED_FARMER_ID,
          cropType,
          'ASK',
          askPrice,
          qty,
          deliveryDates[m],
          now
        );
        orderIndex++;
      }
    }

    for (const crop of crops) {
      const cropType = toCropType(crop.common_name);
      const bidPrice = Math.round(crop.wholesale_price_jmd_per_kg * 0.9);
      if (bidPrice <= 0) continue;
      for (let m = 0; m < deliveryDates.length; m++) {
        insertOrder.run(
          uuid(),
          SEED_BUYER_ID,
          cropType,
          'BID',
          bidPrice,
          quantities[orderIndex % quantities.length],
          deliveryDates[m],
          now
        );
        orderIndex++;
      }
    }
  });

  run();
  console.log(
    `Seeded: ${CROPS.length} crops, 2 users, ${crops.length * deliveryDates.length * 2} OPEN orders (ASK + BID) with JMD/kg from jamaican_crops.json.`
  );
}

seed();
