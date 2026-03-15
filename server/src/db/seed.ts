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

interface CropSeedProfile {
  seasonality: number;
  volatility: number;
  liquidity: number;
  demandBias: number;
  supplyBias: number;
  trendBias: number;
  tradeCount: number;
  openDepth: number;
}

const HISTORICAL_MONTHS = 12;
const OPEN_MARKET_DELIVERY_SLOTS = 6;
const QUANTITIES = [100, 250, 500, 1000, 1500];
const MIN_ORDERS_PER_MONTH = 50;
const MAX_ORDERS_PER_MONTH = 100;
const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};
const CROP_DETAILS_BY_NAME = new Map(CROPS.map((crop) => [crop.common_name, crop]));

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatMonth(date: Date) {
  return formatDate(date).slice(0, 7);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function seededUnit(seed: number, offset = 0) {
  const x = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function cropSeed(commonName: string) {
  return commonName.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

function parsePlantingMonths(plantingSeason: string) {
  if (plantingSeason === 'year_round') {
    return new Set(Array.from({ length: 12 }, (_, index) => index));
  }

  const months = new Set<number>();
  const ranges = plantingSeason.split(';').map((part) => part.trim()).filter(Boolean);

  for (const range of ranges) {
    const [startLabel, endLabel] = range.split('-').map((part) => part.trim());
    const start = MONTH_INDEX[startLabel as keyof typeof MONTH_INDEX];
    const end = MONTH_INDEX[(endLabel ?? startLabel) as keyof typeof MONTH_INDEX];

    if (start == null || end == null) continue;

    if (start <= end) {
      for (let month = start; month <= end; month++) months.add(month);
    } else {
      for (let month = start; month < 12; month++) months.add(month);
      for (let month = 0; month <= end; month++) months.add(month);
    }
  }

  return months;
}

function seasonalFactor(commonName: string, date: Date) {
  const crop = CROP_DETAILS_BY_NAME.get(commonName);
  if (!crop) return 1;

  const activeMonths = parsePlantingMonths(crop.planting_season);
  const month = date.getMonth();
  if (activeMonths.has(month)) {
    return crop.lifecycle === 'annual' ? 1.18 : 1.08;
  }

  const previousMonth = (month + 11) % 12;
  const nextMonth = (month + 1) % 12;
  if (activeMonths.has(previousMonth) || activeMonths.has(nextMonth)) {
    return crop.lifecycle === 'annual' ? 1.08 : 1.03;
  }

  return crop.lifecycle === 'annual' ? 0.86 : 0.95;
}

function buildCropProfile(crop: JamaicanCrop): CropSeedProfile {
  const seed = cropSeed(crop.common_name);
  const details = CROP_DETAILS_BY_NAME.get(crop.common_name);
  const annualBoost = details?.lifecycle === 'annual' ? 0.12 : 0;
  const categoryBoost = details?.category === 'export_crop' ? 0.1 : details?.category === 'beverage_crop' ? 0.06 : 0;

  return {
    seasonality: 0.9 + seededUnit(seed, 1) * 0.35 + annualBoost,
    volatility: 0.05 + seededUnit(seed, 2) * 0.16 + categoryBoost,
    liquidity: 0.75 + seededUnit(seed, 3) * 1.4,
    demandBias: 0.88 + seededUnit(seed, 4) * 0.45,
    supplyBias: 0.85 + seededUnit(seed, 5) * 0.5,
    trendBias: seededUnit(seed, 6) > 0.52 ? 1 : -1,
    tradeCount: 1 + Math.floor(seededUnit(seed, 7) * 3),
    openDepth: 1 + Math.floor(seededUnit(seed, 8) * 2),
  };
}

function roundedPrice(value: number) {
  return Math.max(40, Math.round(value));
}

function quantityForCrop(baseIndex: number, liquidity: number, seasonal: number, scale = 1) {
  const base = QUANTITIES[baseIndex % QUANTITIES.length];
  const adjusted = base * liquidity * seasonal * scale;
  return Math.max(50, Math.round(adjusted / 25) * 25);
}

function getContractDayOnOrAfter(start: Date, occurrenceOffset = 0): string {
  const set = new Set(CONTRACT_DELIVERY_DAYS);
  const date = new Date(start);
  let seen = 0;

  for (let i = 0; i < 366; i++) {
    if (set.has(date.getDay())) {
      if (seen === occurrenceOffset) {
        return formatDate(date);
      }
      seen++;
    }
    date.setDate(date.getDate() + 1);
  }

  return formatDate(start);
}

function getHistoricalMonthStarts() {
  const now = new Date();
  return Array.from({ length: HISTORICAL_MONTHS }, (_, index) => {
    const offset = index - (HISTORICAL_MONTHS - 1);
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  });
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
  const deliveryDates = getNextContractDays(OPEN_MARKET_DELIVERY_SLOTS);
  const historicalMonths = getHistoricalMonthStarts();

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
    const oldestSeededAt = historicalMonths[0]?.toISOString() ?? now;
    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, ?, 'FARMER', 1, 1, ?)`
    ).run(SEED_FARMER_ID, SEED_FARMER_ADDRESS, 'Seed Farmer', oldestSeededAt);

    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, ?, 'TRADER', 0, 0, ?)`
    ).run(SEED_BUYER_ID, SEED_BUYER_ADDRESS, 'Seed Buyer', oldestSeededAt);

    const insertOrder = db.prepare(
      `INSERT INTO orders (
        id,
        creator_id,
        crop_type,
        type,
        price,
        quantity,
        delivery_date,
        status,
        filled_by,
        filled_at,
        escrow_funded_at,
        delivered_at,
        contested_at,
        funds_released_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertVoucher = db.prepare(
      `INSERT INTO vouchers (
        id,
        original_order_id,
        owner_id,
        crop_type,
        quantity,
        delivery_date,
        purchase_price,
        listed_price,
        is_listed,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, ?)`
    );

    let orderIndex = 0;
    let openOrderCount = 0;
    let filledOrderCount = 0;
    let voucherCount = 0;

    for (const crop of crops) {
      const cropType = toCropType(crop.common_name);
      const profile = buildCropProfile(crop);
      const seed = cropSeed(crop.common_name);

      for (let monthIndex = 0; monthIndex < historicalMonths.length; monthIndex++) {
        const monthStart = historicalMonths[monthIndex];
        const monthSeasonality = seasonalFactor(crop.common_name, addDays(monthStart, 14));
        const activeChance = clamp(0.42 + (monthSeasonality - 0.9) * 0.45 + (profile.liquidity - 1) * 0.12, 0.3, 0.75);
        const isActiveThisMonth = seededUnit(seed, monthIndex + 190) < activeChance;
        if (!isActiveThisMonth) {
          continue;
        }
        const monthTradeCount = Math.max(
          1,
          Math.min(3, Math.round(profile.tradeCount * (0.85 + seededUnit(seed, monthIndex + 200) * 0.6)))
        );

        for (let tradeIndex = 0; tradeIndex < monthTradeCount; tradeIndex++) {
          const dayOffset = Math.floor(seededUnit(seed, monthIndex * 19 + tradeIndex + 20) * 25);
          const createdAt = addDays(monthStart, dayOffset);
          const seasonality = seasonalFactor(crop.common_name, createdAt) * profile.seasonality;
          const trendOffset = 1 + profile.trendBias * ((monthIndex / Math.max(1, historicalMonths.length - 1)) - 0.5) * 0.24;
          const noise = (seededUnit(seed, monthIndex * 29 + tradeIndex + 40) - 0.5) * profile.volatility * 2.4;
          const basePrice = crop.wholesale_price_jmd_per_kg * seasonality * trendOffset * (1 + noise);
          const tradeType = seededUnit(seed, monthIndex * 17 + tradeIndex + 60) > 0.4 ? 'ASK' : 'BID';
          const quantityScale = tradeType === 'ASK' ? profile.supplyBias : profile.demandBias;
          const quantity = quantityForCrop(
            orderIndex + tradeIndex,
            profile.liquidity,
            seasonality,
            quantityScale * (0.85 + seededUnit(seed, monthIndex * 11 + tradeIndex + 80) * 0.5)
          );
          const deliveryDate = getContractDayOnOrAfter(addDays(createdAt, 8 + tradeIndex + (monthIndex % 3)), (tradeIndex + monthIndex) % 2);
          const orderId = uuid();
          const filledAt = addDays(createdAt, 1 + ((tradeIndex + monthIndex) % 3)).toISOString();
          const fundedAt = addDays(createdAt, 2 + ((tradeIndex + monthIndex) % 2)).toISOString();
          const deliveredAt = addDays(createdAt, 4 + ((tradeIndex + monthIndex) % 2)).toISOString();
          const releasedAt = addDays(createdAt, 6 + ((tradeIndex + monthIndex) % 2)).toISOString();
          const filledBy = tradeType === 'ASK' ? SEED_BUYER_ID : SEED_FARMER_ID;
          const creatorId = tradeType === 'ASK' ? SEED_FARMER_ID : SEED_BUYER_ID;
          const price = roundedPrice(basePrice * (tradeType === 'BID' ? 0.965 : 1.01));

          insertOrder.run(
            orderId,
            creatorId,
            cropType,
            tradeType,
            price,
            quantity,
            deliveryDate,
            'FILLED',
            filledBy,
            filledAt,
            fundedAt,
            deliveredAt,
            null,
            releasedAt,
            createdAt.toISOString()
          );

          if (tradeType === 'ASK') {
            insertVoucher.run(
              uuid(),
              orderId,
              SEED_BUYER_ID,
              cropType,
              quantity,
              deliveryDate,
              price,
              releasedAt
            );
            voucherCount++;
          }

          filledOrderCount++;
          orderIndex++;
        }
      }

      for (let slot = 0; slot < Math.min(profile.openDepth, deliveryDates.length); slot++) {
        const participatesInOpenBook = seededUnit(seed, slot + 320) > 0.45;
        if (!participatesInOpenBook) {
          continue;
        }
        const deliveryDate = deliveryDates[slot];
        const deliveryMoment = new Date(`${deliveryDate}T00:00:00`);
        const seasonality = seasonalFactor(crop.common_name, deliveryMoment) * profile.seasonality;
        const spread = 0.06 + profile.volatility * 0.35 + seededUnit(seed, slot + 100) * 0.05;
        const midPrice = crop.wholesale_price_jmd_per_kg * seasonality * (1 + (seededUnit(seed, slot + 120) - 0.5) * profile.volatility);
        const askPrice = roundedPrice(midPrice * (1 + spread * profile.supplyBias * 0.5));
        const bidPrice = roundedPrice(midPrice * (1 - spread * profile.demandBias * 0.55));
        const createdAt = addDays(new Date(), -Math.floor(seededUnit(seed, slot + 140) * 24));
        const askQty = quantityForCrop(orderIndex + slot, profile.liquidity, seasonality, profile.supplyBias);
        const bidQty = quantityForCrop(orderIndex + slot + 2, profile.liquidity, seasonality, profile.demandBias * 0.92);
        const includeAsk = seededUnit(seed, slot + 160) > 0.3;
        const includeBid = seededUnit(seed, slot + 180) > 0.36;

        if (includeAsk) {
          insertOrder.run(
            uuid(),
            SEED_FARMER_ID,
            cropType,
            'ASK',
            askPrice,
            askQty,
            deliveryDate,
            'OPEN',
            null,
            null,
            null,
            null,
            null,
            null,
            createdAt.toISOString()
          );
          openOrderCount++;
        }

        if (includeBid) {
          insertOrder.run(
            uuid(),
            SEED_BUYER_ID,
            cropType,
            'BID',
            bidPrice,
            bidQty,
            deliveryDate,
            'OPEN',
            null,
            null,
            null,
            null,
            null,
            null,
            createdAt.toISOString()
          );
          openOrderCount++;
        }

        if (!includeAsk && !includeBid) {
          insertOrder.run(
            uuid(),
            seededUnit(seed, slot + 340) > 0.5 ? SEED_FARMER_ID : SEED_BUYER_ID,
            cropType,
            seededUnit(seed, slot + 360) > 0.5 ? 'ASK' : 'BID',
            seededUnit(seed, slot + 360) > 0.5 ? askPrice : bidPrice,
            seededUnit(seed, slot + 360) > 0.5 ? askQty : bidQty,
            deliveryDate,
            'OPEN',
            null,
            null,
            null,
            null,
            null,
            null,
            createdAt.toISOString()
          );
          openOrderCount++;
        }

        orderIndex++;
      }
    }

    const monthlyCounts = new Map<string, number>(
      (db.prepare(`
        SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
        FROM orders
        GROUP BY strftime('%Y-%m', created_at)
      `).all() as any[]).map((row) => [row.month as string, row.count as number])
    );

    for (let monthIndex = 0; monthIndex < historicalMonths.length; monthIndex++) {
      const monthStart = historicalMonths[monthIndex];
      const monthKey = formatMonth(monthStart);
      const currentCount = monthlyCounts.get(monthKey) ?? 0;
      const monthWave = (Math.sin((monthIndex / Math.max(1, historicalMonths.length - 1)) * Math.PI * 2 - Math.PI / 3) + 1) / 2;
      const seasonalBoost = Array.from(CROP_DETAILS_BY_NAME.keys())
        .slice(0, 8)
        .reduce((sum, commonName) => sum + seasonalFactor(commonName, addDays(monthStart, 14)), 0) / 8;
      const seededLift = seededUnit(monthIndex + 900, monthIndex + 33);
      const targetBase = MIN_ORDERS_PER_MONTH
        + Math.round(monthWave * 28 + (seasonalBoost - 0.95) * 18 + seededLift * 14);
      const monthLimit = clamp(targetBase, MIN_ORDERS_PER_MONTH, MAX_ORDERS_PER_MONTH);
      const missing = Math.max(0, monthLimit - currentCount);

      for (let extraIndex = 0; extraIndex < missing; extraIndex++) {
        const crop = crops[(monthIndex * 7 + extraIndex * 3) % crops.length];
        const cropType = toCropType(crop.common_name);
        const seed = cropSeed(crop.common_name);
        const profile = buildCropProfile(crop);
        const createdAt = addDays(monthStart, (extraIndex * 3 + monthIndex) % 24);
        const seasonality = seasonalFactor(crop.common_name, createdAt) * profile.seasonality;
        const priceBase = crop.wholesale_price_jmd_per_kg * seasonality * (0.95 + seededUnit(seed, extraIndex + monthIndex + 500) * 0.18);
        const quantity = quantityForCrop(orderIndex + extraIndex, profile.liquidity, seasonality, 0.9 + seededUnit(seed, extraIndex + 550) * 0.35);
        const deliveryDate = getContractDayOnOrAfter(addDays(createdAt, 9 + (extraIndex % 4)), extraIndex % 2);
        const isCurrentMonth = monthIndex === historicalMonths.length - 1;
        const sideAsk = seededUnit(seed, extraIndex + 600) > 0.5;

        if (isCurrentMonth) {
          insertOrder.run(
            uuid(),
            sideAsk ? SEED_FARMER_ID : SEED_BUYER_ID,
            cropType,
            sideAsk ? 'ASK' : 'BID',
            roundedPrice(priceBase * (sideAsk ? 1.04 : 0.96)),
            quantity,
            deliveryDate,
            'OPEN',
            null,
            null,
            null,
            null,
            null,
            null,
            createdAt.toISOString()
          );
          openOrderCount++;
        } else {
          const orderId = uuid();
          const price = roundedPrice(priceBase * (sideAsk ? 1.01 : 0.97));
          const filledAt = addDays(createdAt, 1 + (extraIndex % 2)).toISOString();
          const fundedAt = addDays(createdAt, 2 + (extraIndex % 2)).toISOString();
          const deliveredAt = addDays(createdAt, 4 + (extraIndex % 2)).toISOString();
          const releasedAt = addDays(createdAt, 6 + (extraIndex % 2)).toISOString();

          insertOrder.run(
            orderId,
            sideAsk ? SEED_FARMER_ID : SEED_BUYER_ID,
            cropType,
            sideAsk ? 'ASK' : 'BID',
            price,
            quantity,
            deliveryDate,
            'FILLED',
            sideAsk ? SEED_BUYER_ID : SEED_FARMER_ID,
            filledAt,
            fundedAt,
            deliveredAt,
            null,
            releasedAt,
            createdAt.toISOString()
          );

          if (sideAsk) {
            insertVoucher.run(
              uuid(),
              orderId,
              SEED_BUYER_ID,
              cropType,
              quantity,
              deliveryDate,
              price,
              releasedAt
            );
            voucherCount++;
          }

          filledOrderCount++;
        }
      }
    }

    return { openOrderCount, filledOrderCount, voucherCount };
  });

  const counts = run();
  console.log(
    `Seeded: ${CROPS.length} crops, 2 users, ${counts.openOrderCount} open orders, ${counts.filledOrderCount} filled orders, ${counts.voucherCount} vouchers across ~${HISTORICAL_MONTHS} months of market history.`
  );
}

seed();
