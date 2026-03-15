import { Router } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../../../shared/validation';
import * as userService from '../services/user-service';
import * as orderService from '../services/order-service';

export function createUsersRouter() {
  const router = Router();

  // List all users
  router.get('/', (_req, res) => {
    res.json(userService.getAllUsers());
  });

  // Get user by id
  router.get('/:id', (req, res) => {
    const user = userService.getUserById(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  });

  // Create user
  router.post('/', (req, res) => {
    const { address, display_name, role } = req.body;
    if (!address || !display_name || !role) {
      res.status(400).json({ error: 'address, display_name, and role are required' });
      return;
    }
    const user = userService.createUser(address, display_name, role);
    res.status(201).json(user);
  });

  // Update user
  router.patch('/:id', validate(updateUserSchema), (req, res) => {
    const user = userService.updateUser(req.params.id, req.body);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  });

  // Mock verification: submit verification (image not stored; we accept and mark verified)
  router.post('/:id/verify', requireAuth, (req: AuthRequest, res) => {
    if (req.params.id !== req.userId) {
      res.status(403).json({ error: 'Can only verify your own account' });
      return;
    }
    const user = userService.approveVerification(req.params.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  });

  // Get user's vouchers
  router.get('/:id/vouchers', (req, res) => {
    res.json(orderService.getVouchersByOwner(req.params.id));
  });

  // Get user's orders
  router.get('/:id/orders', (req, res) => {
    res.json(orderService.getOrders({ creator_id: req.params.id }));
  });

  return router;
}
