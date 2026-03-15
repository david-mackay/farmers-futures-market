'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';
import { useCurrency } from '@/contexts/currency-context';

interface PriceHistoryPoint {
  filled_at: string;
  price: number;
}

interface CropPriceChartProps {
  cropType: string;
  cropName: string;
  className?: string;
}

export function CropPriceChart({ cropType, cropName, className = '' }: CropPriceChartProps) {
  useCurrency(); // re-render when JMD/USD toggled
  const [points, setPoints] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ points: PriceHistoryPoint[] }>(`/api/market/price-history?crop_type=${encodeURIComponent(cropType)}`)
      .then((res) => setPoints(res.points ?? []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [cropType]);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-border bg-card p-5 animate-pulse ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Price history</p>
        <div className="h-48 mt-4 bg-muted-bg/50 rounded-lg" />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Price history</p>
        <p className="text-sm text-muted mt-4">No filled orders yet for {cropName}. Prices will appear here once trades are filled.</p>
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  const width = 400;
  const height = 180;
  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const x = (i: number) => padding.left + (i / Math.max(points.length - 1, 1)) * chartWidth;
  const y = (price: number) => padding.top + chartHeight - ((price - minPrice) / range) * chartHeight;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.price)}`)
    .join(' ');

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Price history (filled orders)</p>
      <p className="text-sm text-muted mt-0.5">{cropName} · {points.length} trade{points.length !== 1 ? 's' : ''}</p>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[280px] h-48" aria-hidden>
          {/* Y axis labels */}
          {[minPrice, (minPrice + maxPrice) / 2, maxPrice].map((v, i) => (
            <text
              key={i}
              x={padding.left - 6}
              y={y(v)}
              textAnchor="end"
              className="fill-muted text-[10px] font-data"
              alignmentBaseline="middle"
            >
              {formatPrice(v)}
            </text>
          ))}
          {/* X axis labels */}
          {points.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 6}
                textAnchor="start"
                className="fill-muted text-[10px]"
              >
                {formatDate(points[0].filled_at)}
              </text>
              {points.length > 1 && (
                <text
                  x={width - padding.right}
                  y={height - 6}
                  textAnchor="end"
                  className="fill-muted text-[10px]"
                >
                  {formatDate(points[points.length - 1].filled_at)}
                </text>
              )}
            </>
          )}
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
