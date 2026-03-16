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
import { Spinner } from '@/components/ui/spinner';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

const today = () => new Date().toISOString().slice(0, 10);

export default function DeliveriesPage() {
  const { user } = useUser();
  const { showToast } = useToast();
  const [escrowLoading, setEscrowLoading] = useState<string | null>(null);

  const { orders: filledByMe, loading: loadingFilledByMe, refetch: refetchFilledByMe } = useOrders({
    status: 'FILLED',
    filled_by: user?.id ?? undefined,
  });
  const { orders: createdByMeFilled, loading: loadingCreatedByMe, refetch: refetchCreatedByMe } = useOrders({
    status: 'FILLED',
    creator_id: user?.id ?? undefined,
  });
  const { orders: myOpenOrders, loading: loadingMyOpen, refetch: refetchMyOpen } = useOrders({
    status: 'OPEN',
    creator_id: user?.id ?? undefined,
  });

  const refreshDeliveries = useCallback(() => {
    refetchFilledByMe();
    refetchCreatedByMe();
    refetchMyOpen();
  }, [refetchFilledByMe, refetchCreatedByMe, refetchMyOpen]);

  /** Source order id -> open relist order (so we block relist until they cancel) */
  const openRelistBySourceId = useMemo(() => {
    const map = new Map<string, Order>();
    for (const o of myOpenOrders) {
      if (o.relist_source_order_id) {
        map.set(o.relist_source_order_id, o);
      }
    }
    return map;
  }, [myOpenOrders]);

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

  /** Buyer: need to fund escrow, confirm receipt, or file a dispute */
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
    async (orderId: string, action: 'fund' | 'deliver' | 'confirm' | 'contest') => {
      setEscrowLoading(orderId);
      try {
        await api.post(`/api/orders/${orderId}/escrow/${action}`);
        refreshDeliveries();
        showToast('Contract updated');
      } finally {
        setEscrowLoading(null);
      }
    },
    [refreshDeliveries, showToast]
  );

  const loading = loadingFilledByMe || loadingCreatedByMe || loadingMyOpen;

  const getTradeHref = useCallback(
    (order: Order) => {
      if (!user) return undefined;
      if (order.funds_released_at || order.refunded_at) return undefined;
      if (openRelistBySourceId.has(order.id)) return undefined;
      const relistType = isBuyer(order, user.id) ? 'ASK' : 'BID';
      const params = new URLSearchParams({
        crop: String(order.crop_type),
        date: order.delivery_date,
        relist: '1',
        relist_source_order_id: order.id,
        relist_type: relistType,
        relist_qty: String(order.quantity),
        relist_price: String(order.price),
      });
      return `/markets?${params.toString()}`;
    },
    [user, openRelistBySourceId]
  );

  const getOpenRelistOrder = useCallback(
    (order: Order) => openRelistBySourceId.get(order.id),
    [openRelistBySourceId]
  );

  if (!user) {
    return (
      <div className="px-4 sm:px-6 py-8 text-center">
        <p className="text-muted">Sign in to view your active contracts and pending attestations.</p>
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Contracts</h1>
          <p className="text-muted text-xs sm:text-sm mt-0.5">
            Contracts in your possession. You can trade/relist, but obligations stay with you until a transfer is filled.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col gap-4 px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner size="lg" variant="primary" />
            <p className="text-muted text-sm">Loading contracts…</p>
          </div>
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : allFilled.length === 0 ? (
        <div className="px-4 sm:px-6 py-12 text-center border-b border-border">
          <Package className="w-12 h-12 text-muted mx-auto mb-3 opacity-60" aria-hidden />
          <p className="text-muted">No filled orders yet.</p>
          <Link href="/markets" className="text-primary font-medium hover:underline mt-2 inline-block">
            Markets
          </Link>
        </div>
      ) : (
        <>
          {toMarkAsDelivered.length > 0 && (
            <section className="border-b border-border">
              <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" aria-hidden />
                <div>
                  <h2 className="text-base font-semibold text-foreground">Seller responsibilities</h2>
                  <p className="text-xs text-muted mt-0.5">You are on the hook to deliver by contract date until a relist transfer is filled</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {toMarkAsDelivered.map((order, i) => (
                  <DeliveryOrderCard
                    key={order.id}
                    order={order}
                    loading={escrowLoading === order.id}
                    tradeHref={getTradeHref(order)}
                    openRelistOrder={getOpenRelistOrder(order)}
                    runEscrow={(action) => runEscrow(order.id, action)}
                    className="list-stagger-item"
                    style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
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
                  <h2 className="text-base font-semibold text-foreground">Buyer responsibilities</h2>
                  <p className="text-xs text-muted mt-0.5">Fund escrow, confirm receipt, or contest when delivery is attested</p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {toMarkAsReceived.map((order, i) => (
                  <DeliveryOrderCard
                    key={order.id}
                    order={order}
                    loading={escrowLoading === order.id}
                    tradeHref={getTradeHref(order)}
                    openRelistOrder={getOpenRelistOrder(order)}
                    runEscrow={(action) => runEscrow(order.id, action)}
                    className="list-stagger-item"
                    style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                  />
                ))}
              </ul>
            </section>
          )}

          {toMarkAsDelivered.length === 0 && toMarkAsReceived.length === 0 && (
            <div className="px-4 sm:px-6 py-12 text-center border-b border-border">
              <p className="text-muted text-sm">No pending actions. Historical contracts are in your profile.</p>
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
        <Link href="/markets" className="text-sm text-primary hover:underline">
          Markets
        </Link>
      </div>
    </div>
  );
}
