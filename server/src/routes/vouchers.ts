import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import * as orderService from '../services/order-service';
import { Server as SocketServer } from 'socket.io';

export function createVouchersRouter(io: SocketServer) {
  const router = Router();

  // List all listed vouchers (secondary market)
  router.get('/', (_req, res) => {
    res.json(orderService.getListedVouchers());
  });

  // List a voucher for sale
  router.post('/:id/list', requireAuth, (req: AuthRequest, res) => {
    const { listed_price } = req.body;
    if (!listed_price || listed_price <= 0) {
      res.status(400).json({ error: 'Positive listed_price is required' });
      return;
    }
    const result = orderService.listVoucher(req.userId!, req.params.id, listed_price);
    if (result.error) { res.status(400).json({ error: result.error }); return; }
    io.emit('voucher:listed', result.voucher);
    res.json(result.voucher);
  });

  // Buy a listed voucher
  router.post('/:id/buy', requireAuth, (req: AuthRequest, res) => {
    const result = orderService.buyVoucher(req.userId!, req.params.id);
    if (result.error) { res.status(400).json({ error: result.error }); return; }
    io.emit('voucher:sold', result.voucher);
    res.json(result.voucher);
  });

  return router;
}
