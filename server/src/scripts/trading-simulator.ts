/**
 * Trading simulator: creates and fills BANANA orders every 0.5s via the HTTP API
 * so that socket events (order:created, order:filled) are emitted and the UI updates live.
 * Run separately: npm run sim (from repo root). Requires the server to be running.
 */

import { CONTRACT_DELIVERY_DAYS } from '../shared/constants';
import db from "../db/connection";
import * as userService from "../services/user-service";
import { OrderType } from '../shared/types';

const CROP = "BANANA";
const SIM_FARMER_ID = "sim-farmer-banana";
const SIM_BUYER_ID = "sim-buyer-banana";
const SIM_FARMER_ADDRESS = "0xsim00000000000000000000000000000000000001";
const SIM_BUYER_ADDRESS = "0xsim00000000000000000000000000000000000002";

const API_BASE =
  process.env.API_URL || process.env.SIM_API_URL || "http://localhost:3001";

const BASE_PRICE = 160;
const PRICE_SPREAD = 40;
const MIN_QTY = 80;
const MAX_QTY = 400;
const INTERVAL_MS = 500;

function getNextContractDays(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const set = new Set(CONTRACT_DELIVERY_DAYS);
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = 0; i < 365 && out.length < count; i++) {
    if (set.has(d.getDay())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      if (dateStr >= todayStr) out.push(dateStr);
    }
    d.setDate(d.getDate() + 1);
  }
  return out.slice(0, count);
}

function ensureSimUsers(): void {
  if (!userService.getUserById(SIM_FARMER_ID)) {
    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, 'Sim Farmer', 'FARMER', 1, 1, datetime('now'))`,
    ).run(SIM_FARMER_ID, SIM_FARMER_ADDRESS);
    console.log("[sim] Created sim farmer", SIM_FARMER_ID);
  }
  if (!userService.getUserById(SIM_BUYER_ID)) {
    db.prepare(
      `INSERT INTO users (id, address, email, display_name, role, is_farmer, is_verified, created_at)
       VALUES (?, ?, NULL, 'Sim Buyer', 'TRADER', 0, 0, datetime('now'))`,
    ).run(SIM_BUYER_ID, SIM_BUYER_ADDRESS);
    console.log("[sim] Created sim buyer", SIM_BUYER_ID);
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function apiCreate(
  deliveryDate: string,
  side: OrderType,
): Promise<boolean> {
  const price = BASE_PRICE + randomInt(-PRICE_SPREAD / 2, PRICE_SPREAD / 2);
  const quantity = randomInt(MIN_QTY, MAX_QTY);
  const userId = side === OrderType.BID ? SIM_BUYER_ID : SIM_FARMER_ID;
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: JSON.stringify({
      crop_type: CROP,
      type: side,
      price,
      quantity,
      delivery_date: deliveryDate,
    }),
  });
  if (!res.ok) return false;
  console.log("[sim] Created", side, price, "J$/kg", quantity, "kg");
  return true;
}

async function apiFill(orderId: string, _side: OrderType): Promise<boolean> {
  const userId = _side === OrderType.BID ? SIM_FARMER_ID : SIM_BUYER_ID;
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/fill`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as {
    order?: { price: number; quantity: number };
  };
  console.log(
    "[sim] Filled",
    _side,
    data.order?.price,
    "J$/kg",
    data.order?.quantity,
    "kg",
  );
  return true;
}

async function getOpenOrders(
  deliveryDate: string,
  type: OrderType,
): Promise<{ id: string; creator_id: string; price: number }[]> {
  const res = await fetch(
    `${API_BASE}/api/orders?crop_type=${CROP}&delivery_date=${deliveryDate}&status=OPEN&type=${type}`,
  );
  if (!res.ok) return [];
  const orders = (await res.json()) as {
    id: string;
    creator_id: string;
    price: number;
  }[];
  return orders.map((o) => ({
    id: o.id,
    creator_id: o.creator_id,
    price: o.price,
  }));
}

/** Capture profit when book is crossed (best bid > best ask): fill best bid and best ask until spread closes. */
async function tryCaptureProfit(deliveryDate: string): Promise<boolean> {
  let bids = await getOpenOrders(deliveryDate, OrderType.BID);
  let asks = await getOpenOrders(deliveryDate, OrderType.ASK);
  let didFill = false;

  while (bids.length > 0 && asks.length > 0) {
    const bestBid = bids.reduce((best, o) => (o.price > best.price ? o : best));
    const bestAsk = asks.reduce((best, o) => (o.price < best.price ? o : best));
    if (bestBid.price <= bestAsk.price) break;

    await apiFill(bestBid.id, OrderType.BID);
    await apiFill(bestAsk.id, OrderType.ASK);
    didFill = true;
    bids = await getOpenOrders(deliveryDate, OrderType.BID);
    asks = await getOpenOrders(deliveryDate, OrderType.ASK);
  }

  return didFill;
}

async function tick(deliveryDate: string): Promise<void> {
  if (await tryCaptureProfit(deliveryDate)) return;

  const doCreate = Math.random() < 0.5;
  const side = Math.random() < 0.5 ? OrderType.BID : OrderType.ASK;

  if (doCreate) {
    await apiCreate(deliveryDate, side);
    return;
  }

  const fillable = await getOpenOrders(deliveryDate, side);
  // Sim can fill its own (other sim user’s) orders. Pick best price: sell into highest BID, buy lowest ASK.
  if (fillable.length === 0) {
    await apiCreate(deliveryDate, side);
    return;
  }

  const order =
    side === OrderType.BID
      ? fillable.reduce((best, o) => (o.price > best.price ? o : best))
      : fillable.reduce((best, o) => (o.price < best.price ? o : best));
  await apiFill(order.id, side);
}

function run(): void {
  ensureSimUsers();
  const dates = getNextContractDays(1);
  const deliveryDate = dates[0];
  if (!deliveryDate) {
    console.error("[sim] No contract delivery date found");
    process.exit(1);
  }
  console.log(
    "[sim] BANANA market simulator started, delivery",
    deliveryDate,
    "every",
    INTERVAL_MS,
    "ms",
  );
  console.log(
    "[sim] Using API",
    API_BASE,
    "- server must be running for socket events",
  );
  setInterval(() => tick(deliveryDate), INTERVAL_MS);
}

run();
