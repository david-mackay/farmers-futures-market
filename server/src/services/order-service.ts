import db, { type Tx } from "../db/connection";
import { v4 as uuid } from "uuid";
import {
  Order,
  OrderType,
  OrderStatus,
  FutureVoucher,
  UserRole,
} from "../shared/types";
import { getUserById } from "./user-service";
import { JMD_PER_USD } from "../shared/constants";
import { sendUsdcFromEscrow, buildUsdcTransferForBuyer } from "../solana/usdc";
import { getEscrowKeypair, getUsdcMint } from "../solana/config";
import { verifyUsdcTransfer } from "../solana/usdc";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    creator_id: row.creator_id as string,
    crop_type: row.crop_type as Order["crop_type"],
    type: row.type as OrderType,
    price: row.price as number,
    quantity: row.quantity as number,
    delivery_date: row.delivery_date as string,
    status: row.status as OrderStatus,
    filled_by: (row.filled_by as string) || undefined,
    filled_at: (row.filled_at as string) || undefined,
    escrow_funded_at: (row.escrow_funded_at as string) ?? undefined,
    delivered_at: (row.delivered_at as string) ?? undefined,
    contested_at: (row.contested_at as string) ?? undefined,
    funds_released_at: (row.funds_released_at as string) ?? undefined,
    refunded_at: (row.refunded_at as string) ?? undefined,
    total_amount_usdc: (row.total_amount_usdc as number) ?? undefined,
    relist_source_order_id:
      (row.relist_source_order_id as string | null) ?? undefined,
    created_at: row.created_at as string,
  };
}

function getBuyerId(order: Order): string {
  return order.type === OrderType.ASK ? order.filled_by! : order.creator_id;
}

function getSellerId(order: Order): string {
  return order.type === OrderType.ASK ? order.creator_id : order.filled_by!;
}

type ContractSide = "BUYER" | "SELLER";

function getCurrentHolderId(order: Order, side: ContractSide): string {
  return side === "BUYER" ? getBuyerId(order) : getSellerId(order);
}

function getTransferSideForRelistOrder(orderType: OrderType): ContractSide {
  return orderType === OrderType.ASK ? "BUYER" : "SELLER";
}

async function transferContractSideHolder(
  sourceOrder: Order,
  side: ContractSide,
  nextHolderUserId: string,
): Promise<void> {
  await transferContractSideHolderWithExecutor(
    {
      run: (sql: string, params: unknown[] = []) => db.run(sql, params),
    },
    sourceOrder,
    side,
    nextHolderUserId,
  );
}

async function transferContractSideHolderWithExecutor(
  executor: Pick<Tx, "run">,
  sourceOrder: Order,
  side: ContractSide,
  nextHolderUserId: string,
): Promise<void> {
  if (side === "BUYER") {
    if (sourceOrder.type === OrderType.ASK) {
      await executor.run("UPDATE orders SET filled_by = $1 WHERE id = $2", [
        nextHolderUserId,
        sourceOrder.id,
      ]);
      return;
    }
    await executor.run("UPDATE orders SET creator_id = $1 WHERE id = $2", [
      nextHolderUserId,
      sourceOrder.id,
    ]);
    return;
  }

  if (sourceOrder.type === OrderType.ASK) {
    await executor.run("UPDATE orders SET creator_id = $1 WHERE id = $2", [
      nextHolderUserId,
      sourceOrder.id,
    ]);
    return;
  }
  await executor.run("UPDATE orders SET filled_by = $1 WHERE id = $2", [
    nextHolderUserId,
    sourceOrder.id,
  ]);
}

