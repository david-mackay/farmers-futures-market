import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../shared/validation';
import * as userService from '../services/user-service';
import * as orderService from '../services/order-service';

export function createUsersRouter() {
  const router = Router();

  router.get('/', async (_req, res) => {
    const users = await userService.getAllUsers();
    res.json(users);
  });

  router.get('/:id', async (req, res) => {
    const user = await userService.getUserById(req.params.id as string);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  });

  router.post('/', async (req, res) => {
    const { address, display_name, role } = req.body;
    if (!address || !display_name || !role) {
      res.status(400).json({ error: 'address, display_name, and role are required' });
      return;
    }
    const user = await userService.createUser(address, display_name, role);
    res.status(201).json(user);
  });

  router.patch('/:id', validate(updateUserSchema), async (req, res) => {
    const user = await userService.updateUser(req.params.id as string, req.body);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  });

  router.post('/:id/verify', requireAuth, async (req: AuthRequest, res) => {
    if (req.params.id !== req.userId) {
      res.status(403).json({ error: 'Can only verify your own account' });
      return;
    }
    const user = await userService.approveVerification(req.params.id as string);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  });

  router.get('/:id/vouchers', async (req, res) => {
    const vouchers = await orderService.getVouchersByOwner(req.params.id as string);
    res.json(vouchers);
  });

  router.get('/:id/orders', async (req, res) => {
    const orders = await orderService.getOrders({ creator_id: req.params.id as string });
    res.json(orders);
  });

  return router;
}
