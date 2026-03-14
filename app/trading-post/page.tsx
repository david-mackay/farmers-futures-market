'use client';

import { useState, useMemo } from 'react';
import { Order, OrderType, CropType } from '@/shared/types';
import { CROP_LABELS, LOT_SIZE, CROP_UNIT } from '@/shared/constants';
import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/hooks/use-user';
import { DeliveryDateFilter } from '@/components/order-book/delivery-date-filter';
import { OrderForm } from '@/components/order-book/order-form';
import { TransactButton } from '@/components/transact-button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatPrice, formatDeliveryDate, formatLots, cropLabel } from '@/lib/format';

const cropOptions = [
  { value: '', label: 'All Crops' },
  ...Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label })),
];

export default function TradingPostPage() {
  const [deliveryMonth, setDeliveryMonth] = useState('');
  const [cropType, setCropType] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { orders, loading, refetch } = useOrders({
    crop_type: cropType || undefined,
    status: 'OPEN',
    delivery_month: deliveryMonth || undefined,
  });

  const { user } = useUser();

  // Split into sell orders (ASK) and buy orders (BID), sorted by price
  const sellOrders = useMemo(
    () => orders.filter(o => o.type === OrderType.ASK).sort((a, b) => a.price - b.price),
    [orders]
  );
  const buyOrders = useMemo(
    () => orders.filter(o => o.type === OrderType.BID).sort((a, b) => b.price - a.price),
    [orders]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trading Post</h1>
          <p className="text-muted text-sm mt-1">
            Each contract is <span className="font-semibold">{LOT_SIZE} units</span> (1 lot).
            Sell orders are from farmers. Buy orders are from grocers looking to purchase.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="md">
          + New Order
        </Button>
      </div>

      {/* Delivery date filter */}
      <Card>
        <DeliveryDateFilter value={deliveryMonth} onChange={setDeliveryMonth} />
      </Card>

      {/* Crop filter */}
      <div className="w-56">
        <Select
          value={cropType}
          onChange={(e) => setCropType(e.target.value)}
          options={cropOptions}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Loading orders...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SELL ORDERS (left) — things to compete with if farmer, things to buy if grocer */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-accent-red" />
              <h2 className="text-lg font-bold text-foreground">
                Sell Orders
              </h2>
              <span className="text-sm text-muted">
                {user?.role === 'FARMER' ? '(your competition)' : '(available to buy)'}
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              {user?.role === 'FARMER'
                ? 'Other farmers are offering these contracts. You can undercut these prices or find dates with no supply.'
                : 'Farmers are selling futures at these prices. Click "Buy" to lock in a delivery.'}
            </p>
            <div className="space-y-2">
              {sellOrders.length === 0 ? (
                <Card className="text-center py-8 text-muted text-sm">
                  No sell orders yet.
                  {user?.role === 'FARMER' && user?.is_verified && ' Be the first to list!'}
                </Card>
              ) : (
                sellOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    side="sell"
                    user={user}
                    onUpdate={refetch}
                  />
                ))
              )}
            </div>
          </div>

          {/* BUY ORDERS (right) — things to fill if farmer, things to compete with if grocer */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <h2 className="text-lg font-bold text-foreground">
                Buy Orders
              </h2>
              <span className="text-sm text-muted">
                {user?.role === 'FARMER' ? '(requests you can fill)' : '(your competition)'}
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              {user?.role === 'FARMER'
                ? 'Grocers want to buy at these prices. Click "Fill Order" to accept a contract and lock in revenue.'
                : 'Other buyers are bidding at these prices. You can outbid them or wait for a sell order.'}
            </p>
            <div className="space-y-2">
              {buyOrders.length === 0 ? (
                <Card className="text-center py-8 text-muted text-sm">
                  No buy orders yet. Grocers haven&apos;t posted bids for this crop/date.
                </Card>
              ) : (
                buyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    side="buy"
                    user={user}
                    onUpdate={refetch}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New order modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New Order">
        <OrderForm onSuccess={() => { setShowForm(false); refetch(); }} />
      </Modal>
    </div>
  );
}

function OrderCard({
  order,
  side,
  user,
  onUpdate,
}: {
  order: Order;
  side: 'buy' | 'sell';
  user: any;
  onUpdate?: () => void;
}) {
  const isOwn = user && order.creator_id === user.id;
  const unit = CROP_UNIT[order.crop_type];

  return (
    <Card className="!p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-4">
        {/* Left: crop + delivery info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{cropLabel(order.crop_type)}</span>
            <span className="text-xs text-muted bg-muted-bg px-2 py-0.5 rounded">
              {formatLots(order.quantity)}
            </span>
          </div>
          <div className="text-sm text-muted mt-1">
            Deliver by <span className="font-medium text-foreground">{formatDeliveryDate(order.delivery_date)}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            {order.quantity * LOT_SIZE} {unit} total ({LOT_SIZE} {unit}/lot)
          </div>
        </div>

        {/* Center: price */}
        <div className="text-right shrink-0">
          <div className={`text-xl font-bold font-data ${side === 'sell' ? 'text-accent-red' : 'text-primary'}`}>
            {formatPrice(order.price)}
          </div>
          <div className="text-xs text-muted">per {unit}</div>
        </div>

        {/* Right: action */}
        <div className="shrink-0">
          {!isOwn && user && (
            <TransactButton
              orderId={order.id}
              action={side === 'sell' ? 'Buy' : 'Fill Order'}
              endpoint={`/api/orders/${order.id}/fill`}
              onSuccess={onUpdate}
              variant={side === 'sell' ? 'primary' : 'outline'}
              size="sm"
            />
          )}
          {isOwn && (
            <TransactButton
              orderId={order.id}
              action="Cancel"
              endpoint={`/api/orders/${order.id}`}
              method="delete"
              onSuccess={onUpdate}
              variant="ghost"
              size="sm"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