async function getLockedOrderById(
  tx: Tx,
  id: string,
): Promise<Order | undefined> {
  const row = await tx.get("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id]);
  return row ? rowToOrder(row as Record<string, unknown>) : undefined;
}

async function createVoucherForPrimaryAskFill(
  order: Order,
  ownerId: string,
): Promise<FutureVoucher | undefined> {
  if (order.type !== OrderType.ASK || order.relist_source_order_id) return undefined;

  const existing = await db.get(
    "SELECT * FROM vouchers WHERE original_order_id = $1 LIMIT 1",
    [order.id],
  );
  if (existing) {
    return rowToVoucher(existing as Record<string, unknown>);
  }

  const voucherId = uuid();
  await db.run(
    "INSERT INTO vouchers (id, original_order_id, owner_id, crop_type, quantity, delivery_date, purchase_price, is_listed) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)",
    [
      voucherId,
      order.id,
      ownerId,
      order.crop_type,
      order.quantity,
      order.delivery_date,
      order.price,
    ],
  );
  return getVoucherById(voucherId);
}

async function validateRelistSourceOrder(args: {
  sourceOrderId: string;
  creatorId: string;
  relistType: OrderType;
  cropType: string;
  deliveryDate: string;
  quantity: number;
}): Promise<{ sourceOrder?: Order; error?: string }> {
  const source = await getOrderById(args.sourceOrderId);
  if (!source) return { error: "Relist source contract not found" };
  if (source.status !== OrderStatus.FILLED)
    return { error: "Relist source must be a filled contract" };
  if (source.funds_released_at || source.refunded_at)
    return { error: "Relist source contract is already settled" };
  if (
    source.crop_type !== args.cropType ||
    source.delivery_date !== args.deliveryDate ||
    source.quantity !== args.quantity
  ) {
    return {
      error:
        "Relist order must match source contract crop, date, and quantity exactly",
    };
  }
  const transferSide = getTransferSideForRelistOrder(args.relistType);
  const currentHolderId = getCurrentHolderId(source, transferSide);
  if (currentHolderId !== args.creatorId) {
    return { error: "You do not currently hold that contract side to relist" };
  }
  if (transferSide === "BUYER" && !source.escrow_funded_at) {
    return {
      error:
        "Buyer-side relists are only allowed after the source contract escrow is funded",
    };
  }
  return { sourceOrder: source };
}

async function releaseFundsToSeller(
  orderId: string,
  amountSmallestUnit: number,
): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order || order.funds_released_at || order.refunded_at) return;
  const seller = await getUserById(getSellerId(order));
  if (!seller?.address) return;
  await sendUsdcFromEscrow({
    recipientWallet: seller.address,
    amountSmallestUnit,
  });
  const now = new Date().toISOString();
  await db.run("UPDATE orders SET funds_released_at = $1 WHERE id = $2", [
    now,
    orderId,
  ]);
}

/** If order is delivered and 1 day passed with no contest, trigger async release. */
async function applyAutoRelease(order: Order): Promise<Order> {
  if (
    order.status !== OrderStatus.FILLED ||
    !order.delivered_at ||
    order.contested_at ||
    order.funds_released_at ||
    order.refunded_at
  ) {
    return order;
  }
  const delivered = new Date(order.delivered_at).getTime();
  if (Date.now() - delivered < ONE_DAY_MS) return order;
  const amount =
    order.total_amount_usdc ??
    Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
  if (amount <= 0) return order;
  const seller = await getUserById(getSellerId(order));
  if (!seller?.address) return order;
  setImmediate(() =>
    releaseFundsToSeller(order.id, amount).catch((err) =>
      console.error("Auto-release failed", order.id, err),
    ),
  );
  return order;
}

function rowToVoucher(row: Record<string, unknown>): FutureVoucher {
  return {
    ...row,
    is_listed: !!(row.is_listed as number),
    listed_price: (row.listed_price as number) || undefined,
  } as FutureVoucher;
}

export interface OrderFilters {
  crop_type?: string;
  type?: string;
  status?: string;
  delivery_date?: string;
  delivery_month?: string;
  creator_id?: string;
  filled_by?: string;
}

export async function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  let sql = "SELECT * FROM orders WHERE 1=1";
  const params: unknown[] = [];
  let i = 0;
  const $ = () => `$${++i}`;
  if (filters.crop_type) {
    sql += ` AND crop_type = ${$()}`;
    params.push(filters.crop_type);
  }
  if (filters.type) {
    sql += ` AND type = ${$()}`;
    params.push(filters.type);
  }
  if (filters.status) {
    sql += ` AND status = ${$()}`;
    params.push(filters.status);
  }
  if (filters.delivery_date) {
    sql += ` AND delivery_date = ${$()}`;
    params.push(filters.delivery_date);
  }
  if (filters.delivery_month) {
    sql += ` AND LEFT(delivery_date, 7) = ${$()}`;
    params.push(filters.delivery_month);
  }
  if (filters.creator_id) {
    sql += ` AND creator_id = ${$()}`;
    params.push(filters.creator_id);
  }
  if (filters.filled_by) {
    sql += ` AND filled_by = ${$()}`;
    params.push(filters.filled_by);
  }
  sql += " ORDER BY created_at DESC";
  const rows = (await db.all(sql, params)) as Record<string, unknown>[];
  const orders = rows.map(rowToOrder);
  const result: Order[] = [];
  for (const o of orders) {
    result.push(await applyAutoRelease(o));
  }
  return result;
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const row = await db.get("SELECT * FROM orders WHERE id = $1", [id]);
  if (!row) return undefined;
  const order = rowToOrder(row as Record<string, unknown>);
  return applyAutoRelease(order);
}

