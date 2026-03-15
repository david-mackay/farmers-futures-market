'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Select } from '@/components/ui/select';
import { CROP_LABELS } from '@/shared/constants';
import { CropType } from '@/shared/types';
import { CropNameLink } from '@/components/crop-name-link';
import { formatDeliveryMonth, formatKg, formatPrice } from '@/lib/format';

interface MarketActivityOverview {
  open_orders: number;
  filled_orders: number;
  total_open_volume_kg: number;
  average_open_price: number;
}

interface MarketActivityPoint {
  date: string;
  open_orders: number;
  filled_orders: number;
  volume_kg: number;
}

interface TrendingCrop {
  crop_type: CropType;
  recent_order_count: number;
  previous_order_count: number;
  recent_volume_kg: number;
  average_price: number;
  momentum_pct: number;
}

interface TopSellingCrop {
  crop_type: CropType;
  sold_quantity_kg: number;
  filled_order_count: number;
  avg_filled_price: number;
}

interface PriceMover {
  crop_type: CropType;
  current_avg_price: number;
  previous_avg_price: number;
  change_amount: number;
  change_pct: number;
  direction: 'up' | 'down' | 'flat';
}

interface MarketActivitySummary {
  selected_start_month: string;
  selected_end_month: string;
  previous_start_month: string;
  previous_end_month: string;
  available_months: string[];
  overview: MarketActivityOverview;
  activity_timeline: MarketActivityPoint[];
  trending_crops: TrendingCrop[];
  top_selling_crops: TopSellingCrop[];
  price_movers: PriceMover[];
}

function maxOrOne(values: number[]) {
  return Math.max(1, ...values);
}

