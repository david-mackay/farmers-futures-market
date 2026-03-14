'use client';

import { CropType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useWatchedCropsContext } from '@/contexts/watched-crops-context';

export function useWatchedCrops() {
  return useWatchedCropsContext();
}

export const ALL_CROPS = Object.values(CropType) as CropType[];

export function searchCrops(query: string): CropType[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_CROPS;
  return ALL_CROPS.filter((c) => CROP_LABELS[c].toLowerCase().includes(q));
}