export async function createOrder(
  creatorId: string,
  data: {
    crop_type: string;
    type: string;
    price: number;
    quantity: number;
    delivery_date: string;
    relist_source_order_id?: string;
  },
): Promise<{ order?: Order; error?: string }> {
  const user = await getUserById(creatorId);
  if (!user) return { error: "User not found" };

  const relistType = data.type as OrderType;
  if (
    data.relist_source_order_id &&
    relistType !== OrderType.ASK &&
    relistType !== OrderType.BID
  ) {
    return { error: "Invalid relist order type" };
  }

  if (data.type === OrderType.BID) {
    return {
      error:
        "Buy orders require a USDC deposit. Use the prepare-bid flow (wallet will sign and send USDC to escrow).",
    };
  }

  if (data.type === OrderType.ASK) {
    let relistValidated = false;
    if (data.relist_source_order_id) {
      const validation = await validateRelistSourceOrder({
        sourceOrderId: data.relist_source_order_id,
        creatorId,
        relistType: OrderType.ASK,
        cropType: data.crop_type,
        deliveryDate: data.delivery_date,
        quantity: data.quantity,
      });
      if (validation.error) return { error: validation.error };
      relistValidated = true;
    }

    if (!relistValidated) {
      if (user.role !== UserRole.FARMER)
        return { error: "Only farmers can create sell orders" };
      if (!user.is_verified)
        return { error: "Farmer must be verified to create sell orders" };
    }
  }

  if (data.type === OrderType.BID && data.relist_source_order_id) {
    const validation = await validateRelistSourceOrder({
      sourceOrderId: data.relist_source_order_id,
      creatorId,
      relistType: OrderType.BID,
      cropType: data.crop_type,
      deliveryDate: data.delivery_date,
      quantity: data.quantity,
    });
    if (validation.error) return { error: validation.error };
  }

  if (data.relist_source_order_id) {
    const existingOpenRelist = await db.get(
      "SELECT id FROM orders WHERE creator_id = $1 AND status = $2 AND relist_source_order_id = $3",
      [creatorId, OrderStatus.OPEN, data.relist_source_order_id]
    );
    if (existingOpenRelist) {
      return {
        error:
          "You already have an open relist for this contract. Cancel it in your profile before relisting again.",
      };
    }
  }

  const id = uuid();
  await db.run(
    "INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status, relist_source_order_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [
      id,
      creatorId,
      data.crop_type,
      data.type,
      data.price,
      data.quantity,
      data.delivery_date,
      OrderStatus.OPEN,
      data.relist_source_order_id ?? null,
    ],
  );
  return { order: await getOrderById(id)! };
}

/**
 * Prepare a BID order: return orderId and serialized USDC transfer tx.
 * Caller signs and sends the tx, then calls confirmBidOrder with the signature.
 */
export async function prepareBidOrder(
  creatorId: string,
  data: {
    crop_type: string;
    price: number;
    quantity: number;
    delivery_date: string;
    relist_source_order_id?: string;
  },
  creatorWallet: string,
): Promise<{
  orderId?: string;
  serializedTransaction?: string;
  amountUsdc?: number;
  escrowAddress?: string;
  usdcMint?: string;
  error?: string;
}> {
  const user = await getUserById(creatorId);
  if (!user) return { error: "User not found" };

  if (data.relist_source_order_id) {
    const validation = await validateRelistSourceOrder({
      sourceOrderId: data.relist_source_order_id,
      creatorId,
      relistType: OrderType.BID,
      cropType: data.crop_type,
      deliveryDate: data.delivery_date,
      quantity: data.quantity,
    });
    if (validation.error) return { error: validation.error };
  }

  const amountUsdc = Math.round(
    (data.price / JMD_PER_USD) * data.quantity * 1e6,
  );
  if (amountUsdc <= 0) return { error: "Invalid order amount" };

  try {
    const orderId = uuid();
    const escrow = getEscrowKeypair();
    const serializedTransaction = await buildUsdcTransferForBuyer({
      buyerWallet: creatorWallet,
      amountSmallestUnit: amountUsdc,
    });
    return {
      orderId,
      serializedTransaction,
      amountUsdc,
      escrowAddress: escrow.publicKey.toBase58(),
      usdcMint: getUsdcMint(),
    };
  } catch (e) {
    console.error("prepareBidOrder: failed to build tx", e);
    return { error: "Escrow not configured or transaction build failed" };
  }
}

