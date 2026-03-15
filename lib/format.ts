import { CropType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT, CONTRACT_DELIVERY_DAYS, JMD_PER_USD } from '@/shared/constants';

export type DisplayCurrency = 'JMD' | 'USD';

let _displayCurrency: DisplayCurrency = 'JMD';

export function getDisplayCurrency(): DisplayCurrency {
  return _displayCurrency;
}

export function setDisplayCurrency(c: DisplayCurrency): void {
  _displayCurrency = c;
}

function getSymbol(): string {
  return _displayCurrency === 'USD' ? '$' : 'J$';
}

function toDisplayAmount(jmd: number): number {
  return _displayCurrency === 'USD' ? jmd / JMD_PER_USD : jmd;
}

/** Price is always per kg (stored in JMD). Display in selected currency. */
export function formatPrice(price: number): string {
  const amount = toDisplayAmount(price);
  return `${getSymbol()}${amount.toFixed(2)}`;
}

export function formatPricePerKg(price: number): string {
  return `${formatPrice(price)}/kg`;
}

/** Label for price per kg in current display currency (e.g. "J$/kg" or "$/kg"). */
export function getPricePerKgLabel(): string {
  return `${getSymbol()}/kg`;
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

/** Return YYYY-MM-DD for the next N contract delivery days (from CONTRACT_DELIVERY_DAYS). Includes today if today is a contract day. */
export function getNextContractDays(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const set = new Set(CONTRACT_DELIVERY_DAYS);
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

/** @deprecated Use getNextContractDays. */
export function getNextMondays(count: number): string[] {
  return getNextContractDays(count);
}

/** Check if a date string (YYYY-MM-DD) is a contract delivery day. */
export function isContractDay(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return CONTRACT_DELIVERY_DAYS.includes(d.getDay());
}

/** @deprecated Use isContractDay. */
export function isMonday(dateStr: string): boolean {
  return isContractDay(dateStr);
}

/** Among contract-day dates with at least one order, return the one closest to today (>= today). If none, return next contract day. */
export function getDefaultDeliveryDate(orders: { delivery_date: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const validWithOrders = [...new Set(orders.map((o) => o.delivery_date).filter(isContractDay))].filter((d) => d >= today).sort();
  if (validWithOrders.length > 0) return validWithOrders[0];
  return getNextContractDays(1)[0];
}

export function cropLabel(cropType: CropType): string {
  return CROP_LABELS[cropType] || cropType;
}

export function formatRevenue(amount: number): string {
  const sym = getSymbol();
  const a = toDisplayAmount(amount);
  if (a >= 1000000) return `${sym}${(a / 1000000).toFixed(1)}M`;
  if (a >= 1000) return `${sym}${(a / 1000).toFixed(1)}K`;
  return `${sym}${a.toFixed(2)}`;
}
