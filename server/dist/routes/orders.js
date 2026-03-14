"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrdersRouter = createOrdersRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const validation_1 = require("../../../shared/validation");
const orderService = __importStar(require("../services/order-service"));
function createOrdersRouter(io) {
    const router = (0, express_1.Router)();
    // List orders with optional filters
    router.get('/', (req, res) => {
        const filters = {
            crop_type: req.query.crop_type,
            type: req.query.type,
            status: req.query.status,
            delivery_date: req.query.delivery_date,
            delivery_month: req.query.delivery_month,
            creator_id: req.query.creator_id,
            filled_by: req.query.filled_by,
        };
        const orders = orderService.getOrders(filters);
        res.json(orders);
    });
    // Get single order
    router.get('/:id', (req, res) => {
        const order = orderService.getOrderById(req.params.id);
        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        res.json(order);
    });
    // Create order
    router.post('/', auth_1.requireAuth, (0, validate_1.validate)(validation_1.createOrderSchema), (req, res) => {
        const result = orderService.createOrder(req.userId, req.body);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        io.emit('order:created', result.order);
        res.status(201).json(result.order);
    });
    // Fill order
    router.post('/:id/fill', auth_1.requireAuth, (req, res) => {
        const result = orderService.fillOrder(req.userId, req.params.id);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        io.emit('order:filled', result.order);
        res.json({ order: result.order, voucher: result.voucher });
    });
    // Escrow: buyer funds (places money in escrow)
    router.post('/:id/escrow/fund', auth_1.requireAuth, (req, res) => {
        const result = orderService.fundEscrow(req.userId, req.params.id);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.json(result.order);
    });
    // Escrow: seller attests delivery
    router.post('/:id/escrow/deliver', auth_1.requireAuth, (req, res) => {
        const result = orderService.attestDelivery(req.userId, req.params.id);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.json(result.order);
    });
    // Escrow: buyer confirms receipt (releases funds to seller)
    router.post('/:id/escrow/confirm', auth_1.requireAuth, (req, res) => {
        const result = orderService.confirmReceipt(req.userId, req.params.id);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.json(result.order);
    });
    // Escrow: buyer contests delivery (dispute)
    router.post('/:id/escrow/contest', auth_1.requireAuth, (req, res) => {
        const result = orderService.contestDelivery(req.userId, req.params.id);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.json(result.order);
    });
    // Escrow: platform resolves dispute (release to seller or refund)
    router.post('/:id/escrow/resolve', auth_1.requireAuth, (req, res) => {
        const resolution = (req.body?.resolution === 'refund') ? 'refund' : 'release';
        const result = orderService.resolveDispute(req.params.id, resolution);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.json(result.order);
    });
    // Cancel order
    router.delete('/:id', auth_1.requireAuth, (req, res) => {
        const result = orderService.cancelOrder(req.userId, req.params.id);
        if (result.error) {
            res.status(400).json({ error: result.error });
            return;
        }
        io.emit('order:cancelled', result.order);
        res.json(result.order);
    });
    return router;
}
//# sourceMappingURL=orders.js.map