/**
 * Confirm BID order after creator has sent USDC to escrow: verify tx and insert order.
 */
export async function confirmBidOrder(
  creatorId: string,
  data: {
    orderId: string;
    txSignature: string;
    crop_type: string;
    price: number;
    quantity: number;
    delivery_date: string;
    relist_source_order_id?: string;
  },
): Promise<{ order?: Order; error?: string }> {
  const user = await getUserById(creatorId);
  if (!user) return { error: "User not found" };
  if (!user.address) return { error: "Wallet address not found" };

  const amountUsdc = Math.round(
    (data.price / JMD_PER_USD) * data.quantity * 1e6,
  );
  if (amountUsdc <= 0) return { error: "Invalid order amount" };

  const verification = await verifyUsdcTransfer({
    txSignature: data.txSignature,
    expectedFromWallet: user.address,
    expectedAmountUsdc: amountUsdc,
  });
  if (!verification.verified) {
    return {
      error:
        "Payment verification failed. Ensure the transaction succeeded and try again.",
    };
  }

  const existing = await getOrderById(data.orderId);
  if (existing) return { error: "Order already created" };

  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO orders (id, creator_id, crop_type, type, price, quantity, delivery_date, status, total_amount_usdc, escrow_funded_at, relist_source_order_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      data.orderId,
      creatorId,
      data.crop_type,
      OrderType.BID,
      data.price,
      data.quantity,
      data.delivery_date,
      OrderStatus.OPEN,
      amountUsdc,
      now,
      data.relist_source_order_id ?? null,
    ],
  );
  return { order: (await getOrderById(data.orderId))! };
}

const PENDING_FILL_EXPIRY_MS = 5 * 60 * 1000;

export async function initiateFillForPayment(
  userId: string,
  orderId: string,
  buyerWallet: string,
): Promise<{
  escrowAddress?: string;
  amountUsdc?: number;
  usdcMint?: string;
  serializedTransaction?: string;
  error?: string;
}> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.OPEN) return { error: "Order is not open" };
  if (order.creator_id === userId)
    return { error: "Cannot fill your own order" };

  const amountUsdc = Math.round(
    (order.price / JMD_PER_USD) * order.quantity * 1e6,
  );
  if (amountUsdc <= 0) return { error: "Invalid order amount" };

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PENDING_FILL_EXPIRY_MS).toISOString();
  const result = await db.run(
    `UPDATE orders SET pending_fill_by = $1, pending_fill_expires_at = $2
     WHERE id = $3 AND status = 'OPEN' AND (pending_fill_by IS NULL OR pending_fill_expires_at < $4)`,
    [userId, expiresAt, orderId, now],
  );
  if (result.changes === 0) {
    const current = (await db.get(
      "SELECT pending_fill_by, pending_fill_expires_at FROM orders WHERE id = $1",
      [orderId],
    )) as
      | {
          pending_fill_by: string | null;
          pending_fill_expires_at: string | null;
        }
      | undefined;
    if (
      current?.pending_fill_by &&
      current.pending_fill_expires_at &&
      current.pending_fill_expires_at >= now
    ) {
      return {
        error: "Order is reserved by another buyer. Try again shortly.",
      };
    }
    return { error: "Order is no longer available" };
  }

  try {
    const escrow = getEscrowKeypair();
    const serializedTransaction = await buildUsdcTransferForBuyer({
      buyerWallet,
      amountSmallestUnit: amountUsdc,
    });
    return {
      escrowAddress: escrow.publicKey.toBase58(),
      amountUsdc,
      usdcMint: getUsdcMint(),
      serializedTransaction,
    };
  } catch (e) {
    await db.run(
      "UPDATE orders SET pending_fill_by = NULL, pending_fill_expires_at = NULL WHERE id = $1",
      [orderId],
    );
    console.error("initiateFillForPayment: failed to build tx", e);
    return { error: "Escrow not configured or transaction build failed" };
  }
}

/** Release a fill reservation (e.g. after a failed or cancelled tx). Only clears if reserved by this user. */
export async function releaseFillReservation(
  userId: string,
  orderId: string,
): Promise<{ released?: boolean; error?: string }> {
  const result = await db.run(
    "UPDATE orders SET pending_fill_by = NULL, pending_fill_expires_at = NULL WHERE id = $1 AND status = 'OPEN' AND pending_fill_by = $2",
    [orderId, userId],
  );
  if (result.changes === 0) {
    const row = await db.get("SELECT pending_fill_by FROM orders WHERE id = $1", [orderId]);
    if (!row) return { error: "Order not found" };
    return { released: false };
  }
  return { released: true };
}

