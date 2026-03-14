'use client';

import { Order, OrderType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useUser } from '@/hooks/use-user';
import { TransactButton } from '@/components/transact-button';
import { CropNameLink } from '@/components/crop-name-link';
import { formatPricePerKg, formatDeliveryDate } from '@/lib/format';

interface OrderBookViewProps {
  orders: Order[];
  cropType: string;
  deliveryDate: string;
  onUpdate?: () => void;
}

/** Level II–style order book: best bid/ask at top, then Size | Bid | Ask | Size by convergence */
export function OrderBookView({ orders, cropType, deliveryDate, onUpdate }: OrderBookViewProps) {
  const { user } = useUser();
  const bids = orders
    .filter(o => o.type === OrderType.BID)
    .sort((a, b) => b.price - a.price);
  const asks = orders
    .filter(o => o.type === OrderType.ASK)
    .sort((a, b) => a.price - b.price);

  const bestBid = bids[0];
  const bestAsk = asks[0];
  const bestBidSizeKg = bestBid ? bestBid.quantity : 0;
  const bestAskSizeKg = bestAsk ? bestAsk.quantity : 0;

  // Build rows by convergence: pair bid rows with ask rows (bid desc, ask asc)
  const maxRows = Math.max(bids.length, asks.length);
  const rows: { bid?: Order; ask?: Order }[] = [];
  for (let i = 0; i < maxRows; i++) {
    rows.push({ bid: bids[i], ask: asks[i] });
  }

  return (
    <div className="space-y-0">
      {/* Best Bid / Best Ask — price per kg */}
      <div className="grid grid-cols-2 gap-2 mb-2 border-b border-border pb-2">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">Best Bid</div>
          <div className="text-xl font-bold font-data text-primary mt-0.5">
            {bestBid ? formatPricePerKg(bestBid.price) : '—'}
          </div>
          <div className="text-sm text-muted mt-0.5">
            {bestBidSizeKg > 0 ? `${bestBidSizeKg.toLocaleString()} kg` : '—'}
          </div>
        </div>
        <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">Best Ask</div>
          <div className="text-xl font-bold font-data text-accent-red mt-0.5">
            {bestAsk ? formatPricePerKg(bestAsk.price) : '—'}
          </div>
          <div className="text-sm text-muted mt-0.5">
            {bestAskSizeKg > 0 ? `${bestAskSizeKg.toLocaleString()} kg` : '—'}
          </div>
        </div>
      </div>

      {/* Order book table: Size (kg) | Bid (per kg) | Ask (per kg) | Size (kg) */}
      <div className="border border-border overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm min-w-[16rem]">
          <thead>
            <tr className="bg-muted-bg border-b border-border text-left">
              <th className="py-2 px-2 sm:px-3 text-xs font-bold uppercase text-muted">Size (kg)</th>
              <th className="py-2 px-3 text-xs font-bold uppercase text-primary">Bid (per kg)</th>
              <th className="py-2 px-3 text-xs font-bold uppercase text-accent-red">Ask (per kg)</th>
              <th className="py-2 px-3 text-xs font-bold uppercase text-muted">Size (kg)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted-bg/50 transition-colors duration-150">
                <td className="py-2 px-3 font-data text-muted">
                  {row.bid ? row.bid.quantity.toLocaleString() : '—'}
                </td>
                <td className="py-2 px-3">
                  {row.bid ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-data font-semibold text-primary">
                        {formatPricePerKg(row.bid.price)}
                      </span>
                      {user && row.bid.creator_id !== user.id && (
                        <TransactButton
                          orderId={row.bid.id}
                          action="Fill"
                          endpoint={`/api/orders/${row.bid.id}/fill`}
                          onSuccess={onUpdate}
                          variant="outline"
                          size="sm"
                        />
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2 px-3">
                  {row.ask ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-data font-semibold text-accent-red">
                        {formatPricePerKg(row.ask.price)}
                      </span>
                      {user && row.ask.creator_id !== user.id && (
                        <TransactButton
                          orderId={row.ask.id}
                          action="Buy"
                          endpoint={`/api/orders/${row.ask.id}/fill`}
                          onSuccess={onUpdate}
                          variant="primary"
                          size="sm"
                        />
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2 px-3 font-data text-muted">
                  {row.ask ? row.ask.quantity.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-2">
        <CropNameLink
          cropName={CROP_LABELS[cropType as keyof typeof CROP_LABELS]}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {CROP_LABELS[cropType as keyof typeof CROP_LABELS]}
        </CropNameLink>{' '}
        · Deliver by {formatDeliveryDate(deliveryDate)}
      </p>
    </div>
  );
}
