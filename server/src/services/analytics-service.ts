import db from '../db/connection';
import { HeatMapCell, PlantRecommendation, HedgeFlowCalculation, CropType, OrderType, OrderStatus } from '../../../shared/types';
import { CROP_YIELD_PER_ACRE } from '../../../shared/constants';

export interface MarketActivityOverview {
  open_orders: number;
  filled_orders: number;
  total_open_volume_kg: number;
  average_open_price: number;
}

export interface MarketActivityPoint {
  date: string;
  open_orders: number;
  filled_orders: number;
  volume_kg: number;
}

export interface TrendingCrop {
  crop_type: CropType;
  recent_order_count: number;
  previous_order_count: number;
  recent_volume_kg: number;
  average_price: number;
  momentum_pct: number;
}

export interface TopSellingCrop {
  crop_type: CropType;
  sold_quantity_kg: number;
  filled_order_count: number;
  avg_filled_price: number;
}

export interface PriceMover {
  crop_type: CropType;
  current_avg_price: number;
  previous_avg_price: number;
  change_amount: number;
  change_pct: number;
  direction: 'up' | 'down' | 'flat';
}

export interface MarketActivitySummary {
  selected_start_month: string;
  selected_end_month: string;
  previous_start_month: string;
  previous_end_month: string;
  available_months: string[];
  overview: MarketActivityOverview;
  activity_timeline: MarketActivityPoint[];
  trending_crops: TrendingCrop[];
  top_selling_crops: TopSellingCrop[];
  price_movers: PriceMover[];
}

export interface CropPricePoint {
  month: string;
  avg_price: number;
  filled_volume_kg: number;
}

export interface CropPriceAnalytics {
  crop_type: CropType;
  current_avg_open_price: number;
  recent_avg_filled_price: number;
  price_change_pct: number;
  total_open_volume_kg: number;
  monthly_points: CropPricePoint[];
}