async function finalizeRelistedOrderFill(args: {
  relistOrderId: string;
  filledByUserId: string;
  filledAt: string;
  amountUsdc: number;
  escrowFundedAt: string;
  reservationDeadline?: string;
}): Promise<{ order?: Order; error?: string }> {
  const { relistOrderId, filledByUserId, filledAt, amountUsdc, escrowFundedAt, reservationDeadline } =
    args;
  const relistOrder = await getOrderById(relistOrderId);
  if (!relistOrder) return { error: "Order not found" };
  if (!relistOrder.relist_source_order_id) {
    return { error: "Order is not a relist transfer" };
  }
  if (amountUsdc <= 0) return { error: "Invalid relist order amount" };

  const sourceOrder = await getOrderById(relistOrder.relist_source_order_id);
  if (!sourceOrder) return { error: "Relist source contract not found" };
  if (sourceOrder.status !== OrderStatus.FILLED) {
    return { error: "Relist source must remain filled" };
  }
  if (sourceOrder.funds_released_at || sourceOrder.refunded_at) {
    return { error: "Relist source contract already settled" };
  }

  const transferSide = getTransferSideForRelistOrder(relistOrder.type);
  const currentHolderId = getCurrentHolderId(sourceOrder, transferSide);
  if (
    currentHolderId !== relistOrder.creator_id &&
    currentHolderId !== filledByUserId
  ) {
    return { error: "Relist creator no longer controls that contract side" };
  }

  try {
    if (!relistOrder.funds_released_at) {
      // Realize P/L now: relist order escrow pays current position holder side.
      await releaseFundsToSeller(relistOrder.id, amountUsdc);
    }

    await db.runInTransaction(async (tx) => {
      const lockedRelistOrder = await getLockedOrderById(tx, relistOrderId);
      const lockedSourceOrder = await getLockedOrderById(
        tx,
        relistOrder.relist_source_order_id!,
      );
      if (!lockedRelistOrder || !lockedSourceOrder) {
        throw new Error("Relist source contract not found");
      }

      const lockedHolderId = getCurrentHolderId(lockedSourceOrder, transferSide);
      if (lockedHolderId === lockedRelistOrder.creator_id) {
        await transferContractSideHolderWithExecutor(
          tx,
          lockedSourceOrder,
          transferSide,
          filledByUserId,
        );
      } else if (lockedHolderId !== filledByUserId) {
        throw new Error("Relist creator no longer controls that contract side");
      }

      const fillResult = reservationDeadline
        ? await tx.run(
            `UPDATE orders
             SET status = $1,
                 filled_by = $2,
                 filled_at = $3,
                 total_amount_usdc = $4,
                 escrow_funded_at = COALESCE(escrow_funded_at, $5),
                 pending_fill_by = NULL,
                 pending_fill_expires_at = NULL
             WHERE id = $6
               AND status = 'OPEN'
               AND pending_fill_by = $7
               AND pending_fill_expires_at >= $8`,
            [
              OrderStatus.FILLED,
              filledByUserId,
              filledAt,
              amountUsdc,
              escrowFundedAt,
              relistOrderId,
              filledByUserId,
              reservationDeadline,
            ],
          )
        : await tx.run(
            `UPDATE orders
             SET status = $1,
                 filled_by = $2,
                 filled_at = $3,
                 total_amount_usdc = $4,
                 pending_fill_by = NULL,
                 pending_fill_expires_at = NULL
             WHERE id = $5
               AND status = 'OPEN'
               AND type = $6
               AND escrow_funded_at IS NOT NULL`,
            [
              OrderStatus.FILLED,
              filledByUserId,
              filledAt,
              amountUsdc,
              relistOrderId,
              OrderType.BID,
            ],
          );

      if (fillResult.changes === 0) {
        const latestRelistOrder = await getLockedOrderById(tx, relistOrderId);
        if (
          latestRelistOrder?.status === OrderStatus.FILLED &&
          latestRelistOrder.filled_by === filledByUserId
        ) {
          return;
        }
        throw new Error(
          reservationDeadline
            ? "Order was already filled by someone else or your reservation expired. If you sent payment, contact support for a refund."
            : "Bid order was already filled or is no longer funded.",
        );
      }
    });

    return { order: (await getOrderById(relistOrderId))! };
  } catch (e) {
    console.error("finalizeRelistedOrderFill failed", relistOrderId, e);
    return {
      error:
        "Relist transfer settlement failed. Please contact support for manual review.",
    };
  }
}

