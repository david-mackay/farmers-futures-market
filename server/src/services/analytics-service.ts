import db from '../db/connection';
import { HeatMapCell, PlantRecommendation, HedgeFlowCalculation, CropType, OrderType, OrderStatus } from '../../../shared/types';
import { CROP_YIELD_PER_ACRE } from '../../../shared/constants';

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
