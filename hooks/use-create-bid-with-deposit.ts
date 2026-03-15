'use client';

import { useState, useCallback } from 'react';
import { Transaction } from '@solana/web3.js';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { api } from '@/lib/api-client';

/**
 * Create a BID order with USDC deposit: prepare-bid → sign & send → confirm-bid.
 */
export function useCreateBidWithDeposit() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('solana');
  const { connection } = useAppKitConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBidOrder = useCallback(
    async (params: {
      crop_type: string;
      price: number;
      quantity: number;
      delivery_date: string;
    }): Promise<boolean> => {
      setError(null);
      setLoading(true);
      try {
        if (!isConnected || !address) {
          setError('Connect your wallet first');
          return false;
        }
        if (!walletProvider) {
          setError('Solana wallet not ready. Try reconnecting.');
          return false;
        }
        if (!connection) {
          setError('Solana connection not ready. Try reconnecting.');
          return false;
        }

        const prep = await api.post<{
          orderId: string;
          serializedTransaction: string;
          amountUsdc: number;
          escrowAddress: string;
          usdcMint: string;
        }>('/api/orders/prepare-bid', {
          ...params,
          creatorWallet: address,
        });

        if (!prep.serializedTransaction || !prep.orderId) {
          setError('Could not build deposit transaction. Try again.');
          return false;
        }

        const txBytes = Uint8Array.from(atob(prep.serializedTransaction), (c) =>
          c.charCodeAt(0),
        );
        const transaction = Transaction.from(txBytes);

        const txSignature = await walletProvider.sendTransaction(
          transaction,
          connection,
        );
        if (!txSignature) {
          setError('Transaction was not sent. Try again.');
          return false;
        }

        await api.post('/api/orders/confirm-bid', {
          orderId: prep.orderId,
          txSignature,
          ...params,
        });
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Deposit failed. Try again.';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [address, isConnected, connection, walletProvider],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    createBidOrder,
    loading,
    error,
    clearError,
    canCreateBid: isConnected && !!address && !!connection,
  };
}
