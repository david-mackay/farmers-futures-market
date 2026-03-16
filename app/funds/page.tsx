'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Wallet, Lock, ArrowDownToLine, ArrowUpFromLine, CheckCircle } from 'lucide-react';
import { Order, OrderType, OrderStatus } from '@/shared/types';
import { useUser } from '@/hooks/use-user';
import { useOrders } from '@/hooks/use-orders';
import { CROP_LABELS } from '@/shared/constants';
import { JMD_PER_USD } from '@/shared/constants';
import { formatDeliveryDate, formatKg, formatUsdc, orderTotalUsd } from '@/lib/format';
import { isSeller, isBuyer } from '@/lib/order-role';
import { CropNameLink } from '@/components/crop-name-link';
import { CropType } from '@/shared/types';
import { Spinner } from '@/components/ui/spinner';

function orderAmountUsdc(order: Order): number {
  return order.total_amount_usdc ?? Math.round((order.price / JMD_PER_USD) * order.quantity * 1e6);
}

export default function FundsPage() {
  const { user } = useUser();
  const { orders: asCreator, loading: loadingCreator } = useOrders({ creator_id: user?.id ?? undefined });
  const { orders: asFiller, loading: loadingFiller } = useOrders({ filled_by: user?.id ?? undefined });
  const loading = loadingCreator || loadingFiller;

  const { openBids, openAsks, inEscrowAsBuyer, inEscrowAsSeller, awaitingReleaseToMe, releasedOrRefunded } =
    useMemo(() => {
      const seen = new Set<string>();
      const all: Order[] = [];
      for (const o of [...asCreator, ...asFiller]) {
        if (seen.has(o.id)) continue;
        seen.add(o.id);
        all.push(o);
      }

      const openBids = all.filter((o) => o.status === OrderStatus.OPEN && o.type === OrderType.BID);
      const openAsks = all.filter((o) => o.status === OrderStatus.OPEN && o.type === OrderType.ASK);
      const filled = all.filter((o) => o.status === OrderStatus.FILLED);

      const inEscrowAsBuyer = filled.filter((o) => isBuyer(o, user?.id ?? '') && o.escrow_funded_at && !o.funds_released_at && !o.refunded_at);
      const inEscrowAsSeller = filled.filter((o) => isSeller(o, user?.id ?? '') && o.escrow_funded_at && !o.delivered_at);
      const awaitingReleaseToMe = filled.filter(
        (o) => isSeller(o, user?.id ?? '') && o.delivered_at && !o.funds_released_at && !o.contested_at
      );
      const releasedOrRefunded = filled.filter(
        (o) =>
          (isSeller(o, user?.id ?? '') && o.funds_released_at) ||
          (isBuyer(o, user?.id ?? '') && (o.funds_released_at || o.refunded_at))
      );

      return {
        openBids,
        openAsks,
        inEscrowAsBuyer,
        inEscrowAsSeller,
        awaitingReleaseToMe,
        releasedOrRefunded,
      };
    }, [asCreator, asFiller, user?.id]);

  const totalLockedAsBuyer = useMemo(() => {
    const fromOpenBids = openBids.reduce((sum, o) => sum + orderAmountUsdc(o), 0);
    const fromFilled = inEscrowAsBuyer.reduce((sum, o) => sum + orderAmountUsdc(o), 0);
    return fromOpenBids + fromFilled;
  }, [openBids, inEscrowAsBuyer]);

  const totalAwaitingReleaseToMe = useMemo(
    () => awaitingReleaseToMe.reduce((sum, o) => sum + orderAmountUsdc(o), 0),
    [awaitingReleaseToMe]
  );

  if (!user) {
    return (
      <div className="px-4 sm:px-6 py-12 text-center">
        <p className="text-muted">Sign in to view your funds.</p>
        <Link href="/" className="text-primary font-medium hover:underline mt-2 inline-block">
          Dashboard
        </Link>
      </div>
    );
  }

  const sections = [
    {
      title: 'Your USDC in escrow (buy side)',
      subtitle: 'Locked against open buy orders or filled orders awaiting delivery',
      icon: Lock,
      amount: totalLockedAsBuyer,
      items: [...openBids, ...inEscrowAsBuyer],
      empty: 'No buy-side funds in escrow.',
    },
    {
      title: 'Awaiting release to you (seller)',
      subtitle: 'Delivery attested; release after buyer confirms or 1 day',
      icon: ArrowUpFromLine,
      amount: totalAwaitingReleaseToMe,
      items: awaitingReleaseToMe,
      empty: 'No funds awaiting release.',
    },
    {
      title: 'In escrow – you deliver',
      subtitle: 'Buyer has paid; attest delivery to unlock release',
      icon: ArrowDownToLine,
      amount: inEscrowAsSeller.reduce((sum, o) => sum + orderAmountUsdc(o), 0),
      items: inEscrowAsSeller,
      empty: 'No orders waiting for your delivery.',
    },
    {
      title: 'Released / refunded',
      subtitle: 'Completed: funds released to you or refunded',
      icon: CheckCircle,
      amount: releasedOrRefunded.reduce((sum, o) => sum + orderAmountUsdc(o), 0),
      items: releasedOrRefunded,
      empty: 'No completed releases yet.',
    },
  ];

  return (
    <div className="flex flex-col min-h-0">
      <section className="border-b border-border">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-primary shrink-0" aria-hidden />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Where your funds are</h1>
            <p className="text-muted text-sm mt-0.5">
              Escrow balance and release status for your orders
            </p>
          </div>
        </div>
      </section>

      {openAsks.length > 0 && (
        <section className="px-4 sm:px-6 py-2 border-b border-border bg-muted-bg/30">
          <p className="text-xs text-muted">
            You have <strong>{openAsks.length}</strong> open sell order(s). No funds are locked until a buyer fills.
          </p>
        </section>
      )}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Spinner size="lg" variant="primary" />
          <p className="text-muted text-sm">Loading…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {sections.map(({ title, subtitle, icon: Icon, amount, items, empty }) => (
            <section key={title} className="border-b border-border">
              <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-muted shrink-0" aria-hidden />
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <p className="text-xs text-muted mt-0.5">{subtitle}</p>
                  </div>
                </div>
                {amount > 0 && (
                  <div className="font-data font-semibold text-foreground">
                    {formatUsdc(amount)} USDC
                  </div>
                )}
              </div>
              {items.length === 0 ? (
                <div className="px-4 sm:px-6 pb-4 text-sm text-muted">{empty}</div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((order) => (
                    <li key={order.id} className="px-4 sm:px-6 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <CropNameLink
                            cropName={CROP_LABELS[order.crop_type as CropType]}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {CROP_LABELS[order.crop_type as CropType]}
                          </CropNameLink>
                          <div className="text-xs text-muted mt-0.5">
                            {formatDeliveryDate(order.delivery_date)} · {formatKg(order.quantity)}
                            {order.status === OrderStatus.OPEN && (
                              <span className="ml-1">· Open {order.type === OrderType.BID ? 'bid' : 'ask'}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 font-data font-semibold text-foreground">
                          {formatUsdc(orderAmountUsdc(order))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 border-t border-border flex flex-wrap gap-3 text-sm">
        <Link href="/deliveries" className="text-primary hover:underline">
          Contracts & attestations
        </Link>
        <Link href="/markets" className="text-primary hover:underline">
          Markets
        </Link>
      </div>
    </div>
  );
}