function buildLinePath(values: number[], width: number, height: number) {
  if (values.length === 0) return '';
  const max = maxOrOne(values);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function percentLabel(value: number) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function periodLabel(startMonth: string, endMonth: string) {
  return startMonth === endMonth
    ? formatDeliveryMonth(startMonth)
    : `${formatDeliveryMonth(startMonth)} to ${formatDeliveryMonth(endMonth)}`;
}

function changeToneClass(value: number) {
  if (value > 0) return 'text-primary';
  if (value < 0) return 'text-accent-red';
  return 'text-muted';
}

function changeChipClass(value: number) {
  if (value > 0) return 'bg-primary/10 text-primary';
  if (value < 0) return 'bg-accent-red/10 text-accent-red';
  return 'bg-muted-bg text-muted';
}

function compareWidth(current: number, previous: number) {
  return `${Math.max(10, (current / maxOrOne([current, previous])) * 100)}%`;
}

export default function MarketPulsePage() {
  const [data, setData] = useState<MarketActivitySummary | null>(null);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (startMonth) params.set('start_month', startMonth);
    if (endMonth) params.set('end_month', endMonth);
    const suffix = params.toString() ? `?${params.toString()}` : '';

    api.get<MarketActivitySummary>(`/api/analytics/market-activity${suffix}`)
      .then((result) => {
        setData(result);
        if (!startMonth) setStartMonth(result.selected_start_month);
        if (!endMonth) setEndMonth(result.selected_end_month);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [startMonth, endMonth]);

  const activityPath = useMemo(
    () => buildLinePath(data?.activity_timeline.map((point) => point.volume_kg) ?? [], 100, 44),
    [data]
  );

  const monthOptions = useMemo(
    () => (data?.available_months ?? []).map((month) => ({ value: month, label: formatDeliveryMonth(month) })),
    [data]
  );

  if (loading) {
    return <div className="py-16 text-center text-muted">Loading market activity…</div>;
  }

  if (error || !data) {
    return <div className="py-16 text-center text-accent-red">Could not load market activity{error ? `: ${error}` : '.'}</div>;
  }

  const selectedPeriodLabel = periodLabel(data.selected_start_month, data.selected_end_month);
  const previousPeriodLabel = periodLabel(data.previous_start_month, data.previous_end_month);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(0,128,76,0.16),_transparent_40%),linear-gradient(135deg,_var(--color-card),_var(--color-muted-bg))] px-6 py-8 sm:px-8 sm:py-10 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Market Pulse</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              A cleaner read on momentum, liquidity, and price movement.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Compare any month range against the immediately preceding range. This makes the dashboard more useful for
              spotting real shifts instead of one-off spikes.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl">
              <Select
                label="Start Month"
                value={startMonth || data.selected_start_month}
                onChange={(e) => setStartMonth(e.target.value)}
                options={monthOptions}
                placeholder="Select start month"
              />
              <Select
                label="End Month"
                value={endMonth || data.selected_end_month}
                onChange={(e) => setEndMonth(e.target.value)}
                options={monthOptions}
                placeholder="Select end month"
              />
            </div>
            <p className="text-xs text-muted">
              Viewing {selectedPeriodLabel}. Comparison baseline: {previousPeriodLabel}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-2xl lg:max-w-[32rem]">
            <div className="min-w-0 rounded-2xl border border-border bg-card/80 p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Open orders</div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground break-words leading-tight">
                {data.overview.open_orders}
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border bg-card/80 p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Filled orders</div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground break-words leading-tight">
                {data.overview.filled_orders}
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border bg-card/80 p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Open volume</div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground break-words leading-tight">
                {formatKg(data.overview.total_open_volume_kg)}
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-border bg-card/80 p-4">
              <div className="text-xs uppercase tracking-wide text-muted">Avg open price</div>
              <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground break-words leading-tight">
                {formatPrice(data.overview.average_open_price)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Activity Timeline</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Monthly volume across {selectedPeriodLabel}</h2>
            </div>
            <Activity className="h-5 w-5 text-primary" aria-hidden />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted-bg/40 p-4">
            <svg viewBox="0 0 100 44" className="h-40 w-full overflow-visible">
              <path d="M 0 44 L 100 44" className="stroke-border" strokeWidth="0.6" fill="none" />
              <path d={activityPath} className="stroke-primary" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {data.activity_timeline.map((point) => (
                <div key={point.date} className="rounded-xl bg-card p-3">
                  <div className="text-xs text-muted">{formatDeliveryMonth(point.date.slice(0, 7))}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{formatKg(point.volume_kg)}</div>
                  <div className="text-xs text-muted">{point.open_orders} open / {point.filled_orders} filled</div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Price Movers</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Average price comparison vs prior range</h2>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          </div>

          <div className="mt-5 space-y-3">
            {data.price_movers.length === 0 ? (
              <p className="text-sm text-muted">Not enough overlapping pricing history in the selected range.</p>
            ) : (
              data.price_movers.map((mover) => (
                <div key={mover.crop_type} className="rounded-2xl border border-border bg-muted-bg/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CropNameLink
                        cropName={CROP_LABELS[mover.crop_type]}
                        className="font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {CROP_LABELS[mover.crop_type]}
                      </CropNameLink>
                      <div className="mt-1 text-sm text-muted">
                        {previousPeriodLabel}: {formatPrice(mover.previous_avg_price)} | {selectedPeriodLabel}: {formatPrice(mover.current_avg_price)}
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${changeChipClass(mover.change_pct)}`}>
                      {mover.change_pct > 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : null}
                      {mover.change_pct < 0 ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden /> : null}
                      {percentLabel(mover.change_pct)}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-[6.5rem_1fr_6.5rem] items-center gap-3 text-sm">
                    <div className="text-right text-muted">
                      <div className="text-xs">{previousPeriodLabel}</div>
                      <div className="font-medium text-foreground">{formatPrice(mover.previous_avg_price)}</div>
                    </div>
                    <div className="relative h-6">
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
                      <div
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-card bg-muted shadow-sm"
                        style={{ left: `calc(${(mover.previous_avg_price / maxOrOne([mover.previous_avg_price, mover.current_avg_price])) * 100}% - 0.375rem)` }}
                      />
                      <div
                        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-card shadow-sm ${
                          mover.change_pct > 0 ? 'bg-primary' : mover.change_pct < 0 ? 'bg-accent-red' : 'bg-muted'
                        }`}
                        style={{ left: `calc(${(mover.current_avg_price / maxOrOne([mover.previous_avg_price, mover.current_avg_price])) * 100}% - 0.4375rem)` }}
                      />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted">{selectedPeriodLabel}</div>
                      <div className={`font-medium ${changeToneClass(mover.change_pct)}`}>{formatPrice(mover.current_avg_price)}</div>
                    </div>
                  </div>

                  <div className={`mt-3 text-sm font-medium ${changeToneClass(mover.change_amount)}`}>
                    {mover.change_amount > 0 ? '+' : ''}{formatPrice(mover.change_amount)} change
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Trending Crops</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Order flow changes across the selected range</h2>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          </div>

          <div className="mt-5 space-y-4">
            {data.trending_crops.map((crop) => (
              <div key={crop.crop_type} className="rounded-2xl border border-border bg-muted-bg/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CropNameLink
                      cropName={CROP_LABELS[crop.crop_type]}
                      className="font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {CROP_LABELS[crop.crop_type]}
                    </CropNameLink>
                    <div className="mt-1 text-sm text-muted">
                      {crop.recent_order_count} orders in {selectedPeriodLabel} at {formatPrice(crop.average_price)} average
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${changeToneClass(crop.momentum_pct)}`}>{percentLabel(crop.momentum_pct)}</div>
                    <div className="text-xs text-muted">{formatKg(crop.recent_volume_kg)}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-card p-3">
                    <div className="text-xs text-muted">{previousPeriodLabel}</div>
                    <div className="mt-1 font-semibold text-foreground">{crop.previous_order_count} orders</div>
                  </div>
                  <div className="rounded-xl bg-card p-3">
                    <div className="text-xs text-muted">{selectedPeriodLabel}</div>
                    <div className="mt-1 font-semibold text-foreground">{crop.recent_order_count} orders</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Top Selling</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Completed volume across {selectedPeriodLabel}</h2>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          </div>

          <div className="mt-5 space-y-4">
            {data.top_selling_crops.length === 0 ? (
              <p className="text-sm text-muted">No filled orders in the selected range yet.</p>
            ) : (
              data.top_selling_crops.map((crop) => (
                <div key={crop.crop_type} className="grid gap-2 rounded-2xl border border-border bg-muted-bg/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <CropNameLink
                      cropName={CROP_LABELS[crop.crop_type]}
                      className="font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {CROP_LABELS[crop.crop_type]}
                    </CropNameLink>
                    <span className="text-sm font-semibold text-foreground">{formatKg(crop.sold_quantity_kg)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-border/60">
                    <div
                      className="h-2 rounded-full bg-accent-blue"
                      style={{ width: `${(crop.sold_quantity_kg / maxOrOne(data.top_selling_crops.map((item) => item.sold_quantity_kg))) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{crop.filled_order_count} completed trades</span>
                    <span>{formatPrice(crop.avg_filled_price)} avg fill</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">How It Helps</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">What this range view does better</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-muted-bg/40 p-4 text-sm text-muted">
            Range comparisons smooth out noisy month spikes and make persistent trends easier to trust.
          </div>
          <div className="rounded-2xl bg-muted-bg/40 p-4 text-sm text-muted">
            Price movers now show previous vs current averages directly, instead of using bars that exaggerate direction.
          </div>
          <div className="rounded-2xl bg-muted-bg/40 p-4 text-sm text-muted">
            Positive and negative movement now use consistent color semantics across every card.
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/explore" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
            Open the order book
          </Link>
          <Link href="/plant-advisor" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted-bg">
            Compare planting ideas
          </Link>
        </div>
      </section>
    </div>
  );
}
