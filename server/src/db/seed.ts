import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import db from './connection';

const SEED_USER_ID = 'seed-farmer-001';
const SEED_USER_ADDRESS = '0xseed00000000000000000000000000000000000001';

interface JamaicanCrop {
  common_name: string;
  display_name: string;
  wholesale_price_jmd_per_kg: number;
  yield_kg_per_hectare: number;
}

/** Next N Mondays as YYYY-MM-DD (from today, or from next Monday if today is not Monday). */
function getNextMondays(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  const today = d.toISOString().slice(0, 10);
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
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
  const mondays = getNextMondays(4);

  const run = db.transaction(() => {
    db.exec('DELETE FROM vouchers');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM users');

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, ?, 'FARMER', 1, 1, ?)`
    ).run(SEED_USER_ID, SEED_USER_ADDRESS, 'Seed Farmer', now);

    const insertOrder = db.prepare(
      `INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`
    );

    const quantities = [100, 250, 500, 1000];
    let orderIndex = 0;
    for (const crop of crops) {
      const cropType = toCropType(crop.common_name);
      const price = crop.wholesale_price_jmd_per_kg;
      for (let m = 0; m < mondays.length; m++) {
        const qty = quantities[orderIndex % quantities.length];
        insertOrder.run(
          uuid(),
          SEED_USER_ID,
          cropType,
          'ASK',
          price,
          qty,
          mondays[m],
          now
        );
        orderIndex++;
      }
    }
  });

  run();
  console.log('Seeded: 1 user (Seed Farmer),', crops.length * mondays.length, 'OPEN ASK orders with JMD/kg from jamaican_crops.json.');
}

seed();
