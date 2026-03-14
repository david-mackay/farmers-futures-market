import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema } from '../../../shared/validation';
import * as orderService from '../services/order-service';
import { Server as SocketServer } from 'socket.io';

export function createOrdersRouter(io: SocketServer) {
  const router = Router();

  // List orders with optional filters
  router.get('/', (req, res) => {
    const filters: orderService.OrderFilters = {
      crop_type: req.query.crop_type as string | undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      delivery_date: req.query.delivery_date as string | undefined,
      delivery_month: req.query.delivery_month as string | undefined,
      creator_id: req.query.creator_id as string | undefined,
    };
    const orders = orderService.getOrders(filters);
    res.json(orders);
  });

  // Get single order
  router.get('/:id', (req, res) => {
    const order = orderService.getOrderById(req.params.id);
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(order);
  });

  // Create order
  router.post('/', requireAuth, validate(createOrderSchema), (req: AuthRequest, res) => {
    const result = orderService.createOrder(req.userId!, req.body);
    if (result.error) { res.status(400).json({ error: result.error }); return; }
    io.emit('order:created', result.order);
    res.status(201).json(result.order);
  });

  // Fill order
  router.post('/:id/fill', requireAuth, (req: AuthRequest, res) => {
    const result = orderService.fillOrder(req.userId!, req.params.id);
    if (result.error) { res.status(400).json({ error: result.error }); return; }
    io.emit('order:filled', result.order);
    res.json({ order: result.order, voucher: result.voucher });
  });

  // Cancel order
  router.delete('/:id', requireAuth, (req: AuthRequest, res) => {
    const result = orderService.cancelOrder(req.userId!, req.params.id);
    if (result.error) { res.status(400).json({ error: result.error }); return; }
    io.emit('order:cancelled', result.order);
    res.json(result.order);
  });

  return router;
}
