'use client';

import { useState, useEffect } from 'react';
import { PlantRecommendation, CropType } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">What Should I Plant?</h1>
        <p className="text-muted text-sm mt-1">
          Crops ranked by projected revenue per acre based on current buy orders
        </p>
      </div>

      {/* Top 3 recommendation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((rec, i) => (
          <Card key={rec.crop_type} className={i === 0 ? 'border-2 border-primary ring-2 ring-primary/10' : ''}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  #{i + 1} Recommended
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {CROP_LABELS[rec.crop_type]}
                </h3>
              </div>
              {rec.demand_supply_ratio === Infinity && (
                <Badge variant="ask">No Supply!</Badge>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted">Projected Revenue/Acre</span>
                <span className="font-data font-bold text-primary text-lg">
                  {formatRevenue(rec.projected_revenue_per_acre)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Avg Bid Price</span>
                <span className="font-data">{formatPrice(rec.avg_bid_price)}/{CROP_UNIT[rec.crop_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Open Demand</span>
                <span className="font-data">{rec.total_demand.toLocaleString()} {CROP_UNIT[rec.crop_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Yield/Acre</span>
                <span className="font-data">{rec.yield_per_acre} {CROP_UNIT[rec.crop_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Demand/Supply</span>
                <span className="font-data font-semibold">
                  {rec.demand_supply_ratio === Infinity ? 'No supply' : `${rec.demand_supply_ratio}x`}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Link href={`/hedge-flow?crop=${rec.crop_type}`}>
                <Button variant="outline" size="sm" className="w-full">
                  Start Hedge Flow
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Full table for remaining */}
      {rest.length > 0 && (
        <Card padding={false}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">All Crops</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Rank</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Crop</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Revenue/Acre</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Avg Bid</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Demand</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">D/S Ratio</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rest.map((rec, i) => (
                    <tr key={rec.crop_type} className="hover:bg-muted-bg/50">
                      <td className="py-3 font-data text-muted">#{i + 4}</td>
                      <td className="py-3 font-medium">{CROP_LABELS[rec.crop_type]}</td>
                      <td className="py-3 font-data font-semibold text-primary">{formatRevenue(rec.projected_revenue_per_acre)}</td>
                      <td className="py-3 font-data">{formatPrice(rec.avg_bid_price)}</td>
                      <td className="py-3 font-data">{rec.total_demand.toLocaleString()}</td>
                      <td className="py-3 font-data">
                        {rec.demand_supply_ratio === Infinity ? 'No supply' : `${rec.demand_supply_ratio}x`}
                      </td>
                      <td className="py-3">
                        <Link href={`/hedge-flow?crop=${rec.crop_type}`}>
                          <Button variant="ghost" size="sm">Hedge</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
