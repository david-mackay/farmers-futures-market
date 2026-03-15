'use client';

import { useState, useCallback } from 'react';
import { Transaction } from '@solana/web3.js';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { api } from '@/lib/api-client';

/**
 * Atomic fill flow:
 *   1. POST initiate-fill (server builds the USDC transfer tx using Helius RPC)
 *   2. Deserialize the pre-built transaction
 *   3. Sign & send via wallet provider + AppKit connection
 *   4. POST confirm-fill with the tx signature
 *
 * All RPC-heavy calls (getAccountInfo, getLatestBlockhash) happen server-side
 * so the Helius API key never leaks to the browser.
 */
export function useFillWithPayment() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana');
  const { connection } = useAppKitConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeFill = useCallback(
    async (orderId: string): Promise<boolean> => {
      setError(null);
      setLoading(true);
      try {
        if (!isConnected || !address) {
          setError('Connect your wallet first');
          return false;
        }
        if (!walletProvider || !connection) {
          setError('Solana wallet not ready. Try reconnecting.');
          return false;
        }

        const init = await api.post<{
          escrowAddress: string;
          amountUsdc: number;
          usdcMint: string;
          serializedTransaction: string;
        }>(`/api/orders/${orderId}/initiate-fill`, { buyerWallet: address });

        const { serializedTransaction } = init;
        if (!serializedTransaction) {
          setError('Could not build payment transaction. Try again.');
          return false;
        }

        const txBytes = Uint8Array.from(atob(serializedTransaction), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBytes);

        const txSignature = await walletProvider.sendTransaction(
          transaction,
          connection
        );
        if (!txSignature) {
          setError('Transaction was not sent. Try again.');
          try { await api.post(`/api/orders/${orderId}/release-fill`); } catch { /* best effort */ }
          return false;
        }

        await api.post(`/api/orders/${orderId}/confirm-fill`, { txSignature });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed. Try again.';
        setError(message);
        try { await api.post(`/api/orders/${orderId}/release-fill`); } catch { /* best effort */ }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [address, isConnected, connection, walletProvider]
  );

  const clearError = useCallback(() => setError(null), []);

  return { executeFill, loading, error, clearError, canFill: isConnected && !!address && !!connection };
}
