import { Order, OrderType } from '@/shared/types';

/**
 * For a filled order, the seller is:
 * - ASK: creator (farmer who listed the sell order)
 * - BID: filled_by (person who sold into the buy order)
 */
export function isSeller(order: Order, userId: string): boolean {
  if (order.type === OrderType.ASK) return order.creator_id === userId;
  return order.filled_by === userId;
}

/**
 * For a filled order, the buyer is:
 * - ASK: filled_by (person who bought)
 * - BID: creator (person who placed the buy order)
 */
export function isBuyer(order: Order, userId: string): boolean {
  if (order.type === OrderType.ASK) return order.filled_by === userId;
  return order.creator_id === userId;
}
