'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TransactButton } from '@/components/transact-button';
import { FillConfirmModal } from '@/components/order-book/fill-confirm-modal';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { useFillWithPayment } from '@/hooks/use-fill-with-payment';
import { formatPrice, formatKg, formatDeliveryDate, cropLabel } from '@/lib/format';
import { api } from '@/lib/api-client';

interface OrderTableProps {
  orders: Order[];
  onOrderUpdate?: () => void;
}

export function OrderTable({ orders, onOrderUpdate }: OrderTableProps) {
  const { user } = useUser();
  const devMode = useDevMode();
  const { executeFill, loading: fillPaymentLoading, error: fillPaymentError, clearError: clearFillError, canFill } = useFillWithPayment();
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [fillLoading, setFillLoading] = useState(false);

  const handleFillConfirm = async () => {
    if (!confirmOrder) return;
    if (devMode || confirmOrder.type === 'BID') {
      setFillLoading(true);
      try {
        await api.post(`/api/orders/${confirmOrder.id}/fill`);
        setConfirmOrder(null);
        onOrderUpdate?.();
      } finally {
        setFillLoading(false);
      }
      return;
    }
    const ok = await executeFill(confirmOrder.id);
    if (ok) {
      setConfirmOrder(null);
      onOrderUpdate?.();
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        No orders found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Crop</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Type</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Price/kg</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Kg</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Delivery</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Status</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map(order => (
            <tr key={order.id} className="hover:bg-muted-bg/50 transition-colors">
              <td className="py-3 font-medium">{cropLabel(order.crop_type)}</td>
              <td className="py-3">
                <Badge variant={order.type === 'BID' ? 'bid' : 'ask'}>
                  {order.type === 'BID' ? 'BUY' : 'SELL'}
                </Badge>
              </td>
              <td className="py-3 font-data font-semibold">{formatPrice(order.price)}/kg</td>
              <td className="py-3 font-data">{formatKg(order.quantity)}</td>
              <td className="py-3 font-medium text-primary">{formatDeliveryDate(order.delivery_date)}</td>
              <td className="py-3">
                <Badge variant={order.status.toLowerCase() as any}>{order.status}</Badge>
              </td>
              <td className="py-3">
                {order.status === OrderStatus.OPEN && user && order.creator_id !== user.id && (
                  devMode ? (
                    <TransactButton
                      orderId={order.id}
                      action={order.type === 'BID' ? 'Sell to Bidder' : 'Buy Future'}
                      endpoint={`/api/orders/${order.id}/fill`}
                      onSuccess={onOrderUpdate}
                      variant={order.type === 'BID' ? 'secondary' : 'primary'}
                      size="sm"
                    />
                  ) : (
                    <Button
                      variant={order.type === 'BID' ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setConfirmOrder(order)}
                    >
                      {order.type === 'BID' ? 'Sell to Bidder' : 'Buy Future'}
                    </Button>
                  )
                )}
                {order.status === OrderStatus.OPEN && user && order.creator_id === user.id && (
                  <TransactButton
                    orderId={order.id}
                    action="Cancel"
                    endpoint={`/api/orders/${order.id}`}
                    method="delete"
                    onSuccess={onOrderUpdate}
                    variant="danger"
                    size="sm"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmOrder && (
        <FillConfirmModal
          open={!!confirmOrder}
          onClose={() => { clearFillError(); setConfirmOrder(null); }}
          order={confirmOrder}
          actionLabel={confirmOrder.type === 'BID' ? 'Sell to Bidder' : 'Buy Future'}
          onConfirm={handleFillConfirm}
          loading={confirmOrder.type === 'BID' || devMode ? fillLoading : fillPaymentLoading}
          error={fillPaymentError}
          confirmDisabled={confirmOrder.type === 'ASK' && !devMode && !canFill}
          confirmDisabledReason={!canFill ? 'Connect wallet first' : undefined}
        />
      )}
    </div>
  );
}
