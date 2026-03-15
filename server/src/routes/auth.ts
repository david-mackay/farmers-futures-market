import { Router } from 'express';
import * as userService from '../services/user-service';

export function createAuthRouter() {
  const router = Router();

  router.post('/session', async (req, res) => {
    const { address, email, display_name } = req.body;
    if (!address || typeof address !== 'string') {
      res.status(400).json({ error: 'address is required' });
      return;
    }
    const trimmed = address.trim();
    // Solana base58 addresses are 32-44 chars; allow up to 64 for compatibility
    if (trimmed.length < 32 || trimmed.length > 64) {
      res.status(400).json({ error: 'Invalid wallet address length' });
      return;
    }
    try {
      const user = await userService.getOrCreateUser(trimmed, {
        email: email ?? null,
        display_name: display_name?.trim(),
      });
      res.json(user);
    } catch (e) {
      console.error('auth/session', e);
      res.status(500).json({ error: 'Failed to create or get user' });
    }
  });

  return router;
}
