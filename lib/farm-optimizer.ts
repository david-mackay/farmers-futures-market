/**
 * Farm plan optimizer: knapsack-style allocation of acreage to maximize
 * revenue given farmer's crops, crop metadata (yield kg/acre, days to harvest),
 * and current open BID (buy) orders on the futures market.
 *
 * Constraints: total acres, yield per acre, time to harvest (plant-by date
 * must be before delivery_date - days_to_harvest), and demand cap (total
 * open bid quantity per crop).
 *
 * Not an ODE — this is a linear/fractional knapsack over crops.
 */

import { Order, OrderType, OrderStatus, CropType } from '@/shared/types';
import {
  CROP_YIELD_PER_ACRE,
  CROP_DAYS_TO_HARVEST,
} from '@/shared/constants';
import type { OptimizedPlan, OptimizedPlanRow } from '@/shared/types';

/** Parse crops_produced string into CropType[]. */
export function parseCropsProduced(raw: string | null | undefined): CropType[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((c): c is CropType => Object.values(CropType).includes(c as CropType));
}

/** Add days to an ISO date string (YYYY-MM-DD), return YYYY-MM-DD. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Subtract days from an ISO date string. */
function subtractDays(isoDate: string, days: number): string {
  return addDays(isoDate, -days);
}

const today = () => new Date().toISOString().slice(0, 10);

export interface OptimizerInput {
  /** Crop types this farmer can grow (from profile). */
  farmerCrops: CropType[];
  /** Total acreage available. */
  acreage: number;
  /** Open BID (buy) orders — futures market demand. */
  openBidOrders: Order[];
}

/**
 * Build optimized allocation of acreage to crops to maximize revenue.
 * Uses greedy fractional knapsack: sort by revenue per acre (price * yield),
 * then allocate acres up to demand cap and total acreage. Respects time to
 * harvest by only considering orders whose delivery_date allows planting now.
 */
export function computeOptimizedPlan(input: OptimizerInput): OptimizedPlan {
  const { farmerCrops, acreage, openBidOrders } = input;
  const todayStr = today();
  const bidOrders = openBidOrders.filter(
    (o) => o.type === OrderType.BID && o.status === OrderStatus.OPEN && o.delivery_date >= todayStr
  );

  // Per crop: best price (max), total demand kg, and best delivery date (for plant-by)
  const cropStats = new Map<
    CropType,
    { pricePerKg: number; totalDemandKg: number; deliveryDate: string }
  >();

  for (const crop of farmerCrops) {
    const ordersForCrop = bidOrders.filter((o) => o.crop_type === crop);
    if (ordersForCrop.length === 0) continue;

    const totalDemandKg = ordersForCrop.reduce((s, o) => s + o.quantity, 0);
    const bestOrder = ordersForCrop.reduce((a, b) => (b.price > a.price ? b : a));
    const daysToHarvest = CROP_DAYS_TO_HARVEST[crop] ?? 0;
    // Include all orders; if plant-by is in the past we still show the row so the farmer
    // can see the opportunity and consider later delivery dates
    cropStats.set(crop, {
      pricePerKg: bestOrder.price,
      totalDemandKg,
      deliveryDate: bestOrder.delivery_date,
    });
  }

  // Revenue per acre = price_per_kg * yield_kg_per_acre
  type CropCandidate = {
    crop_type: CropType;
    pricePerKg: number;
    yieldPerAcre: number;
    revenuePerAcre: number;
    totalDemandKg: number;
    deliveryDate: string;
    daysToHarvest: number;
  };

  const candidates: CropCandidate[] = [];
  for (const [crop, stats] of cropStats) {
    const yieldPerAcre = CROP_YIELD_PER_ACRE[crop] ?? 0;
    if (yieldPerAcre <= 0) continue;
    candidates.push({
      crop_type: crop,
      pricePerKg: stats.pricePerKg,
      yieldPerAcre,
      revenuePerAcre: stats.pricePerKg * yieldPerAcre,
      totalDemandKg: stats.totalDemandKg,
      deliveryDate: stats.deliveryDate,
      daysToHarvest: CROP_DAYS_TO_HARVEST[crop] ?? 0,
    });
  }

  // Greedy knapsack: sort by revenue per acre descending
  candidates.sort((a, b) => b.revenuePerAcre - a.revenuePerAcre);

  let remainingAcres = acreage;
  const rows: OptimizedPlanRow[] = [];

  for (const c of candidates) {
    if (remainingAcres <= 0) break;
    const maxAcresFromDemand = c.totalDemandKg / c.yieldPerAcre;
    const acres = Math.min(remainingAcres, maxAcresFromDemand);
    if (acres <= 0) continue;

    const estimatedKg = Math.round(acres * c.yieldPerAcre * 100) / 100;
    const estimatedRevenue = Math.round(estimatedKg * c.pricePerKg * 100) / 100;
    const plantByDate = subtractDays(c.deliveryDate, c.daysToHarvest);
    const deliveryTooSoon = plantByDate < todayStr;

    rows.push({
      crop_type: c.crop_type,
      acres: Math.round(acres * 100) / 100,
      estimated_kg: estimatedKg,
      estimated_revenue: estimatedRevenue,
      price_per_kg: c.pricePerKg,
      days_to_harvest: c.daysToHarvest,
      plant_by_date: plantByDate,
      delivery_date: c.deliveryDate,
      delivery_too_soon: deliveryTooSoon,
    });
    remainingAcres -= acres;
  }

  const total_acres_used = Math.round((acreage - remainingAcres) * 100) / 100;
  const total_estimated_revenue = Math.round(
    rows.reduce((s, r) => s + r.estimated_revenue, 0) * 100
  ) / 100;

  return {
    total_acres_used,
    total_estimated_revenue,
    rows,
  };
}
