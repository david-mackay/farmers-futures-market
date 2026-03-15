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

/** Jamaican crops from jamaican_crops.json (common_name in UPPER_SNAKE). */
export enum CropType {
  ACKEE = 'ACKEE',
  BANANA = 'BANANA',
  PLANTAIN = 'PLANTAIN',
  COFFEE = 'COFFEE',
  PIMENTO = 'PIMENTO',
  COCOA = 'COCOA',
  COCONUT = 'COCONUT',
  BREADFRUIT = 'BREADFRUIT',
  MANGO = 'MANGO',
  GUAVA = 'GUAVA',
  SOURSOP = 'SOURSOP',
  PAPAYA = 'PAPAYA',
  PINEAPPLE = 'PINEAPPLE',
  WATERMELON = 'WATERMELON',
  PUMPKIN = 'PUMPKIN',
  TOMATO = 'TOMATO',
  CALLALOO = 'CALLALOO',
  SWEET_POTATO = 'SWEET_POTATO',
  YAM = 'YAM',
  CASSAVA = 'CASSAVA',
  DASHEEN = 'DASHEEN',
  GINGER = 'GINGER',
  TURMERIC = 'TURMERIC',
  HOT_PEPPER_SCOTCH_BONNET = 'HOT_PEPPER_SCOTCH_BONNET',
  OKRA = 'OKRA',
  THYME = 'THYME',
  SCALLION = 'SCALLION',
  SORREL = 'SORREL',
  PEANUT = 'PEANUT',
  GUNGO_PEA = 'GUNGO_PEA',
}

export interface User {
  id: string;
  address: string;
  email?: string | null;
  display_name: string;
  role: UserRole;
  /** True if farmer, false if buyer (stored in DB as is_farmer). */
  is_farmer: boolean;
  is_verified: boolean;
  verification_submitted_at?: string | null;
  /** Delivery address for buyers (wholesale). */
  delivery_address?: string | null;
  /** Farmer: total acreage. */
  acreage?: number | null;
  /** Farmer: crop types produced (e.g. "WHEAT,CORN"). */
  crops_produced?: string | null;
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
  /** When buyer placed funds in escrow (dev: in-app action). */
  escrow_funded_at?: string | null;
  /** When seller attested delivery. */
  delivered_at?: string | null;
  /** When buyer contested delivery (dispute). */
  contested_at?: string | null;
  /** When funds were released to seller. */
  funds_released_at?: string | null;
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