export async function confirmFillWithPayment(
  userId: string,
  orderId: string,
  txSignature: string,
): Promise<{ order?: Order; voucher?: FutureVoucher; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.OPEN) return { error: "Order is not open" };

  const row = (await db.get(
    "SELECT pending_fill_by, pending_fill_expires_at FROM orders WHERE id = $1",
    [orderId],
  )) as
    | { pending_fill_by: string | null; pending_fill_expires_at: string | null }
    | undefined;
  if (!row || row.pending_fill_by !== userId)
    return {
      error: "No matching reservation. Please start the buy flow again.",
    };
  const now = new Date().toISOString();
  if (!row.pending_fill_expires_at || row.pending_fill_expires_at < now) {
    await db.run(
      "UPDATE orders SET pending_fill_by = NULL, pending_fill_expires_at = NULL WHERE id = $1",
      [orderId],
    );
    return { error: "Reservation expired. Please start the buy flow again." };
  }

  const buyer = await getUserById(userId);
  if (!buyer?.address) return { error: "Wallet address not found" };
  const amountUsdc = Math.round(
    (order.price / JMD_PER_USD) * order.quantity * 1e6,
  );

  const verification = await verifyUsdcTransfer({
    txSignature,
    expectedFromWallet: buyer.address,
    expectedAmountUsdc: amountUsdc,
  });
  if (!verification.verified) {
    await db.run(
      "UPDATE orders SET pending_fill_by = NULL, pending_fill_expires_at = NULL WHERE id = $1",
      [orderId],
    );
    return {
      error:
        "Payment verification failed. Ensure the transaction succeeded and try again.",
    };
  }

  if (order.relist_source_order_id) {
    return finalizeRelistedOrderFill({
      relistOrderId: orderId,
      filledByUserId: userId,
      filledAt: now,
      amountUsdc,
      escrowFundedAt: now,
      reservationDeadline: now,
    });
  }

  const fillResult = await db.run(
    `UPDATE orders SET status = $1, filled_by = $2, filled_at = $3, total_amount_usdc = $4, escrow_funded_at = $5, pending_fill_by = NULL, pending_fill_expires_at = NULL
     WHERE id = $6 AND status = 'OPEN' AND pending_fill_by = $7 AND pending_fill_expires_at >= $8`,
    [OrderStatus.FILLED, userId, now, amountUsdc, now, orderId, userId, now],
  );
  if (fillResult.changes === 0) {
    return {
      error:
        "Order was already filled by someone else or your reservation expired. If you sent payment, contact support for a refund.",
    };
  }
  const voucher = await createVoucherForPrimaryAskFill(order, userId);
  return { order: (await getOrderById(orderId))!, voucher };
}

export async function acceptBidOrder(
  userId: string,
  orderId: string,
): Promise<{ order?: Order; voucher?: FutureVoucher; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.OPEN) return { error: "Order is not open" };
  if (order.creator_id === userId)
    return { error: "Cannot fill your own order" };

  const user = await getUserById(userId);
  if (!user) return { error: "User not found" };
  if (order.type !== OrderType.BID) {
    return { error: "Direct fills are only allowed for funded bid orders" };
  }
  if (!order.escrow_funded_at) {
    return { error: "Bid order is not funded" };
  }

  const now = new Date().toISOString();
  const totalAmountUsdc = Math.round(
    (order.price / JMD_PER_USD) * order.quantity * 1e6,
  );
  if (order.relist_source_order_id) {
    return finalizeRelistedOrderFill({
      relistOrderId: orderId,
      filledByUserId: userId,
      filledAt: now,
      amountUsdc: totalAmountUsdc,
      escrowFundedAt: order.escrow_funded_at,
    });
  }

  const result = await db.run(
    `UPDATE orders
     SET status = $1,
         filled_by = $2,
         filled_at = $3,
         total_amount_usdc = $4,
         pending_fill_by = NULL,
         pending_fill_expires_at = NULL
     WHERE id = $5
       AND status = 'OPEN'
       AND type = $6
       AND escrow_funded_at IS NOT NULL`,
    [
      OrderStatus.FILLED,
      userId,
      now,
      totalAmountUsdc,
      orderId,
      OrderType.BID,
    ],
  );
  if (result.changes === 0) {
    return { error: "Bid order was already filled or is no longer funded." };
  }
  return { order: (await getOrderById(orderId))! };
}

