'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, PlantRecommendation } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatDeliveryDate, formatRevenue, cropLabel, formatLots } from '@/lib/format';
import { useSocketEvent } from '@/hooks/use-socket';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [recommendations, setRecommendations] = useState<PlantRecommendation[]>([]);
  const [recentActivity, setRecentActivity] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Order[]>('/api/orders?status=OPEN'),
      api.get<PlantRecommendation[]>('/api/analytics/plant-advisor'),
    ]).then(([o, r]) => {
      setOrders(o);
      setRecommendations(r);
      setRecentActivity(o.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  useSocketEvent('order:created', (order) => {
    setRecentActivity(prev => [order, ...prev].slice(0, 5));
  });
  useSocketEvent('order:filled', (order) => {
    setRecentActivity(prev => [order, ...prev].slice(0, 5));
  });

  const openOrderCount = orders.length;
  const buyOrderCount = orders.filter(o => o.type === 'BID').length;
  const sellOrderCount = orders.filter(o => o.type === 'ASK').length;
  const topCrop = recommendations[0];

  if (loading) return <div className="text-center py-12 text-muted">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold">
          <span className="text-primary">Future&apos;s</span>{' '}
          <span className="text-foreground">Farmer&apos;s Market</span>
        </h1>
        <p className="text-muted mt-2 text-lg">
          Plan your harvest. Lock in prices. Trade crop futures.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-muted uppercase font-bold">Open Orders</div>
          <div className="text-3xl font-bold font-data mt-2">{openOrderCount}</div>
          <div className="text-sm text-muted mt-1">
            {buyOrderCount} buy &middot; {sellOrderCount} sell
          </div>
          <Link href="/trading-post" className="text-sm text-primary mt-2 inline-block hover:underline">
            View Trading Post &rarr;
          </Link>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase font-bold">Top Recommended Crop</div>
          <div className="text-3xl font-bold mt-2">{topCrop ? CROP_LABELS[topCrop.crop_type] : '\u2014'}</div>
          {topCrop && (
            <div className="text-sm text-muted mt-1 font-data">
              {formatRevenue(topCrop.projected_revenue_per_acre)}/acre projected
            </div>
          )}
          <Link href="/plant-advisor" className="text-sm text-primary mt-2 inline-block hover:underline">
            View Plant Advisor &rarr;
          </Link>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase font-bold">Unfilled Demand</div>
          <div className="text-3xl font-bold mt-2 font-data">
            {buyOrderCount > sellOrderCount
              ? `${buyOrderCount - sellOrderCount} more buyers`
              : 'Balanced'}
          </div>
          <div className="text-sm text-muted mt-1">
            Grocers looking for supply
          </div>
          <Link href="/trading-post" className="text-sm text-primary mt-2 inline-block hover:underline">
            See buy orders &rarr;
          </Link>
        </Card>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/trading-post', title: 'Trading Post', desc: 'Browse & fill orders for crop futures', color: 'border-primary/30 hover:border-primary' },
          { href: '/plant-advisor', title: 'Plant Advisor', desc: 'See which crops have the most demand', color: 'border-accent-blue/30 hover:border-accent-blue' },
          { href: '/hedge-flow', title: 'Hedge Flow', desc: 'Calculate yield and post a sell order', color: 'border-primary/30 hover:border-primary' },
        ].map(nav => (
          <Link key={nav.href} href={nav.href}>
            <Card className={`border-2 ${nav.color} transition-colors cursor-pointer h-full`}>
              <h3 className="font-bold text-foreground">{nav.title}</h3>
              <p className="text-sm text-muted mt-1">{nav.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardTitle>Recent Activity</CardTitle>
        <div className="mt-4 space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-center text-muted py-4">No recent activity</p>
          ) : (
            recentActivity.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={order.type === 'BID' ? 'bid' : 'ask'}>
                    {order.type === 'BID' ? 'BUY' : 'SELL'}
                  </Badge>
                  <span className="font-medium">{cropLabel(order.crop_type)}</span>
                  <span className="font-data text-sm">{formatPrice(order.price)}</span>
                  <span className="text-xs text-muted">{formatLots(order.quantity)}</span>
                </div>
                <div className="text-sm text-muted">
                  {formatDeliveryDate(order.delivery_date)}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
