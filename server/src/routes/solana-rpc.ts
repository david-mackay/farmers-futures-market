/**
 * Proxy Solana JSON-RPC so the Helius (or other) API key stays server-side.
 * Client uses NEXT_PUBLIC_API_URL + '/api/solana-rpc' as RPC URL; no key in browser.
 */

import { Router, Request, Response } from 'express';

/** Default to devnet unless explicitly set to mainnet (matches server/src/solana/config.ts). */
function getRpcUrl(): string | undefined {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  const apiKey = process.env.HELIUS_API_KEY;
  const isDevnet = process.env.SOLANA_NETWORK !== 'mainnet';
  if (apiKey) {
    return isDevnet
      ? `https://devnet.helius-rpc.com/?api-key=${apiKey}`
      : `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  }
  return undefined;
}

export function createSolanaRpcRouter() {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const rpcUrl = getRpcUrl();
    if (!rpcUrl) {
      res.status(503).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'RPC proxy not configured (SOLANA_RPC_URL / HELIUS_API_KEY missing)' },
        id: (req.body?.id ?? null),
      });
      return;
    }
    try {
      const rpcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await rpcRes.json();
      res.status(rpcRes.status).json(data);
    } catch (err) {
      console.error('Solana RPC proxy error:', err);
      res.status(502).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: err instanceof Error ? err.message : 'RPC proxy failed' },
        id: (req.body?.id ?? null),
      });
    }
  });

  return router;
}