export async function cancelOrder(
  userId: string,
  orderId: string,
): Promise<{ order?: Order; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.OPEN) return { error: "Order is not open" };
  if (order.creator_id !== userId)
    return { error: "Only the creator can cancel this order" };

  // BID orders have USDC in escrow; refund to creator before cancelling
  if (order.type === OrderType.BID) {
    const creator = await getUserById(order.creator_id);
    if (!creator?.address) {
      return { error: "Creator wallet address not found; cannot refund deposit" };
    }
    const amount =
      order.total_amount_usdc ??
      Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
    if (amount <= 0) {
      return { error: "Invalid order amount" };
    }
    try {
      await sendUsdcFromEscrow({
        recipientWallet: creator.address,
        amountSmallestUnit: amount,
      });
    } catch (e) {
      console.error("cancelOrder: refund failed", e);
      return {
        error:
          "Failed to refund deposit. Your order was not cancelled. Please try again or contact support.",
      };
    }
  }

  await db.run("UPDATE orders SET status = $1 WHERE id = $2", [
    OrderStatus.CANCELLED,
    orderId,
  ]);
  return { order: (await getOrderById(orderId))! };
}

export async function initiateEscrow(
  userId: string,
  orderId: string,
): Promise<{
  escrowAddress?: string;
  amountUsdc?: number;
  usdcMint?: string;
  error?: string;
}> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.FILLED)
    return { error: "Order is not filled" };
  if (getBuyerId(order) !== userId)
    return { error: "Only the buyer can fund escrow" };
  if (order.escrow_funded_at) return { error: "Escrow already funded" };
  const amountUsdc =
    order.total_amount_usdc ??
    Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
  if (amountUsdc <= 0) return { error: "Invalid order amount" };
  try {
    const escrow = getEscrowKeypair();
    return {
      escrowAddress: escrow.publicKey.toBase58(),
      amountUsdc,
      usdcMint: getUsdcMint(),
    };
  } catch (e) {
    return { error: "Escrow not configured" };
  }
}

export async function fundEscrow(
  userId: string,
  orderId: string,
  txSignature?: string,
): Promise<{ order?: Order; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.FILLED)
    return { error: "Order is not filled" };
  if (getBuyerId(order) !== userId)
    return { error: "Only the buyer can fund escrow" };
  if (order.escrow_funded_at) return { error: "Escrow already funded" };
  const amountUsdc =
    order.total_amount_usdc ??
    Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
  const buyer = await getUserById(userId);
  if (!buyer?.address) return { error: "Buyer wallet address not found" };

  if (!txSignature && process.env.SKIP_ESCROW_VERIFICATION === "1") {
    const now = new Date().toISOString();
    await db.run("UPDATE orders SET escrow_funded_at = $1 WHERE id = $2", [
      now,
      orderId,
    ]);
    return { order: (await getOrderById(orderId))! };
  }
  if (!txSignature || typeof txSignature !== "string") {
    return { error: "Transaction signature is required to fund escrow" };
  }

  const verification = await verifyUsdcTransfer({
    txSignature,
    expectedFromWallet: buyer.address,
    expectedAmountUsdc: amountUsdc,
  });
  if (!verification.verified)
    return { error: "Transaction verification failed" };
  const now = new Date().toISOString();
  await db.run("UPDATE orders SET escrow_funded_at = $1 WHERE id = $2", [
    now,
    orderId,
  ]);
  return { order: (await getOrderById(orderId))! };
}

export async function attestDelivery(
  userId: string,
  orderId: string,
): Promise<{ order?: Order; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.FILLED)
    return { error: "Order is not filled" };
  if (getSellerId(order) !== userId)
    return { error: "Only the seller can attest delivery" };
  if (!order.escrow_funded_at)
    return { error: "Escrow must be funded before seller can attest delivery" };
  if (order.delivered_at) return { error: "Delivery already attested" };
  const now = new Date().toISOString();
  await db.run("UPDATE orders SET delivered_at = $1 WHERE id = $2", [
    now,
    orderId,
  ]);
  return { order: (await getOrderById(orderId))! };
}

export async function confirmReceipt(
  userId: string,
  orderId: string,
): Promise<{ order?: Order; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.FILLED)
    return { error: "Order is not filled" };
  if (getBuyerId(order) !== userId)
    return { error: "Only the buyer can confirm receipt" };
  if (!order.delivered_at)
    return { error: "Seller must attest delivery first" };
  if (order.contested_at)
    return { error: "Order is contested; wait for resolution" };
  if (order.funds_released_at) return { error: "Funds already released" };
  if (order.refunded_at) return { error: "Order was refunded" };
  const amount =
    order.total_amount_usdc ??
    Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
  if (amount <= 0) return { error: "Invalid order amount" };
  try {
    await releaseFundsToSeller(orderId, amount);
    return { order: (await getOrderById(orderId))! };
  } catch (e) {
    console.error("confirmReceipt release failed", e);
    return { error: "Failed to release funds to seller" };
  }
}

