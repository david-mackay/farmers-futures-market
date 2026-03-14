import { CROPS, type CropDatasetEntry } from '@/server/src/db/crops';

export type CropEncyclopediaEntry = CropDatasetEntry;

export const CROP_ENCYCLOPEDIA: CropEncyclopediaEntry[] = CROPS;

const PLURAL_ALIASES: Record<string, string> = {
  tomatoes: 'tomato',
};

function normalizeCropName(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toVariants(value: string) {
  const normalized = normalizeCropName(value);
  const variants = new Set<string>([normalized]);

  if (PLURAL_ALIASES[normalized]) {
    variants.add(PLURAL_ALIASES[normalized]);
  }

  if (normalized.endsWith('ies')) {
    variants.add(`${normalized.slice(0, -3)}y`);
  }
  if (normalized.endsWith('oes')) {
    variants.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith('es')) {
    variants.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith('s')) {
    variants.add(normalized.slice(0, -1));
  }

  return [...variants].filter(Boolean);
}

export function getCropSlug(crop: Pick<CropEncyclopediaEntry, 'common_name'>) {
  return crop.common_name.replace(/_/g, '-');
}

export function getCropHref(crop: Pick<CropEncyclopediaEntry, 'common_name'>) {
  return `/crops/${getCropSlug(crop)}`;
}

export function findCropBySlug(slug: string) {
  return CROP_ENCYCLOPEDIA.find((crop) => getCropSlug(crop) === slug) ?? null;
}

export function findCropByName(name: string) {
  const variants = toVariants(name);
  return (
    CROP_ENCYCLOPEDIA.find((crop) => {
      const keys = [
        crop.display_name,
        crop.common_name,
        crop.common_name.replace(/_/g, ' '),
        crop.scientific_name,
      ].map(normalizeCropName);

      return variants.some((variant) => keys.includes(variant));
    }) ?? null
  );
}

export function getCropHrefByName(name: string) {
  const crop = findCropByName(name);
  return crop ? getCropHref(crop) : null;
}

export function formatCropLabel(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
