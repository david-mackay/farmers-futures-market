'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Package } from 'lucide-react';
import { Order } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useUser } from '@/hooks/use-user';
import { useWatchedCrops } from '@/hooks/use-watched-crops';
import { useOrders } from '@/hooks/use-orders';
import { CropSearchModal } from '@/components/crop-search-modal';
import { formatPrice, formatDeliveryDate, formatKg } from '@/lib/format';
import { computeCropPreviews } from '@/lib/crop-previews';
import { CropType } from '@/shared/types';

const today = () => new Date().toISOString().slice(0, 10);

export default function DashboardPage() {
  const { user } = useUser();
  const { watched } = useWatchedCrops();
  const [searchOpen, setSearchOpen] = useState(false);

  const { orders, loading } = useOrders({ status: 'OPEN' });
  const { orders: filledOrders, loading: deliveriesLoading } = useOrders({
    status: 'FILLED',
    filled_by: user?.id ?? undefined,
  });

  const [previews, setPreviews] = useState<ReturnType<typeof computeCropPreviews>>([]);

  useEffect(() => {
    setPreviews(computeCropPreviews(orders));
  }, [orders]);

  const previewByCrop = new Map(previews.map(p => [p.crop_type, p]));

  const upcomingDeliveries = useMemo(() => {
    const cutoff = today();
    return filledOrders
      .filter((o) => o.delivery_date >= cutoff)
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [filledOrders]);

  const isFarmer = user?.role === 'FARMER';
  const displayCrops = watched;

  if (loading) {
    return (
      <div className="text-center py-12 text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header: full-width, thin border below */}
      <section className="border-b border-border">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Watchlist</h1>
            <p className="text-muted text-xs sm:text-sm mt-0.5 truncate">
              {isFarmer ? 'Best bid on highest volume day' : 'Lowest ask on highest supply day'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="shrink-0 p-3 rounded-xl border border-border bg-card text-muted hover:bg-muted-bg hover:text-foreground active:bg-muted-bg transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation min-h-[2.75rem] min-w-[2.75rem]"
            aria-label="Search crops"
          >
            <Search className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </section>

      {/* Upcoming deliveries: orders you bought (filled a sell order) */}
      {upcomingDeliveries.length > 0 && (
        <section className="border-b border-border">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-muted" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-foreground">Upcoming deliveries</h2>
              <p className="text-xs text-muted mt-0.5">Quantity you’re receiving and amount to pay</p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {upcomingDeliveries.map((order) => {
              const total = order.quantity * order.price;
              return (
                <li key={order.id}>
                  <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 min-h-[3.25rem]">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {CROP_LABELS[order.crop_type as CropType]}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {formatDeliveryDate(order.delivery_date)} · Receiving {formatKg(order.quantity)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-data font-semibold text-foreground">
                        {formatPrice(total)} to pay
                      </div>
                      <div className="text-xs text-muted">
                        {formatPrice(order.price)}/kg
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {displayCrops.length === 0 ? (
        <section className="py-8 px-4 text-center border-b border-border">
          <p className="text-muted mb-2">No crops on your watchlist.</p>
          <p className="text-sm text-muted mb-4">Search to add crops you grow or want to buy.</p>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 active:bg-primary/25 transition-colors duration-200 cursor-pointer touch-manipulation min-h-[2.75rem]"
          >
            <Search className="w-4 h-4" strokeWidth={2} aria-hidden />
            Search crops
          </button>
        </section>
      ) : (
        <ul className="divide-y divide-border flex-1">
          {displayCrops.map((crop) => {
            const preview = previewByCrop.get(crop);
            const farmerPreview = preview?.farmer;
            const buyerPreview = preview?.buyer;
            const showFarmer = isFarmer ? farmerPreview : buyerPreview;
            const bestDate = isFarmer ? farmerPreview?.delivery_date : buyerPreview?.delivery_date;
            const bestLabel = isFarmer ? farmerPreview?.delivery_label : buyerPreview?.delivery_label;
            const price = showFarmer?.price;
            const volumeKg = showFarmer?.volume_kg;

            return (
              <li key={crop}>
              <Link
                href={bestDate ? `/explore?crop=${crop}&date=${bestDate}` : `/explore?crop=${crop}`}
                className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-3 hover:bg-muted-bg/30 active:bg-muted-bg/30 transition-colors cursor-pointer min-h-[3.5rem] touch-manipulation"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-foreground">{CROP_LABELS[crop as CropType]}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {bestLabel ? (
                      <>Highest volume · {bestLabel}</>
                    ) : (
                      'No open orders'
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {volumeKg != null && volumeKg > 0 && (
                    <span className="text-xs text-muted hidden sm:inline">
                      {volumeKg >= 1000 ? `${(volumeKg / 1000).toFixed(1)}k` : volumeKg} kg
                    </span>
                  )}
                  <div
                    className={`
                      min-w-[4.5rem] px-2.5 py-1.5 rounded text-right font-bold font-data text-sm
                      ${price != null
                        ? isFarmer
                          ? 'bg-primary/10 text-primary'
                          : 'bg-accent-red/10 text-accent-red'
                        : 'bg-muted-bg text-muted'
                      }
                    `}
                  >
                    {price != null ? `${formatPrice(price)}/kg` : '—'}
                  </div>
                </div>
              </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Quick links: hidden on mobile (use bottom nav) */}
      <div className="hidden md:flex flex-wrap gap-2 mt-4">
        <Link href="/explore" className="text-sm text-primary hover:underline cursor-pointer">
          Explore
        </Link>
      </div>

      <CropSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
