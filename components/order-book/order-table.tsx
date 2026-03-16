'use client';

import { useState } from 'react';
import { Order, OrderStatus } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TransactButton } from '@/components/transact-button';
import { FillConfirmModal } from '@/components/order-book/fill-confirm-modal';
import { useUser } from '@/hooks/use-user';
import { useFillWithPayment } from '@/hooks/use-fill-with-payment';
import { formatPrice, formatKg, formatDeliveryDate, cropLabel } from '@/lib/format';
import { useCurrency } from '@/contexts/currency-context';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

interface OrderTableProps {
  orders: Order[];
  onOrderUpdate?: () => void;
}

export function OrderTable({ orders, onOrderUpdate }: OrderTableProps) {
  useCurrency(); // re-render when JMD/USD toggled
  const { user } = useUser();
  const { showToast } = useToast();
  const { executeFill, loading: fillPaymentLoading, error: fillPaymentError, clearError: clearFillError, canFill } = useFillWithPayment();
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [fillLoading, setFillLoading] = useState(false);
  const [fillError, setFillError] = useState<string | null>(null);

  const handleFillConfirm = async () => {
    if (!confirmOrder) return;
    setFillError(null);
    if (confirmOrder.type === 'BID') {
      setFillLoading(true);
      try {
        await api.post(`/api/orders/${confirmOrder.id}/accept-bid`);
        setConfirmOrder(null);
        onOrderUpdate?.();
        showToast('Bid accepted');
      } catch (err) {
        setFillError(err instanceof Error ? err.message : 'Failed to accept bid.');
      } finally {
        setFillLoading(false);
      }
      return;
    }
    const ok = await executeFill(confirmOrder.id);
    if (ok) {
      setConfirmOrder(null);
      onOrderUpdate?.();
      showToast('Order filled');
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
          {orders.map((order, i) => (
            <tr
              key={order.id}
              className="list-stagger-item hover:bg-muted-bg/50 transition-colors"
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
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
                  <Button
                    variant={order.type === 'BID' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => setConfirmOrder(order)}
                  >
                    {order.type === 'BID' ? 'Sell to Bidder' : 'Buy Future'}
                  </Button>
                )}
                {order.status === OrderStatus.OPEN && user && order.creator_id === user.id && (
                  <TransactButton
                    orderId={order.id}
                    action="Cancel"
                    endpoint={`/api/orders/${order.id}`}
                    method="delete"
                    onSuccess={() => {
                      onOrderUpdate?.();
                      showToast('Order cancelled');
                    }}
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
          onClose={() => { clearFillError(); setFillError(null); setConfirmOrder(null); }}
          order={confirmOrder}
          actionLabel={confirmOrder.type === 'BID' ? 'Sell to Bidder' : 'Buy Future'}
          onConfirm={handleFillConfirm}
          loading={confirmOrder.type === 'BID' ? fillLoading : fillPaymentLoading}
          error={confirmOrder.type === 'BID' ? fillError : fillPaymentError}
          confirmDisabled={confirmOrder.type === 'ASK' && !canFill}
          confirmDisabledReason={!canFill ? 'Connect wallet first' : undefined}
        />
      )}
    </div>
  );
}
