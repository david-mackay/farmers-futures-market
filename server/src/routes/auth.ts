import { Router } from 'express';
import * as userService from '../services/user-service';
import { sendDevnetSignupBonus, sendDevnetSignupSol } from '../solana/usdc';

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
      const { user, created } = await userService.getOrCreateUser(trimmed, {
        email: email ?? null,
        display_name: display_name?.trim(),
      });
      let signupBonusSent = false;
      if (created) {
        try {
          const sig = await sendDevnetSignupBonus(user.address);
          signupBonusSent = sig != null;
          // Devnet-only: small SOL for tx fees (sendDevnetSignupSol is no-op off devnet)
          try {
            await sendDevnetSignupSol(user.address);
          } catch (e) {
            console.error('auth/session devnet signup SOL', e);
          }
        } catch (e) {
          console.error('auth/session devnet signup bonus', e);
        }
      }
      res.json({ user, signupBonusSent });
    } catch (e) {
      console.error('auth/session', e);
      res.status(500).json({ error: 'Failed to create or get user' });
    }
  });

  return router;
}
