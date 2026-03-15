import db from '../db/connection';

export interface LastPriceResult {
  lastFilledPrice: number | null;
  midPrice: number | null;
  livePrice: number | null;
  source: 'last_trade' | 'mid' | null;
}

export async function getLastPrice(cropType: string, deliveryDate?: string | null): Promise<LastPriceResult> {
  const result: LastPriceResult = {
    lastFilledPrice: null,
    midPrice: null,
    livePrice: null,
    source: null,
  };

  if (deliveryDate) {
    const row = (await db.get(
      `SELECT price FROM orders WHERE crop_type = $1 AND delivery_date = $2 AND status = 'FILLED' AND filled_at IS NOT NULL
       ORDER BY filled_at DESC LIMIT 1`,
      [cropType, deliveryDate]
    )) as { price: number } | undefined;
    if (row) {
      result.lastFilledPrice = row.price;
      result.livePrice = row.price;
      result.source = 'last_trade';
      return result;
    }
  } else {
    const row = (await db.get(
      `SELECT price FROM orders WHERE crop_type = $1 AND status = 'FILLED' AND filled_at IS NOT NULL
       ORDER BY filled_at DESC LIMIT 1`,
      [cropType]
    )) as { price: number } | undefined;
    if (row) {
      result.lastFilledPrice = row.price;
      result.livePrice = row.price;
      result.source = 'last_trade';
      return result;
    }
  }

  const baseSql = `SELECT type, price FROM orders WHERE crop_type = $1 AND status = 'OPEN'`;
  const params: (string | undefined)[] = [cropType];
  if (deliveryDate) {
    params.push(deliveryDate);
  }
  const orders = (await (deliveryDate
    ? db.all(`${baseSql} AND delivery_date = $2`, params)
    : db.all(baseSql, params))) as { type: string; price: number }[];

  const bids = orders.filter((o) => o.type === 'BID').map((o) => o.price);
  const asks = orders.filter((o) => o.type === 'ASK').map((o) => o.price);
  const bestBid = bids.length ? Math.max(...bids) : null;
  const bestAsk = asks.length ? Math.min(...asks) : null;

  if (bestBid != null && bestAsk != null) {
    result.midPrice = Math.round(((bestBid + bestAsk) / 2) * 100) / 100;
    if (!result.livePrice) {
      result.livePrice = result.midPrice;
      result.source = 'mid';
    }
  }

  return result;
}

export interface PriceHistoryPoint {
  filled_at: string;
  price: number;
}

export async function getPriceHistory(cropType: string): Promise<PriceHistoryPoint[]> {
  const rows = (await db.all(
    `SELECT filled_at::text, price FROM orders
     WHERE crop_type = $1 AND status = 'FILLED' AND filled_at IS NOT NULL
     ORDER BY filled_at ASC`,
    [cropType]
  )) as { filled_at: string; price: number }[];
  return rows;
}
