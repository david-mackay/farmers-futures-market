'use client';

import Link from 'next/link';
import { Order } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useUser } from '@/hooks/use-user';
import { CropNameLink } from '@/components/crop-name-link';
import { formatPrice, formatDeliveryDate, formatKg } from '@/lib/format';
import { useCurrency } from '@/contexts/currency-context';
import { isSeller, isBuyer } from '@/lib/order-role';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { CropType } from '@/shared/types';

interface DeliveryOrderCardProps {
  order: Order;
  loading: boolean;
  tradeHref?: string;
  /** When set, user already has an open relist for this contract; they must cancel it before relisting again */
  openRelistOrder?: Order;
  runEscrow: (action: 'fund' | 'deliver' | 'confirm' | 'contest') => Promise<void>;
}

export function DeliveryOrderCard({ order, loading, tradeHref, openRelistOrder, runEscrow }: DeliveryOrderCardProps) {
  useCurrency(); // re-render when JMD/USD toggled
  const { user } = useUser();
  if (!user) return null;
  const total = order.quantity * order.price;
  const delivering = isSeller(order, user.id);
  const asBuyer = isBuyer(order, user.id);
  const asSeller = delivering;

  return (
    <li>
      <div className="px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-3 min-h-[3.25rem]">
          <div className="min-w-0">
            <CropNameLink
              cropName={CROP_LABELS[order.crop_type as CropType]}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {CROP_LABELS[order.crop_type as CropType]}
            </CropNameLink>
            <div className="text-xs text-muted mt-0.5">
              {formatDeliveryDate(order.delivery_date)}
              {delivering
                ? ` · Delivering ${formatKg(order.quantity)}`
                : ` · Receiving ${formatKg(order.quantity)}`}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-data font-semibold text-foreground">
              {delivering ? `${formatPrice(total)} to receive` : `${formatPrice(total)} to pay`}
            </div>
            <div className="text-xs text-muted">{formatPrice(order.price)}/kg</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
          {openRelistOrder ? (
            <span className="text-muted" title="Cancel your open relist order in Profile before relisting again.">
              Open relist active —{' '}
              <Link href="/profile" className="text-primary hover:underline font-medium">
                cancel it first
              </Link>
            </span>
          ) : tradeHref ? (
            <Link
              href={tradeHref}
              className="inline-flex items-center justify-center rounded-md border border-primary/40 px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
              title={delivering
                ? 'This will absolve you of your responsibility to deliver the goods.'
                : 'This will absolve you of your responsibility to purchase the goods.'}
            >
              Relist
            </Link>
          ) : null}
          {order.refunded_at && <span className="text-muted">Refunded to buyer</span>}
          {order.funds_released_at && !order.refunded_at && (
            <span className="text-muted">Funds released</span>
          )}
          {order.contested_at && !order.funds_released_at && !order.refunded_at && (
            <span className="text-accent-red">Dispute has been filed. Settlement is paused for manual review.</span>
          )}
          {!order.funds_released_at && !order.contested_at && asBuyer && (
            <>
              {!order.escrow_funded_at && (
                <Button size="sm" disabled={loading} onClick={() => runEscrow('fund')}>
                  Fund escrow ({formatPrice(total)})
                </Button>
              )}
              {order.escrow_funded_at && !order.delivered_at && (
                <span className="text-muted">Waiting for seller to deliver</span>
              )}
              {order.delivered_at && (
                <>
                  <Button size="sm" disabled={loading} onClick={() => runEscrow('confirm')}>
                    Confirm receipt
                  </Button>
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => runEscrow('contest')}>
                    File dispute
                  </Button>
                  <span className="text-muted">Auto-releases in 1 day unless a dispute is filed</span>
                </>
              )}
            </>
          )}
          {!order.funds_released_at && !order.contested_at && asSeller && (
            <>
              {!order.escrow_funded_at && (
                <span className="text-muted">Waiting for buyer to fund escrow</span>
              )}
              {order.escrow_funded_at && !order.delivered_at && (
                <Button size="sm" disabled={loading} onClick={() => runEscrow('deliver')}>
                  Mark as delivered
                </Button>
              )}
              {order.delivered_at && (
                <span className="text-muted">Delivery attested · waiting for buyer or 1-day auto-release</span>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
