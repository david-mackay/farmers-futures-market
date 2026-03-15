import { Router } from 'express';
import * as userService from '../services/user-service';

export function createAuthRouter() {
  const router = Router();

  router.post('/session', (req, res) => {
    const { address, email, display_name } = req.body;
    if (!address || typeof address !== 'string') {
      res.status(400).json({ error: 'address is required' });
      return;
    }
    const user = userService.getOrCreateUser(address.trim(), {
      email: email ?? null,
      display_name: display_name?.trim(),
    });
    res.json(user);
  });

  return router;
}
