import { CropType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT } from '@/shared/constants';

const CURRENCY_SYMBOL = 'J$';

/** Price is always per kg. Use for display and sorting. */
export function formatPrice(price: number): string {
  return `${CURRENCY_SYMBOL}${price.toFixed(2)}`;
}

export function formatPricePerKg(price: number): string {
  return `${formatPrice(price)}/kg`;
}

export function formatQuantity(quantity: number, cropType?: CropType): string {
  if (cropType) {
    return `${quantity.toLocaleString()} ${CROP_UNIT[cropType]}`;
  }
  return quantity.toLocaleString();
}

/** Quantity in kg for order display. */
export function formatKg(kg: number): string {
  return `${kg.toLocaleString()} kg`;
}

/** Legacy alias: quantity is now stored in kg. */
export function formatLotsWithUnits(kg: number, _cropType?: CropType): string {
  return formatKg(kg);
}

/** Legacy alias for order quantity (kg). */
export function formatLots(kg: number): string {
  return formatKg(kg);
}

export function formatDeliveryDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDeliveryMonth(month: string): string {
  const [year, m] = month.split('-');
  const d = new Date(parseInt(year), parseInt(m) - 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getDeliveryMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [{ value: '', label: 'All dates' }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: formatDeliveryMonth(value) });
  }
  return options;
}

/** All contracts end on a Monday. Return YYYY-MM-DD for the next N Mondays (including today if today is Monday). */
export function getNextMondays(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(today);
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  for (let i = 0; i < count; i++) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** Check if a date string (YYYY-MM-DD) is a Monday. */
export function isMonday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 1;
}

/** Among Monday dates with at least one order, return the one closest to today (>= today). If none, return next Monday. */
export function getDefaultDeliveryDate(orders: { delivery_date: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const mondaysWithOrders = [...new Set(orders.map((o) => o.delivery_date).filter(isMonday))].filter((d) => d >= today).sort();
  if (mondaysWithOrders.length > 0) return mondaysWithOrders[0];
  return getNextMondays(1)[0];
}

export function cropLabel(cropType: CropType): string {
  return CROP_LABELS[cropType] || cropType;
}

export function formatRevenue(amount: number): string {
  if (amount >= 1000000) return `${CURRENCY_SYMBOL}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(1)}K`;
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}