export async function contestDelivery(
  userId: string,
  orderId: string,
): Promise<{ order?: Order; message?: string; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.FILLED)
    return { error: "Order is not filled" };
  if (getBuyerId(order) !== userId)
    return { error: "Only the buyer can contest delivery" };
  if (!order.delivered_at)
    return { error: "Cannot contest before seller attests delivery" };
  if (order.funds_released_at) return { error: "Funds already released" };
  if (order.contested_at) {
    return {
      order,
      message: "Dispute has been filed and settlement is paused for manual review.",
    };
  }
  const now = new Date().toISOString();
  await db.run("UPDATE orders SET contested_at = $1 WHERE id = $2", [
    now,
    orderId,
  ]);
  return {
    order: (await getOrderById(orderId))!,
    message: "Dispute has been filed and settlement is paused for manual review.",
  };
}

export async function resolveDispute(
  orderId: string,
  resolution: "release" | "refund",
): Promise<{ order?: Order; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) return { error: "Order not found" };
  if (order.status !== OrderStatus.FILLED)
    return { error: "Order is not filled" };
  if (!order.contested_at) return { error: "Order is not contested" };
  if (order.funds_released_at) return { error: "Funds already released" };
  if (order.refunded_at) return { error: "Order was already refunded" };
  const amount =
    order.total_amount_usdc ??
    Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
  if (amount <= 0) return { error: "Invalid order amount" };
  try {
    if (resolution === "release") {
      await releaseFundsToSeller(orderId, amount);
      return { order: (await getOrderById(orderId))! };
    }
    const buyer = await getUserById(getBuyerId(order));
    if (!buyer?.address) return { error: "Buyer wallet address not found" };
    await sendUsdcFromEscrow({
      recipientWallet: buyer.address,
      amountSmallestUnit: amount,
    });
    const now = new Date().toISOString();
    await db.run("UPDATE orders SET refunded_at = $1 WHERE id = $2", [
      now,
      orderId,
    ]);
    return { order: (await getOrderById(orderId))! };
  } catch (e) {
    console.error("resolveDispute failed", e);
    return {
      error:
        resolution === "release"
          ? "Failed to release funds to seller"
          : "Failed to refund buyer",
    };
  }
}

export async function getVoucherById(
  id: string,
): Promise<FutureVoucher | undefined> {
  const row = await db.get("SELECT * FROM vouchers WHERE id = $1", [id]);
  return row ? rowToVoucher(row as Record<string, unknown>) : undefined;
}

export async function getVouchersByOwner(
  ownerId: string,
): Promise<FutureVoucher[]> {
  const rows = (await db.all(
    "SELECT * FROM vouchers WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId],
  )) as Record<string, unknown>[];
  return rows.map(rowToVoucher);
}

export async function listVoucher(
  ownerId: string,
  voucherId: string,
  listedPrice: number,
): Promise<{ voucher?: FutureVoucher; error?: string }> {
  const voucher = await getVoucherById(voucherId);
  if (!voucher) return { error: "Voucher not found" };
  if (voucher.owner_id !== ownerId)
    return { error: "Not the owner of this voucher" };
  if (voucher.is_listed) return { error: "Voucher is already listed" };
  await db.run(
    "UPDATE vouchers SET is_listed = 1, listed_price = $1 WHERE id = $2",
    [listedPrice, voucherId],
  );
  return { voucher: (await getVoucherById(voucherId))! };
}

export async function buyVoucher(
  buyerId: string,
  voucherId: string,
): Promise<{ voucher?: FutureVoucher; error?: string }> {
  const voucher = await getVoucherById(voucherId);
  if (!voucher) return { error: "Voucher not found" };
  if (!voucher.is_listed) return { error: "Voucher is not listed for sale" };
  if (voucher.owner_id === buyerId)
    return { error: "Cannot buy your own voucher" };
  await db.run(
    "UPDATE vouchers SET owner_id = $1, is_listed = 0, purchase_price = $2, listed_price = NULL WHERE id = $3",
    [buyerId, voucher.listed_price, voucherId],
  );
  return { voucher: (await getVoucherById(voucherId))! };
}

export async function getListedVouchers(): Promise<FutureVoucher[]> {
  const rows = (await db.all(
    "SELECT * FROM vouchers WHERE is_listed = 1 ORDER BY created_at DESC",
  )) as Record<string, unknown>[];
  return rows.map(rowToVoucher);
}
