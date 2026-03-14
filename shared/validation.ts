import { z } from 'zod';
import { CropType, OrderType } from './types';

export const createOrderSchema = z.object({
  crop_type: z.nativeEnum(CropType),
  type: z.nativeEnum(OrderType),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const fillOrderSchema = z.object({
  order_id: z.string(),
});

export const listVoucherSchema = z.object({
  voucher_id: z.string(),
  listed_price: z.number().positive(),
});

export const createUserSchema = z.object({
  address: z.string().min(1),
  display_name: z.string().min(1).max(100),
  role: z.enum(['FARMER', 'TRADER']),
});

export const updateUserSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  role: z.enum(['FARMER', 'TRADER']).optional(),
  is_verified: z.boolean().optional(),
  delivery_address: z.string().max(500).nullable().optional(),
  acreage: z.number().nonnegative().nullable().optional(),
  crops_produced: z.string().max(500).nullable().optional(),
});