function getMonthStart(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return `${month}-01`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function shiftMonth(month: string, delta: number) {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(year, value - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthDiff(startMonth: string, endMonth: string) {
  const [startYear, startValue] = startMonth.split('-').map(Number);
  const [endYear, endValue] = endMonth.split('-').map(Number);
  return (endYear - startYear) * 12 + (endValue - startValue);
}

function normalizeRange(startMonth?: string, endMonth?: string) {
  const end = getMonthStart(endMonth).slice(0, 7);
  const start = getMonthStart(startMonth ?? end).slice(0, 7);
  if (start <= end) {
    return { startMonth: start, endMonth: end };
  }
  return { startMonth: end, endMonth: start };
}

export function getHeatMap(): HeatMapCell[] {
  const rows = db.prepare(`
    SELECT
      crop_type,
      strftime('%Y-%m', delivery_date) as delivery_month,
      SUM(CASE WHEN type = 'BID' THEN quantity ELSE 0 END) as total_bid_quantity,
      SUM(CASE WHEN type = 'ASK' THEN quantity ELSE 0 END) as total_ask_quantity,
      AVG(CASE WHEN type = 'BID' THEN price END) as avg_bid_price,
      AVG(CASE WHEN type = 'ASK' THEN price END) as avg_ask_price
    FROM orders
    WHERE status = 'OPEN'
    GROUP BY crop_type, delivery_month
    ORDER BY delivery_month, crop_type
  `).all() as any[];

  return rows.map(row => ({
    crop_type: row.crop_type as CropType,
    delivery_month: row.delivery_month,
    total_bid_quantity: row.total_bid_quantity || 0,
    total_ask_quantity: row.total_ask_quantity || 0,
    gap: (row.total_bid_quantity || 0) - (row.total_ask_quantity || 0),
    avg_bid_price: row.avg_bid_price || 0,
    avg_ask_price: row.avg_ask_price || 0,
  }));
}

export function getPlantRecommendations(): PlantRecommendation[] {
  const rows = db.prepare(`
    SELECT
      o.crop_type,
      SUM(CASE WHEN o.type = 'BID' THEN o.quantity ELSE 0 END) as total_demand,
      AVG(CASE WHEN o.type = 'BID' THEN o.price END) as avg_bid_price,
      SUM(CASE WHEN o.type = 'ASK' THEN o.quantity ELSE 0 END) as total_supply
    FROM orders o
    WHERE o.status = 'OPEN'
    GROUP BY o.crop_type
    ORDER BY total_demand DESC
  `).all() as any[];

  return rows
    .filter(row => row.avg_bid_price > 0)
    .map(row => {
      const yieldPerAcre = CROP_YIELD_PER_ACRE[row.crop_type as CropType] || 0;
      const totalSupply = row.total_supply || 0;
      return {
        crop_type: row.crop_type as CropType,
        total_demand: row.total_demand || 0,
        avg_bid_price: Math.round(row.avg_bid_price * 100) / 100,
        projected_revenue_per_acre: Math.round(row.avg_bid_price * yieldPerAcre * 100) / 100,
        yield_per_acre: yieldPerAcre,
        demand_supply_ratio: totalSupply > 0 ? Math.round(((row.total_demand || 0) / totalSupply) * 100) / 100 : Infinity,
      };
    })
    .sort((a, b) => b.projected_revenue_per_acre - a.projected_revenue_per_acre);
}

export function getHedgeFlowCalc(cropType: CropType, acreage: number): HedgeFlowCalculation {
  const yieldPerAcre = CROP_YIELD_PER_ACRE[cropType] || 0;
  const expectedYield = acreage * yieldPerAcre;

  const row = db.prepare(`
    SELECT AVG(price) as avg_price
    FROM orders
    WHERE crop_type = ? AND type = 'BID' AND status = 'OPEN'
  `).get(cropType) as any;

  const recommendedPrice = row?.avg_price ? Math.round(row.avg_price * 100) / 100 : 0;

  return {
    crop_type: cropType,
    acreage,
    expected_yield: expectedYield,
    recommended_price: recommendedPrice,
    projected_revenue: Math.round(expectedYield * recommendedPrice * 100) / 100,
  };
}

export function getMarketActivity(startMonth?: string, endMonth?: string): MarketActivitySummary {
  const selectedRange = normalizeRange(startMonth, endMonth);
  const selectedStartMonth = selectedRange.startMonth;
  const selectedEndMonth = selectedRange.endMonth;
  const rangeLength = monthDiff(selectedStartMonth, selectedEndMonth) + 1;
  const previousStartMonth = shiftMonth(selectedStartMonth, -rangeLength);
  const previousEndMonth = shiftMonth(selectedEndMonth, -rangeLength);
  const availableMonths = (db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', created_at) AS month
    FROM orders
    WHERE created_at IS NOT NULL
    ORDER BY month DESC
  `).all() as any[])
    .map((row) => row.month as string)
    .filter(Boolean);

  const overviewRow = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_orders,
      SUM(CASE WHEN status = 'FILLED' THEN 1 ELSE 0 END) AS filled_orders,
      SUM(CASE WHEN status = 'OPEN' THEN quantity ELSE 0 END) AS total_open_volume_kg,
      AVG(CASE WHEN status = 'OPEN' THEN price END) AS average_open_price
    FROM orders
    WHERE strftime('%Y-%m', created_at) BETWEEN ? AND ?
  `).get(selectedStartMonth, selectedEndMonth) as any;

  const activityTimeline = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) AS date,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_orders,
      SUM(CASE WHEN status = 'FILLED' THEN 1 ELSE 0 END) AS filled_orders,
      SUM(quantity) AS volume_kg
    FROM orders
    WHERE strftime('%Y-%m', created_at) BETWEEN ? AND ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY strftime('%Y-%m', created_at) ASC
  `).all(selectedStartMonth, selectedEndMonth) as any[];

  const trendingRows = db.prepare(`
    SELECT
      crop_type,
      SUM(CASE WHEN strftime('%Y-%m', created_at) BETWEEN ? AND ? THEN 1 ELSE 0 END) AS recent_order_count,
      SUM(CASE WHEN strftime('%Y-%m', created_at) BETWEEN ? AND ? THEN 1 ELSE 0 END) AS previous_order_count,
      SUM(CASE WHEN strftime('%Y-%m', created_at) BETWEEN ? AND ? THEN quantity ELSE 0 END) AS recent_volume_kg,
      AVG(CASE WHEN strftime('%Y-%m', created_at) BETWEEN ? AND ? THEN price END) AS average_price
    FROM orders
    GROUP BY crop_type
    HAVING recent_order_count > 0 OR previous_order_count > 0
    ORDER BY recent_volume_kg DESC, recent_order_count DESC
    LIMIT 6
  `).all(
    selectedStartMonth, selectedEndMonth,
    previousStartMonth, previousEndMonth,
    selectedStartMonth, selectedEndMonth,
    selectedStartMonth, selectedEndMonth
  ) as any[];

  const topSellingRows = db.prepare(`
    SELECT
      crop_type,
      SUM(quantity) AS sold_quantity_kg,
      COUNT(*) AS filled_order_count,
      AVG(price) AS avg_filled_price
    FROM orders
    WHERE status = 'FILLED'
      AND strftime('%Y-%m', filled_at) BETWEEN ? AND ?
    GROUP BY crop_type
    ORDER BY sold_quantity_kg DESC, filled_order_count DESC
    LIMIT 6
  `).all(selectedStartMonth, selectedEndMonth) as any[];

  const priceMoverRows = db.prepare(`
    SELECT
      crop_type,
      AVG(CASE WHEN strftime('%Y-%m', created_at) BETWEEN ? AND ? THEN price END) AS current_avg_price,
      AVG(CASE WHEN strftime('%Y-%m', created_at) BETWEEN ? AND ? THEN price END) AS previous_avg_price
    FROM orders
    GROUP BY crop_type
    HAVING current_avg_price IS NOT NULL OR previous_avg_price IS NOT NULL
  `).all(selectedStartMonth, selectedEndMonth, previousStartMonth, previousEndMonth) as any[];

  return {
    selected_start_month: selectedStartMonth,
    selected_end_month: selectedEndMonth,
    previous_start_month: previousStartMonth,
    previous_end_month: previousEndMonth,
    available_months: availableMonths.filter((value) => availableMonths.includes(shiftMonth(value, -1))),
    overview: {
      open_orders: overviewRow?.open_orders || 0,
      filled_orders: overviewRow?.filled_orders || 0,
      total_open_volume_kg: overviewRow?.total_open_volume_kg || 0,
      average_open_price: Math.round((overviewRow?.average_open_price || 0) * 100) / 100,
    },
    activity_timeline: activityTimeline.map((row) => ({
      date: `${row.date}-01`,
      open_orders: row.open_orders || 0,
      filled_orders: row.filled_orders || 0,
      volume_kg: row.volume_kg || 0,
    })),
    trending_crops: trendingRows.map((row) => {
      const previous = row.previous_order_count || 0;
      const recent = row.recent_order_count || 0;
      const momentumPct = previous > 0
        ? Math.round(((recent - previous) / previous) * 100)
        : 0;

      return {
        crop_type: row.crop_type as CropType,
        recent_order_count: recent,
        previous_order_count: previous,
        recent_volume_kg: row.recent_volume_kg || 0,
        average_price: Math.round((row.average_price || 0) * 100) / 100,
        momentum_pct: momentumPct,
      };
    }),
    top_selling_crops: topSellingRows.map((row) => ({
      crop_type: row.crop_type as CropType,
      sold_quantity_kg: row.sold_quantity_kg || 0,
      filled_order_count: row.filled_order_count || 0,
      avg_filled_price: Math.round((row.avg_filled_price || 0) * 100) / 100,
    })),
    price_movers: priceMoverRows
      .map((row) => {
        const current = Math.round((row.current_avg_price || 0) * 100) / 100;
        const previous = Math.round((row.previous_avg_price || 0) * 100) / 100;
        const changeAmount = Math.round((current - previous) * 100) / 100;
        const changePct = previous > 0 ? Math.round((changeAmount / previous) * 100) : 0;

        return {
          crop_type: row.crop_type as CropType,
          current_avg_price: current,
          previous_avg_price: previous,
          change_amount: changeAmount,
          change_pct: changePct,
          direction: changeAmount > 0 ? 'up' : changeAmount < 0 ? 'down' : 'flat',
        } satisfies PriceMover;
      })
      .filter((row) => row.current_avg_price > 0 && row.previous_avg_price > 0)
      .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
      .slice(0, 6),
  };
}

export function getCropPriceAnalytics(cropType: CropType): CropPriceAnalytics {
  const openRow = db.prepare(`
    SELECT
      AVG(CASE WHEN status = 'OPEN' THEN price END) AS current_avg_open_price,
      SUM(CASE WHEN status = 'OPEN' THEN quantity ELSE 0 END) AS total_open_volume_kg
    FROM orders
    WHERE crop_type = ?
  `).get(cropType) as any;

  const monthlyRows = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) AS month,
      AVG(price) AS avg_price,
      SUM(CASE WHEN status = 'FILLED' THEN quantity ELSE 0 END) AS filled_volume_kg
    FROM orders
    WHERE crop_type = ?
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month DESC
    LIMIT 6
  `).all(cropType) as any[];

  const orderedPoints = monthlyRows
    .map((row) => ({
      month: row.month as string,
      avg_price: Math.round((row.avg_price || 0) * 100) / 100,
      filled_volume_kg: row.filled_volume_kg || 0,
    }))
    .reverse();

  const latest = orderedPoints[orderedPoints.length - 1];
  const previous = orderedPoints[orderedPoints.length - 2];
  const priceChangePct = latest && previous && previous.avg_price > 0
    ? Math.round(((latest.avg_price - previous.avg_price) / previous.avg_price) * 100)
    : 0;

  return {
    crop_type: cropType,
    current_avg_open_price: Math.round((openRow?.current_avg_open_price || 0) * 100) / 100,
    recent_avg_filled_price: latest?.avg_price || 0,
    price_change_pct: priceChangePct,
    total_open_volume_kg: openRow?.total_open_volume_kg || 0,
    monthly_points: orderedPoints,
  };
}
