import { CropType } from './types';

export const CROP_YIELD_PER_ACRE: Record<CropType, number> = {
  [CropType.WHEAT]: 50,
  [CropType.CORN]: 180,
  [CropType.SOYBEANS]: 50,
  [CropType.RICE]: 80,
  [CropType.TOMATOES]: 1500,
  [CropType.POTATOES]: 400,
  [CropType.LETTUCE]: 800,
  [CropType.STRAWBERRIES]: 600,
};

export const CROP_UNIT: Record<CropType, string> = {
  [CropType.WHEAT]: 'bu',
  [CropType.CORN]: 'bu',
  [CropType.SOYBEANS]: 'bu',
  [CropType.RICE]: 'bu',
  [CropType.TOMATOES]: 'lb',
  [CropType.POTATOES]: 'cwt',
  [CropType.LETTUCE]: 'head',
  [CropType.STRAWBERRIES]: 'lb',
};

export const CROP_LABELS: Record<CropType, string> = {
  [CropType.WHEAT]: 'Wheat',
  [CropType.CORN]: 'Corn',
  [CropType.SOYBEANS]: 'Soybeans',
  [CropType.RICE]: 'Rice',
  [CropType.TOMATOES]: 'Tomatoes',
  [CropType.POTATOES]: 'Potatoes',
  [CropType.LETTUCE]: 'Lettuce',
  [CropType.STRAWBERRIES]: 'Strawberries',
};

export const CROP_EMOJI: Record<CropType, string> = {
  [CropType.WHEAT]: '',
  [CropType.CORN]: '',
  [CropType.SOYBEANS]: '',
  [CropType.RICE]: '',
  [CropType.TOMATOES]: '',
  [CropType.POTATOES]: '',
  [CropType.LETTUCE]: '',
  [CropType.STRAWBERRIES]: '',
};

// Every contract is a standardized lot of 100 units
export const LOT_SIZE = 100;
