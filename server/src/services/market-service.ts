import db from '../db/connection';

export interface LastPriceResult {
  /** Price of the most recent filled order; null if none. */
  lastFilledPrice: number | null;
  /** Mid between best bid and best ask (open orders); null if either side missing. */
  midPrice: number | null;
  /** Live price to display: lastFilledPrice if set, else midPrice, else null. */
  livePrice: number | null;
  source: 'last_trade' | 'mid' | null;
}

/**
 * Get live price for a crop (and optional delivery date).
 * Uses last filled order price if any; otherwise mid of best bid and best ask.
 */
export function getLastPrice(cropType: string, deliveryDate?: string | null): LastPriceResult {
  const result: LastPriceResult = {
    lastFilledPrice: null,
    midPrice: null,
    livePrice: null,
    source: null,
  };

  if (deliveryDate) {
    const row = db
      .prepare(
        `SELECT price FROM orders WHERE crop_type = ? AND delivery_date = ? AND status = 'FILLED' AND filled_at IS NOT NULL
         ORDER BY filled_at DESC LIMIT 1`
      )
      .get(cropType, deliveryDate) as { price: number } | undefined;
    if (row) {
      result.lastFilledPrice = row.price;
      result.livePrice = row.price;
      result.source = 'last_trade';
      return result;
    }
  } else {
    const row = db
      .prepare(
        `SELECT price FROM orders WHERE crop_type = ? AND status = 'FILLED' AND filled_at IS NOT NULL
         ORDER BY filled_at DESC LIMIT 1`
      )
      .get(cropType) as { price: number } | undefined;
    if (row) {
      result.lastFilledPrice = row.price;
      result.livePrice = row.price;
      result.source = 'last_trade';
      return result;
    }
  }

  const baseSql = `SELECT type, price FROM orders WHERE crop_type = ? AND status = 'OPEN'`;
  const params: (string | undefined)[] = [cropType];
  if (deliveryDate) {
    params.push(deliveryDate);
  }
  const orders = db
    .prepare(
      deliveryDate
        ? `${baseSql} AND delivery_date = ?`
        : baseSql
    )
    .all(...params) as { type: string; price: number }[];

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
