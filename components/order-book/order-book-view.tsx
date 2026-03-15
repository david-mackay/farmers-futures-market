'use client';

import { useState, useEffect } from 'react';
import { Order, OrderType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { useFillWithPayment } from '@/hooks/use-fill-with-payment';
import { Button } from '@/components/ui/button';
import { TransactButton } from '@/components/transact-button';
import { FillConfirmModal } from '@/components/order-book/fill-confirm-modal';
import { CropNameLink } from '@/components/crop-name-link';
import { formatPricePerKg, formatDeliveryDate } from '@/lib/format';
import { api } from '@/lib/api-client';

interface LastPriceResult {
  livePrice: number | null;
  source: 'last_trade' | 'mid' | null;
}

interface OrderBookViewProps {
  orders: Order[];
  cropType: string;
  deliveryDate: string;
  onUpdate?: () => void;
}

/** Level II–style order book: best bid/ask at top, then Fill | Size | Bid | Ask | Size | Buy — buttons on ends, prices center */
export function OrderBookView({ orders, cropType, deliveryDate, onUpdate }: OrderBookViewProps) {
  const { user } = useUser();
  const devMode = useDevMode();
  const { executeFill, loading: fillPaymentLoading, error: fillPaymentError, clearError: clearFillError, canFill } = useFillWithPayment();
  const [livePrice, setLivePrice] = useState<LastPriceResult>({ livePrice: null, source: null });
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [fillLoading, setFillLoading] = useState(false);

  useEffect(() => {
    if (!cropType || !deliveryDate) return;
    const fetchPrice = () => {
      api
        .get<LastPriceResult>(`/api/market/last-price?crop_type=${encodeURIComponent(cropType)}&delivery_date=${encodeURIComponent(deliveryDate)}`)
        .then(setLivePrice)
        .catch(() => {});
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => clearInterval(interval);
  }, [cropType, deliveryDate]);
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

  const handleFillConfirm = async () => {
    if (!confirmOrder) return;
    if (devMode) {
      setFillLoading(true);
      try {
        await api.post(`/api/orders/${confirmOrder.id}/fill`);
        setConfirmOrder(null);
        onUpdate?.();
      } finally {
        setFillLoading(false);
      }
      return;
    }
    const ok = await executeFill(confirmOrder.id);
    if (ok) {
      setConfirmOrder(null);
      onUpdate?.();
    }
  };

  // Build rows by convergence: pair bid rows with ask rows (bid desc, ask asc)
  const maxRows = Math.max(bids.length, asks.length);
  const rows: { bid?: Order; ask?: Order }[] = [];
  for (let i = 0; i < maxRows; i++) {
    rows.push({ bid: bids[i], ask: asks[i] });
  }

  return (
    <div className="space-y-0">
      {/* Live price: last filled or mid */}
      {livePrice.livePrice != null && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted-bg/60 px-3 py-2 border border-border">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Live</span>
          <span className="font-data font-bold text-foreground">{formatPricePerKg(livePrice.livePrice)}</span>
          <span className="text-xs text-muted">
            {livePrice.source === 'last_trade' ? '(last trade)' : livePrice.source === 'mid' ? '(mid)' : ''}
          </span>
        </div>
      )}

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

      {/* Order book table: Fill | Size | Bid | Ask | Size | Buy — buttons on ends, prices center, size middle */}
      <div className="border border-border overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm min-w-[20rem]">
          <thead>
            <tr className="bg-muted-bg border-b border-border text-left">
              <th className="py-2 pl-2 sm:pl-3 pr-1 text-xs font-bold uppercase text-muted w-0">Fill</th>
              <th className="py-2 px-1 sm:px-2 text-xs font-bold uppercase text-muted">Size</th>
              <th className="py-2 px-2 sm:px-3 text-xs font-bold uppercase text-primary text-center">Bid (per kg)</th>
              <th className="py-2 px-2 sm:px-3 text-xs font-bold uppercase text-accent-red text-center">Ask (per kg)</th>
              <th className="py-2 px-1 sm:px-2 text-xs font-bold uppercase text-muted">Size</th>
              <th className="py-2 pr-2 sm:pr-3 pl-1 text-xs font-bold uppercase text-muted w-0">Buy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted-bg/50 transition-colors duration-150">
                <td className="py-2 pl-2 sm:pl-3 pr-1 align-middle">
                  {row.bid && user && row.bid.creator_id !== user.id ? (
                    devMode ? (
                      <TransactButton
                        orderId={row.bid.id}
                        action="Fill"
                        endpoint={`/api/orders/${row.bid.id}/fill`}
                        onSuccess={onUpdate}
                        variant="outline"
                        size="sm"
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmOrder(row.bid!)}
                      >
                        Fill
                      </Button>
                    )
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="py-2 px-1 sm:px-2 font-data text-muted align-middle">
                  {row.bid ? row.bid.quantity.toLocaleString() : '—'}
                </td>
                <td className="py-2 px-2 sm:px-3 font-data font-semibold text-primary text-center align-middle">
                  {row.bid ? formatPricePerKg(row.bid.price) : '—'}
                </td>
                <td className="py-2 px-2 sm:px-3 font-data font-semibold text-accent-red text-center align-middle">
                  {row.ask ? formatPricePerKg(row.ask.price) : '—'}
                </td>
                <td className="py-2 px-1 sm:px-2 font-data text-muted align-middle">
                  {row.ask ? row.ask.quantity.toLocaleString() : '—'}
                </td>
                <td className="py-2 pr-2 sm:pr-3 pl-1 align-middle">
                  {row.ask && user && row.ask.creator_id !== user.id ? (
                    devMode ? (
                      <TransactButton
                        orderId={row.ask.id}
                        action="Buy"
                        endpoint={`/api/orders/${row.ask.id}/fill`}
                        onSuccess={onUpdate}
                        variant="primary"
                        size="sm"
                      />
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirmOrder(row.ask!)}
                      >
                        Buy
                      </Button>
                    )
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmOrder && (
        <FillConfirmModal
          open={!!confirmOrder}
          onClose={() => { clearFillError(); setConfirmOrder(null); }}
          order={confirmOrder}
          actionLabel={confirmOrder.type === OrderType.BID ? 'Fill' : 'Buy'}
          onConfirm={handleFillConfirm}
          loading={devMode ? fillLoading : fillPaymentLoading}
          error={fillPaymentError}
          confirmDisabled={!devMode && !canFill}
          confirmDisabledReason={!canFill ? 'Connect wallet first' : undefined}
        />
      )}

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
