'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Package, Truck } from 'lucide-react';
import { Order } from '@/shared/types';
import { useUser } from '@/hooks/use-user';
import { useOrders } from '@/hooks/use-orders';
import { DeliveryOrderCard } from '@/components/deliveries/delivery-order-card';
import { isSeller, isBuyer } from '@/lib/order-role';
import { api } from '@/lib/api-client';

const today = () => new Date().toISOString().slice(0, 10);

export default function DeliveriesPage() {
  const { user } = useUser();
  const [escrowLoading, setEscrowLoading] = useState<string | null>(null);

  const { orders: filledByMe, loading: loadingFilledByMe, refetch: refetchFilledByMe } = useOrders({
    status: 'FILLED',
    filled_by: user?.id ?? undefined,
  });
  const { orders: createdByMeFilled, loading: loadingCreatedByMe, refetch: refetchCreatedByMe } = useOrders({
    status: 'FILLED',
    creator_id: user?.id ?? undefined,
  });

  const refreshDeliveries = useCallback(() => {
    refetchFilledByMe();
    refetchCreatedByMe();
  }, [refetchFilledByMe, refetchCreatedByMe]);

  const allFilled = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...filledByMe, ...createdByMeFilled].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    return merged.sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [filledByMe, createdByMeFilled]);

  /** Seller: escrow funded, I need to mark as delivered */
  const toMarkAsDelivered = useMemo(() => {
    if (!user) return [];
    return allFilled
      .filter((o) => !o.funds_released_at && !o.refunded_at && isSeller(o, user.id) && o.escrow_funded_at && !o.delivered_at)
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [allFilled, user]);

  /** Buyer: need to fund escrow, or confirm/contest receipt, or resolve contest */
  const toMarkAsReceived = useMemo(() => {
    if (!user) return [];
    return allFilled
      .filter((o) => {
        if (o.funds_released_at || o.refunded_at) return false;
        if (!isBuyer(o, user.id)) return false;
        if (o.contested_at) return true;
        if (!o.escrow_funded_at) return true;
        if (o.delivered_at) return true;
        return false;
      })
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [allFilled, user]);

  const runEscrow = useCallback(
    async (orderId: string, action: 'fund' | 'deliver' | 'confirm' | 'contest' | 'resolve', resolution?: 'release' | 'refund') => {
      setEscrowLoading(orderId);
      try {
        if (action === 'resolve') {
          await api.post(`/api/orders/${orderId}/escrow/resolve`, { resolution: resolution ?? 'release' });
        } else {
          await api.post(`/api/orders/${orderId}/escrow/${action}`);
        }
        refreshDeliveries();
      } finally {
        setEscrowLoading(null);
      }
    },
    [refreshDeliveries]
  );

  const loading = loadingFilledByMe || loadingCreatedByMe;

  if (!user) {
    return (
      <div className="px-4 sm:px-6 py-8 text-center">
        <p className="text-muted">Sign in to view your deliveries and pending attestations.</p>
        <Link href="/" className="text-primary font-medium hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <section className="border-b border-border">
        <div className="px-4 sm:px-6 py-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Deliveries</h1>
          <p className="text-muted text-xs sm:text-sm mt-0.5">
            Mark as delivered or confirm receipt. Past deliveries are on your profile.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="py-12 text-center text-muted text-sm">Loading…</div>
      ) : allFilled.length === 0 ? (
        <div className="px-4 sm:px-6 py-12 text-center border-b border-border">
          <Package className="w-12 h-12 text-muted mx-auto mb-3 opacity-60" aria-hidden />
          <p className="text-muted">No filled orders yet.</p>
          <Link href="/explore" className="text-primary font-medium hover:underline mt-2 inline-block">
            Explore order book
          </Link>
        </div>
      ) : (
        <>
          {toMarkAsDelivered.length > 0 && (
            <section className="border-b border-border">
              <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" aria-hidden />
                <div>
                  <h2 className="text-base font-semibold text-foreground">Mark as delivered</h2>
                  <p className="text-xs text-muted mt-0.5">You’re the seller — mark when shipped/delivered</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {toMarkAsDelivered.map((order) => (
                  <DeliveryOrderCard
                    key={order.id}
                    order={order}
                    loading={escrowLoading === order.id}
                    runEscrow={(action, resolution) => runEscrow(order.id, action, resolution)}
                  />
                ))}
              </ul>
            </section>
          )}

          {toMarkAsReceived.length > 0 && (
            <section className="flex-1 overflow-auto border-b border-border">
              <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" aria-hidden />
                <div>
                  <h2 className="text-base font-semibold text-foreground">Mark as received</h2>
                  <p className="text-xs text-muted mt-0.5">You’re the buyer — fund escrow, confirm receipt, or contest</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {toMarkAsReceived.map((order) => (
                  <DeliveryOrderCard
                    key={order.id}
                    order={order}
                    loading={escrowLoading === order.id}
                    runEscrow={(action, resolution) => runEscrow(order.id, action, resolution)}
                  />
                ))}
              </ul>
            </section>
          )}

          {toMarkAsDelivered.length === 0 && toMarkAsReceived.length === 0 && (
            <div className="px-4 sm:px-6 py-12 text-center border-b border-border">
              <p className="text-muted text-sm">No pending actions. Past deliveries are in your profile.</p>
              <Link href="/profile" className="text-primary font-medium hover:underline mt-2 inline-block">
                View profile
              </Link>
            </div>
          )}
        </>
      )}

      <div className="hidden md:flex flex-wrap gap-2 mt-4 px-4">
        <Link href="/" className="text-sm text-primary hover:underline">
          Dashboard
        </Link>
        <Link href="/explore" className="text-sm text-primary hover:underline">
          Explore
        </Link>
      </div>
    </div>
  );
}
