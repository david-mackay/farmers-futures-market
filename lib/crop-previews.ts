import { Order, OrderType } from '@/shared/types';
import { formatDeliveryDate } from './format';

export interface CropPreview {
  crop_type: string;
  /** For farmers: highest bid price on the day with the most buy order volume */
  farmer: {
    delivery_date: string;
    delivery_label: string;
    price: number;
    volume_kg: number;
  } | null;
  /** For buyers: lowest ask price on the day with the most sell order volume */
  buyer: {
    delivery_date: string;
    delivery_label: string;
    price: number;
    volume_kg: number;
  } | null;
}

export function computeCropPreviews(orders: Order[]): CropPreview[] {
  const byCrop = new Map<string, { bids: Map<string, { price: number; qty: number }[]>; asks: Map<string, { price: number; qty: number }[]> }>();

  for (const o of orders) {
    if (!byCrop.has(o.crop_type)) {
      byCrop.set(o.crop_type, { bids: new Map(), asks: new Map() });
    }
    const crop = byCrop.get(o.crop_type)!;
    const qtyKg = o.quantity;
    const key = o.delivery_date;

    if (o.type === OrderType.BID) {
      if (!crop.bids.has(key)) crop.bids.set(key, []);
      crop.bids.get(key)!.push({ price: o.price, qty: qtyKg });
    } else {
      if (!crop.asks.has(key)) crop.asks.set(key, []);
      crop.asks.get(key)!.push({ price: o.price, qty: qtyKg });
    }
  }

  const result: CropPreview[] = [];

  for (const crop_type of byCrop.keys()) {
    const crop = byCrop.get(crop_type)!;

    let farmer: CropPreview['farmer'] = null;
    let bestBidDate: string | null = null;
    let maxBidVol = 0;
    for (const [date, arr] of crop.bids) {
      const vol = arr.reduce((s, x) => s + x.qty, 0);
      if (vol > maxBidVol) {
        maxBidVol = vol;
        bestBidDate = date;
      }
    }
    if (bestBidDate) {
      const arr = crop.bids.get(bestBidDate)!;
      const bestPrice = Math.max(...arr.map(x => x.price));
      farmer = {
        delivery_date: bestBidDate,
        delivery_label: formatDeliveryDate(bestBidDate),
        price: bestPrice,
        volume_kg: maxBidVol,
      };
    }

    let buyer: CropPreview['buyer'] = null;
    let bestAskDate: string | null = null;
    let maxAskVol = 0;
    for (const [date, arr] of crop.asks) {
      const vol = arr.reduce((s, x) => s + x.qty, 0);
      if (vol > maxAskVol) {
        maxAskVol = vol;
        bestAskDate = date;
      }
    }
    if (bestAskDate) {
      const arr = crop.asks.get(bestAskDate)!;
      const bestPrice = Math.min(...arr.map(x => x.price));
      buyer = {
        delivery_date: bestAskDate,
        delivery_label: formatDeliveryDate(bestAskDate),
        price: bestPrice,
        volume_kg: maxAskVol,
      };
    }

    result.push({ crop_type, farmer, buyer });
  }

  return result;
}
