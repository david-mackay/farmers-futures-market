import { CropType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT, LOT_SIZE } from '@/shared/constants';

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatQuantity(quantity: number, cropType?: CropType): string {
  if (cropType) {
    return `${quantity.toLocaleString()} ${CROP_UNIT[cropType]}`;
  }
  return quantity.toLocaleString();
}

export function formatLots(lots: number): string {
  return `${lots} lot${lots !== 1 ? 's' : ''}`;
}

export function formatLotsWithUnits(lots: number, cropType: CropType): string {
  const totalUnits = lots * LOT_SIZE;
  return `${lots} lot${lots !== 1 ? 's' : ''} (${totalUnits.toLocaleString()} ${CROP_UNIT[cropType]})`;
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

export function cropLabel(cropType: CropType): string {
  return CROP_LABELS[cropType] || cropType;
}

export function formatRevenue(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}
