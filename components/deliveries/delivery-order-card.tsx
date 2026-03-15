'use client';

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
  runEscrow: (action: 'fund' | 'deliver' | 'confirm' | 'contest' | 'resolve', resolution?: 'release' | 'refund') => Promise<void>;
}

export function DeliveryOrderCard({ order, loading, runEscrow }: DeliveryOrderCardProps) {
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
          {order.refunded_at && <span className="text-muted">Refunded to buyer</span>}
          {order.funds_released_at && !order.refunded_at && (
            <span className="text-muted">Funds released</span>
          )}
          {order.contested_at && !order.funds_released_at && !order.refunded_at && (
            <>
              <span className="text-accent-red">Contested – under review</span>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => runEscrow('resolve', 'release')}>
                Resolve (release to seller)
              </Button>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => runEscrow('resolve', 'refund')}>
                Resolve (refund buyer)
              </Button>
            </>
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
                    Contest
                  </Button>
                  <span className="text-muted">Auto-releases in 1 day if no action</span>
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
