'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, Package, Sparkles } from 'lucide-react';
import { Order, OrderType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useUser } from '@/hooks/use-user';
import { useWatchedCrops } from '@/hooks/use-watched-crops';
import { useOrders } from '@/hooks/use-orders';
import { CropSearchModal } from '@/components/crop-search-modal';
import { CropNameLink } from '@/components/crop-name-link';
import { formatPrice, formatDeliveryDate, formatKg, formatRevenue } from '@/lib/format';
import { computeCropPreviews } from '@/lib/crop-previews';
import { isSeller, isBuyer } from '@/lib/order-role';
import { api } from '@/lib/api-client';
import { CropType } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { parseCropsProduced, computeOptimizedPlan } from '@/lib/farm-optimizer';
import type { OptimizedPlan } from '@/shared/types';

const today = () => new Date().toISOString().slice(0, 10);

export default function DashboardPage() {
  const { user } = useUser();
  const { watched } = useWatchedCrops();
  const [searchOpen, setSearchOpen] = useState(false);
  const [farmerTab, setFarmerTab] = useState<'orders' | 'optimize'>('orders');
  const [optimizedPlan, setOptimizedPlan] = useState<OptimizedPlan | null>(null);

  const { orders, loading } = useOrders({ status: 'OPEN' });
  const { orders: openBidOrders, loading: loadingBids } = useOrders({ status: 'OPEN', type: OrderType.BID });
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

  const [escrowLoading, setEscrowLoading] = useState<string | null>(null);

  const [previews, setPreviews] = useState<ReturnType<typeof computeCropPreviews>>([]);

  useEffect(() => {
    setPreviews(computeCropPreviews(orders));
  }, [orders]);

  const previewByCrop = new Map(previews.map(p => [p.crop_type, p]));

  const upcomingDeliveries = useMemo(() => {
    const cutoff = today();
    const seen = new Set<string>();
    const merged = [...filledByMe, ...createdByMeFilled].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    return merged
      .filter((o) => o.delivery_date >= cutoff)
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [filledByMe, createdByMeFilled]);

  const deliveriesLoading = loadingFilledByMe || loadingCreatedByMe;

  const isFarmer = user?.is_farmer;
  const farmerCrops = useMemo(() => parseCropsProduced(user?.crops_produced ?? null), [user?.crops_produced]);
  const pendingBuyOrdersForFarmer = useMemo(() => {
    if (!isFarmer || farmerCrops.length === 0) return [];
    const set = new Set(farmerCrops);
    return openBidOrders.filter((o) => set.has(o.crop_type as CropType)).sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
  }, [isFarmer, farmerCrops, openBidOrders]);
  const displayCrops = watched;

  const handleOptimize = useCallback(() => {
    const acreage = user?.acreage ?? 0;
    if (acreage <= 0 || farmerCrops.length === 0) return;
    const plan = computeOptimizedPlan({
      farmerCrops,
      acreage,
      openBidOrders,
    });
    setOptimizedPlan(plan);
  }, [user?.acreage, farmerCrops, openBidOrders]);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header: farmer gets Orders | Optimize tabs; non-farmer gets Watchlist */}
      <section className="border-b border-border">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            {isFarmer ? (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {farmerTab === 'orders' ? 'Pending buy orders' : 'Optimize plan'}
                </h1>
                <p className="text-muted text-xs sm:text-sm mt-0.5 truncate">
                  {farmerTab === 'orders'
                    ? 'Buy orders for crops you grow (from your profile)'
                    : 'Allocate acreage by yield, price, and time to harvest'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Watchlist</h1>
                <p className="text-muted text-xs sm:text-sm mt-0.5 truncate">
                  Lowest ask on highest supply day
                </p>
              </>
            )}
          </div>
          {!isFarmer && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="shrink-0 p-3 rounded-xl border border-border bg-card text-muted hover:bg-muted-bg hover:text-foreground active:bg-muted-bg transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation min-h-[2.75rem] min-w-[2.75rem]"
              aria-label="Search crops"
            >
              <Search className="w-5 h-5 sm:w-5 sm:h-5" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
        {isFarmer && (
          <div className="flex border-t border-border">
            <button
              type="button"
              onClick={() => setFarmerTab('orders')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                farmerTab === 'orders'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted border-b-2 border-transparent hover:text-foreground'
              }`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setFarmerTab('optimize')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                farmerTab === 'optimize'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted border-b-2 border-transparent hover:text-foreground'
              }`}
            >
              Optimize
            </button>
          </div>
        )}
      </section>

      {/* Upcoming deliveries: as seller (delivering, getting paid) or buyer (receiving, paying) */}
      {upcomingDeliveries.length > 0 && user && (
        <section className="border-b border-border">
          <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-muted" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-foreground">Upcoming deliveries</h2>
              <p className="text-xs text-muted mt-0.5">Delivering (you get paid) or receiving (you pay)</p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {upcomingDeliveries.map((order) => {
              const total = order.quantity * order.price;
              const delivering = isSeller(order, user.id);
              const asBuyer = isBuyer(order, user.id);
              const asSeller = delivering;
              const loadingThis = escrowLoading === order.id;
              const runEscrow = async (action: 'fund' | 'deliver' | 'confirm' | 'contest' | 'resolve', resolution?: 'release' | 'refund') => {
                setEscrowLoading(order.id);
                try {
                  if (action === 'resolve') {
                    await api.post(`/api/orders/${order.id}/escrow/resolve`, { resolution: resolution ?? 'release' });
                  } else {
                    await api.post(`/api/orders/${order.id}/escrow/${action}`);
                  }
                  refreshDeliveries();
                } finally {
                  setEscrowLoading(null);
                }
              };
              return (
                <li key={order.id}>
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
                          {delivering
                            ? `${formatPrice(total)} to receive`
                            : `${formatPrice(total)} to pay`}
                        </div>
                        <div className="text-xs text-muted">
                          {formatPrice(order.price)}/kg
                        </div>
                      </div>
                    </div>
                    {/* Escrow status and actions */}
                    <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
                      {order.funds_released_at && (
                        <span className="text-muted">Funds released</span>
                      )}
                      {order.contested_at && !order.funds_released_at && (
                        <>
                          <span className="text-accent-red">Contested – under review</span>
                          <Button size="sm" variant="outline" disabled={loadingThis} onClick={() => runEscrow('resolve', 'release')}>
                            Resolve (release to seller)
                          </Button>
                          <Button size="sm" variant="outline" disabled={loadingThis} onClick={() => runEscrow('resolve', 'refund')}>
                            Resolve (refund buyer)
                          </Button>
                        </>
                      )}
                      {!order.funds_released_at && !order.contested_at && asBuyer && (
                        <>
                          {!order.escrow_funded_at && (
                            <Button size="sm" disabled={loadingThis} onClick={() => runEscrow('fund')}>
                              Fund escrow ({formatPrice(total)})
                            </Button>
                          )}
                          {order.escrow_funded_at && !order.delivered_at && (
                            <span className="text-muted">Waiting for seller to deliver</span>
                          )}
                          {order.delivered_at && (
                            <>
                              <Button size="sm" disabled={loadingThis} onClick={() => runEscrow('confirm')}>
                                Confirm receipt
                              </Button>
                              <Button size="sm" variant="outline" disabled={loadingThis} onClick={() => runEscrow('contest')}>
                                Contest
                              </Button>
                              <span className="text-muted">Auto-releases in 2 days if no action</span>
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
                            <Button size="sm" disabled={loadingThis} onClick={() => runEscrow('deliver')}>
                              Mark as delivered
                            </Button>
                          )}
                          {order.delivered_at && (
                            <span className="text-muted">Delivery attested · waiting for buyer or 2-day auto-release</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Farmer: Orders tab = scroll list of pending buy orders by profile crops */}
      {isFarmer && farmerTab === 'orders' && (
        <section className="flex-1 overflow-auto">
          {loadingBids ? (
            <div className="py-8 text-center text-muted text-sm">Loading orders…</div>
          ) : farmerCrops.length === 0 ? (
            <div className="py-8 px-4 text-center border-b border-border">
              <p className="text-muted mb-2">Add crops to your profile to see buy orders.</p>
              <Link href="/profile" className="text-primary font-medium hover:underline">
                Edit profile
              </Link>
            </div>
          ) : pendingBuyOrdersForFarmer.length === 0 ? (
            <div className="py-8 px-4 text-center border-b border-border">
              <p className="text-muted">No pending buy orders for your crops right now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingBuyOrdersForFarmer.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/explore?crop=${order.crop_type}&date=${order.delivery_date}`}
                    className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-3 hover:bg-muted-bg/30 active:bg-muted-bg/30 transition-colors cursor-pointer min-h-[3.5rem] touch-manipulation block"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-foreground">
                        {CROP_LABELS[order.crop_type as CropType]}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {formatDeliveryDate(order.delivery_date)} · {formatKg(order.quantity)}
                      </div>
                    </div>
                    <div className="shrink-0 min-w-[4.5rem] px-2.5 py-1.5 rounded text-right font-bold font-data text-sm bg-primary/10 text-primary">
                      {formatPrice(order.price)}/kg
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Farmer: Optimize tab = button + optimized plan */}
      {isFarmer && farmerTab === 'optimize' && (
        <section className="flex-1 overflow-auto px-4 sm:px-6 py-4">
          <div className="mx-auto max-w-2xl">
            {farmerCrops.length === 0 ? (
              <div className="py-8 text-center text-muted">
                <p className="mb-2">Add crops to your profile first.</p>
                <Link href="/profile" className="text-primary font-medium hover:underline">
                  Edit profile
                </Link>
              </div>
            ) : (user?.acreage ?? 0) <= 0 ? (
              <div className="py-8 text-center text-muted">
                <p className="mb-2">Set your farm acreage in your profile to optimize.</p>
                <Link href="/profile" className="text-primary font-medium hover:underline">
                  Edit profile
                </Link>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleOptimize}
                  disabled={loadingBids}
                  className="w-full sm:w-auto min-h-[2.75rem] gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Create optimized plan
                </Button>
                {optimizedPlan && (
                  <div className="mt-6 border border-border rounded-xl overflow-hidden bg-card">
                    {optimizedPlan.rows.length === 0 ? (
                      <div className="px-4 py-6 text-center text-muted text-sm">
                        <p className="mb-1">No plan could be generated.</p>
                        <p>There are no open buy orders for your profile crops, or demand is zero.</p>
                      </div>
                    ) : (
                      <>
                        <div className="px-4 sm:px-6 py-3 bg-muted-bg/50 border-b border-border flex flex-wrap gap-4 sm:gap-6">
                          <span className="font-data font-semibold">
                            {optimizedPlan.total_acres_used} acres used
                          </span>
                          <span className="font-data font-semibold text-primary">
                            {formatRevenue(optimizedPlan.total_estimated_revenue)} projected
                          </span>
                        </div>
                        <ul className="divide-y divide-border">
                          {optimizedPlan.rows.map((row) => (
                            <li key={row.crop_type} className="px-4 sm:px-6 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-foreground">
                                  {CROP_LABELS[row.crop_type]}
                                </div>
                                {row.delivery_too_soon && (
                                  <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    Delivery too soon
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-sm text-muted">
                                <span>Acres</span>
                                <span className="font-data">{row.acres}</span>
                                <span>Est. kg</span>
                                <span className="font-data">{row.estimated_kg.toLocaleString()}</span>
                                <span>Revenue</span>
                                <span className="font-data text-foreground">{formatRevenue(row.estimated_revenue)}</span>
                                <span>Plant by</span>
                                <span className={`font-data ${row.delivery_too_soon ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                  {formatDeliveryDate(row.plant_by_date)}
                                </span>
                                <span>Delivery</span>
                                <span className="font-data">{formatDeliveryDate(row.delivery_date)}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Non-farmer: Watchlist */}
      {!isFarmer && (
        <>
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
                const buyerPreview = preview?.buyer;
                const bestDate = buyerPreview?.delivery_date;
                const bestLabel = buyerPreview?.delivery_label;
                const price = buyerPreview?.price;
                const volumeKg = buyerPreview?.volume_kg;

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
                        <div className="min-w-[4.5rem] px-2.5 py-1.5 rounded text-right font-bold font-data text-sm bg-accent-red/10 text-accent-red">
                          {price != null ? `${formatPrice(price)}/kg` : '—'}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
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
