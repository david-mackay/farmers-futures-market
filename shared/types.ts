export enum OrderType {
  BID = 'BID',
  ASK = 'ASK',
}

export enum OrderStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  FARMER = 'FARMER',
  TRADER = 'TRADER',
}

export enum CropType {
  WHEAT = 'WHEAT',
  CORN = 'CORN',
  SOYBEANS = 'SOYBEANS',
  RICE = 'RICE',
  TOMATOES = 'TOMATOES',
  POTATOES = 'POTATOES',
  LETTUCE = 'LETTUCE',
  STRAWBERRIES = 'STRAWBERRIES',
}

export interface User {
  id: string;
  address: string;
  display_name: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  creator_id: string;
  crop_type: CropType;
  type: OrderType;
  price: number;
  quantity: number;
  delivery_date: string;
  status: OrderStatus;
  filled_by?: string;
  filled_at?: string;
  created_at: string;
}

export interface FutureVoucher {
  id: string;
  original_order_id: string;
  owner_id: string;
  crop_type: CropType;
  quantity: number;
  delivery_date: string;
  purchase_price: number;
  listed_price?: number;
  is_listed: boolean;
  created_at: string;
}

export interface CreateOrderRequest {
  crop_type: CropType;
  type: OrderType;
  price: number;
  quantity: number;
  delivery_date: string;
}

export interface FillOrderRequest {
  order_id: string;
}

export interface ListVoucherRequest {
  voucher_id: string;
  listed_price: number;
}

export interface HeatMapCell {
  crop_type: CropType;
  delivery_month: string;
  total_bid_quantity: number;
  total_ask_quantity: number;
  gap: number;
  avg_bid_price: number;
  avg_ask_price: number;
}

export interface PlantRecommendation {
  crop_type: CropType;
  total_demand: number;
  avg_bid_price: number;
  projected_revenue_per_acre: number;
  yield_per_acre: number;
  demand_supply_ratio: number;
}

export interface HedgeFlowCalculation {
  crop_type: CropType;
  acreage: number;
  expected_yield: number;
  recommended_price: number;
  projected_revenue: number;
}

export interface ServerToClientEvents {
  'order:created': (order: Order) => void;
  'order:filled': (order: Order) => void;
  'order:cancelled': (order: Order) => void;
  'voucher:listed': (voucher: FutureVoucher) => void;
  'voucher:sold': (voucher: FutureVoucher) => void;
}

export interface ClientToServerEvents {
  'subscribe:orderbook': (filters?: { crop_type?: CropType; delivery_date?: string }) => void;
  'unsubscribe:orderbook': () => void;
}
