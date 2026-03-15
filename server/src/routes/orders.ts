import { Router } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrderSchema } from "../shared/validation";
import * as orderService from "../services/order-service";
import { Server as SocketServer } from "socket.io";

export function createOrdersRouter(io: SocketServer) {
  const router = Router();

  router.get("/", async (req, res) => {
    const filters: orderService.OrderFilters = {
      crop_type: req.query.crop_type as string | undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      delivery_date: req.query.delivery_date as string | undefined,
      delivery_month: req.query.delivery_month as string | undefined,
      creator_id: req.query.creator_id as string | undefined,
      filled_by: req.query.filled_by as string | undefined,
    };
    const orders = await orderService.getOrders(filters);
    res.json(orders);
  });

  router.get("/:id", async (req, res) => {
    const order = await orderService.getOrderById(req.params.id as string);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  });

  router.post(
    "/",
    requireAuth,
    validate(createOrderSchema),
    async (req: AuthRequest, res) => {
      const result = await orderService.createOrder(req.userId!, req.body);
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      io.emit("order:created", result.order);
      res.status(201).json(result.order);
    },
  );

  router.post("/prepare-bid", requireAuth, async (req: AuthRequest, res) => {
    const creatorWallet = req.body?.creatorWallet as string | undefined;
    if (!creatorWallet || typeof creatorWallet !== "string") {
      res.status(400).json({ error: "creatorWallet is required" });
      return;
    }
    const body = req.body as {
      crop_type?: string;
      price?: number;
      quantity?: number;
      delivery_date?: string;
      relist_source_order_id?: string;
    };
    const result = await orderService.prepareBidOrder(
      req.userId!,
      {
        crop_type: body.crop_type!,
        price: body.price!,
        quantity: body.quantity!,
        delivery_date: body.delivery_date!,
        relist_source_order_id: body.relist_source_order_id,
      },
      creatorWallet,
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      orderId: result.orderId,
      serializedTransaction: result.serializedTransaction,
      amountUsdc: result.amountUsdc,
      escrowAddress: result.escrowAddress,
      usdcMint: result.usdcMint,
    });
  });

  router.post("/confirm-bid", requireAuth, async (req: AuthRequest, res) => {
    const body = req.body as {
      orderId?: string;
      txSignature?: string;
      crop_type?: string;
      price?: number;
      quantity?: number;
      delivery_date?: string;
      relist_source_order_id?: string;
    };
    if (!body.orderId || !body.txSignature) {
      res.status(400).json({ error: "orderId and txSignature are required" });
      return;
    }
    const result = await orderService.confirmBidOrder(req.userId!, {
      orderId: body.orderId,
      txSignature: body.txSignature,
      crop_type: body.crop_type!,
      price: body.price!,
      quantity: body.quantity!,
      delivery_date: body.delivery_date!,
      relist_source_order_id: body.relist_source_order_id,
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    io.emit("order:created", result.order);
    res.status(201).json(result.order);
  });

  router.post("/:id/release-fill", requireAuth, async (req: AuthRequest, res) => {
    const result = await orderService.releaseFillReservation(
      req.userId!,
      req.params.id as string,
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ released: result.released });
  });

  router.post(
    "/:id/initiate-fill",
    requireAuth,
    async (req: AuthRequest, res) => {
      const buyerWallet = req.body?.buyerWallet as string | undefined;
      if (!buyerWallet || typeof buyerWallet !== "string") {
        res.status(400).json({ error: "buyerWallet is required" });
        return;
      }
      const result = await orderService.initiateFillForPayment(
        req.userId!,
        req.params.id as string,
        buyerWallet,
      );
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({
        escrowAddress: result.escrowAddress,
        amountUsdc: result.amountUsdc,
        usdcMint: result.usdcMint,
        serializedTransaction: result.serializedTransaction,
      });
    },
  );

  router.post("/:id/confirm-fill", requireAuth, (req: AuthRequest, res) => {
    const txSignature = req.body?.txSignature as string | undefined;
    if (!txSignature || typeof txSignature !== "string") {
      res.status(400).json({ error: "txSignature is required" });
      return;
    }
    orderService
      .confirmFillWithPayment(req.userId!, req.params.id as string, txSignature)
      .then((result) => {
        if (result.error) {
          res.status(400).json({ error: result.error });
          return;
        }
        io.emit("order:filled", result.order);
        res.json({ order: result.order, voucher: result.voucher });
      })
      .catch((err) => {
        console.error("confirm-fill", err);
        res.status(500).json({ error: "Failed to confirm fill" });
      });
  });

  router.post("/:id/accept-bid", requireAuth, async (req: AuthRequest, res) => {
    const result = await orderService.acceptBidOrder(
      req.userId!,
      req.params.id as string,
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    io.emit("order:filled", result.order);
    res.json({ order: result.order, voucher: result.voucher });
  });

  router.get(
    "/:id/escrow/initiate",
    requireAuth,
    async (req: AuthRequest, res) => {
      const result = await orderService.initiateEscrow(
        req.userId!,
        req.params.id as string,
      );
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({
        escrowAddress: result.escrowAddress,
        amountUsdc: result.amountUsdc,
        usdcMint: result.usdcMint,
      });
    },
  );

  // Legacy: fund escrow for already-FILLED order that has no escrow_funded_at
  router.post("/:id/escrow/fund", requireAuth, (req: AuthRequest, res) => {
    const txSignature = req.body?.txSignature as string | undefined;
    orderService
      .fundEscrow(req.userId!, req.params.id as string, txSignature)
      .then((result) => {
        if (result.error) {
          res.status(400).json({ error: result.error });
          return;
        }
        res.json(result.order);
      })
      .catch((err) => {
        console.error("escrow/fund", err);
        res.status(500).json({ error: "Failed to verify escrow funding" });
      });
  });

  router.post(
    "/:id/escrow/deliver",
    requireAuth,
    async (req: AuthRequest, res) => {
      const result = await orderService.attestDelivery(
        req.userId!,
        req.params.id as string,
      );
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.order);
    },
  );

  // Escrow: buyer confirms receipt (sends USDC to seller, sets funds_released_at)
  router.post("/:id/escrow/confirm", requireAuth, (req: AuthRequest, res) => {
    orderService
      .confirmReceipt(req.userId!, req.params.id as string)
      .then((result) => {
        if (result.error) {
          res.status(400).json({ error: result.error });
          return;
        }
        res.json(result.order);
      })
      .catch((err) => {
        console.error("escrow/confirm", err);
        res.status(500).json({ error: "Failed to release funds" });
      });
  });

  router.post(
    "/:id/escrow/contest",
    requireAuth,
    async (req: AuthRequest, res) => {
      const result = await orderService.contestDelivery(
        req.userId!,
        req.params.id as string,
      );
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.order);
    },
  );

  router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
    const result = await orderService.cancelOrder(
      req.userId!,
      req.params.id as string,
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    io.emit("order:cancelled", result.order);
    res.json(result.order);
  });

  return router;
}
