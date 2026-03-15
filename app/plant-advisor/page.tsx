'use client';

import { useState, useEffect } from 'react';
import { PlantRecommendation, CropType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CropNameLink } from '@/components/crop-name-link';
import { formatPrice, formatRevenue } from '@/lib/format';
import Link from 'next/link';

export default function PlantAdvisorPage() {
  const [recommendations, setRecommendations] = useState<PlantRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PlantRecommendation[]>('/api/analytics/plant-advisor')
      .then(setRecommendations)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-muted">Analyzing market demand...</div>;

  const top3 = recommendations.slice(0, 3);
  const rest = recommendations.slice(3);

  return (
    <div className="flex flex-col min-h-0">
      <section className="border-b border-border pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">What Should I Plant?</h1>
        <p className="text-muted text-xs sm:text-sm mt-1">
          Crops ranked by projected revenue per acre based on current buy orders (price per kg)
        </p>
      </section>

      {/* Top 3: full-width rows with thin borders */}
      <section className="border-b border-border">
        <div className="divide-y divide-border">
          {top3.map((rec, i) => (
            <div key={rec.crop_type} className={`px-4 sm:px-6 py-4 ${i === 0 ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">
                    #{i + 1} Recommended
                  </div>
                  <CropNameLink
                    cropName={CROP_LABELS[rec.crop_type]}
                    className="text-lg font-bold text-foreground hover:text-primary hover:underline"
                  >
                    {CROP_LABELS[rec.crop_type]}
                  </CropNameLink>
                </div>
                {rec.demand_supply_ratio === Infinity && (
                  <Badge variant="ask">No Supply!</Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted">Projected Revenue/Acre</span>
                <span className="font-data font-bold text-primary">{formatRevenue(rec.projected_revenue_per_acre)}</span>
                <span className="text-muted">Avg Bid (per kg)</span>
                <span className="font-data">{formatPrice(rec.avg_bid_price)}/kg</span>
                <span className="text-muted">Open Demand</span>
                <span className="font-data">{rec.total_demand.toLocaleString()} kg</span>
                <span className="text-muted">Yield/Acre</span>
                <span className="font-data">{rec.yield_per_acre} {CROP_UNIT[rec.crop_type]}</span>
                <span className="text-muted">Demand/Supply</span>
                <span className="font-data font-semibold">
                  {rec.demand_supply_ratio === Infinity ? 'No supply' : `${rec.demand_supply_ratio}x`}
                </span>
              </div>
              <div className="mt-3">
                <Link href={`/hedge-flow?crop=${rec.crop_type}`} className="block touch-manipulation">
                  <Button variant="outline" size="sm" className="min-h-[2.5rem]">
                    Start Hedge Flow
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All Crops table */}
      {rest.length > 0 && (
        <section className="border-b border-border flex-1">
          <div className="px-4 sm:px-6 py-3 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">All Crops</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Rank</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Crop</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Revenue/Acre</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Avg Bid/kg</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Demand (kg)</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">D/S Ratio</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rest.map((rec, i) => (
                    <tr key={rec.crop_type} className="hover:bg-muted-bg/50 transition-colors duration-150">
                      <td className="py-3 px-2 sm:px-4 font-data text-muted">#{i + 4}</td>
                      <td className="py-3 font-medium">
                        <CropNameLink
                          cropName={CROP_LABELS[rec.crop_type]}
                          className="hover:text-primary hover:underline"
                        >
                          {CROP_LABELS[rec.crop_type]}
                        </CropNameLink>
                      </td>
                      <td className="py-3 font-data font-semibold text-primary">{formatRevenue(rec.projected_revenue_per_acre)}</td>
                      <td className="py-3 font-data">{formatPrice(rec.avg_bid_price)}/kg</td>
                      <td className="py-3 font-data">{rec.total_demand.toLocaleString()}</td>
                      <td className="py-3 font-data">
                        {rec.demand_supply_ratio === Infinity ? 'No supply' : `${rec.demand_supply_ratio}x`}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <Link href={`/hedge-flow?crop=${rec.crop_type}`} className="inline-block touch-manipulation">
                          <Button variant="ghost" size="sm" className="min-h-[2.25rem]">Hedge</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        </section>
      )}
    </div>
  );
}
