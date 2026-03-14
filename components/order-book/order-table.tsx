'use client';

import { Order, OrderStatus } from '@/shared/types';
import { Badge } from '@/components/ui/badge';
import { TransactButton } from '@/components/transact-button';
import { useUser } from '@/hooks/use-user';
import { formatPrice, formatQuantity, formatDeliveryDate, cropLabel } from '@/lib/format';

interface OrderTableProps {
  orders: Order[];
  onOrderUpdate?: () => void;
}

export function OrderTable({ orders, onOrderUpdate }: OrderTableProps) {
  const { user } = useUser();

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
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Price</th>
            <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Quantity</th>
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
              <td className="py-3 font-data font-semibold">{formatPrice(order.price)}</td>
              <td className="py-3 font-data">{formatQuantity(order.quantity, order.crop_type)}</td>
              <td className="py-3 font-medium text-primary">{formatDeliveryDate(order.delivery_date)}</td>
              <td className="py-3">
                <Badge variant={order.status.toLowerCase() as any}>{order.status}</Badge>
              </td>
              <td className="py-3">
                {order.status === OrderStatus.OPEN && user && order.creator_id !== user.id && (
                  <TransactButton
                    orderId={order.id}
                    action={order.type === 'BID' ? 'Sell to Bidder' : 'Buy Future'}
                    endpoint={`/api/orders/${order.id}/fill`}
                    onSuccess={onOrderUpdate}
                    variant={order.type === 'BID' ? 'secondary' : 'primary'}
                    size="sm"
                  />
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
    </div>
  );
}
