'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatDeliveryMonth, formatKg, formatPricePerKg } from '@/lib/format';
import { cropLabel } from '@/lib/format';
import { CropType } from '@/shared/types';

interface CropPricePoint {
  month: string;
  avg_price: number;
  filled_volume_kg: number;
}

interface CropPriceAnalyticsResponse {
  crop_type: CropType;
  current_avg_open_price: number;
  recent_avg_filled_price: number;
  price_change_pct: number;
  total_open_volume_kg: number;
  monthly_points: CropPricePoint[];
}

interface CropPriceAnalyticsProps {
  cropType: CropType;
}

function buildSparklinePath(points: CropPricePoint[]) {
  if (points.length === 0) {
    return '';
  }

  const values = points.map((point) => point.avg_price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 100;
  const height = 44;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = max === min
        ? height / 2
        : height - ((point.avg_price - min) / (max - min)) * height;

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatChange(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }
  if (value < 0) {
    return `${value}%`;
  }
  return '0%';
}

export function CropPriceAnalytics({ cropType }: CropPriceAnalyticsProps) {
  const [data, setData] = useState<CropPriceAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const result = await api.get<CropPriceAnalyticsResponse>(
          `/api/analytics/crop-price?crop_type=${encodeURIComponent(cropType)}`
        );

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Market analytics are unavailable right now.');
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [cropType]);

  if (error) {
    return (
      <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Live Market Price</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{cropLabel(cropType)}</h2>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">{error}</p>
      </article>
    );
  }

  if (!data) {
    return (
      <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Live Market Price</p>
        <p className="mt-4 text-sm text-muted">Loading current market movement...</p>
      </article>
    );
  }

  const trendTone = data.price_change_pct > 0
    ? 'text-emerald-700 bg-emerald-500/10'
    : data.price_change_pct < 0
      ? 'text-rose-700 bg-rose-500/10'
      : 'text-muted bg-secondary';
  const trendPath = buildSparklinePath(data.monthly_points);
  const latestPoint = data.monthly_points[data.monthly_points.length - 1];
  const earliestPoint = data.monthly_points[0];

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Live Market Price</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Price pulse</h2>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${trendTone}`}>
          {formatChange(data.price_change_pct)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Open Avg</p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {formatPricePerKg(data.current_avg_open_price)}
          </p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Recent Filled</p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {formatPricePerKg(data.recent_avg_filled_price)}
          </p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Open Volume</p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {formatKg(data.total_open_volume_kg)}
          </p>
        </div>
      </div>

      {data.monthly_points.length > 0 && (
        <div className="mt-5 rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">6-Month Filled Price Trend</p>
              <p className="mt-1 text-sm text-muted">
                {formatDeliveryMonth(earliestPoint.month)} to {formatDeliveryMonth(latestPoint.month)}
              </p>
            </div>
            <p className="text-xs text-muted">Based on fulfilled orders</p>
          </div>

          <svg
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            className="mt-4 h-20 w-full overflow-visible"
            aria-label="Crop price trend"
            role="img"
          >
            <path
              d={trendPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-primary"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
            <span>{formatDeliveryMonth(earliestPoint.month)}</span>
            <span>{formatDeliveryMonth(latestPoint.month)}</span>
          </div>
        </div>
      )}
    </article>
  );
}
