'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { FutureVoucher, Order } from '@/shared/types';
import { CROP_LABELS, CROP_UNIT } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, formatDeliveryDate, formatLots, formatLotsWithUnits } from '@/lib/format';

export default function ProfilePage() {
  const { user, refreshUser } = useUser();
  const [vouchers, setVouchers] = useState<FutureVoucher[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listingPrice, setListingPrice] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<FutureVoucher[]>(`/api/users/${user.id}/vouchers`),
      api.get<Order[]>(`/api/users/${user.id}/orders`),
    ]).then(([v, o]) => {
      setVouchers(v);
      setOrders(o);
    }).finally(() => setLoading(false));
  }, [user]);

  const toggleVerification = async () => {
    if (!user) return;
    await api.patch(`/api/users/${user.id}`, { is_verified: !user.is_verified });
    await refreshUser();
  };

  const toggleRole = async () => {
    if (!user) return;
    const newRole = user.role === 'FARMER' ? 'TRADER' : 'FARMER';
    await api.patch(`/api/users/${user.id}`, { role: newRole });
    await refreshUser();
  };

  const listVoucher = async (voucherId: string) => {
    const price = parseFloat(listingPrice[voucherId] || '0');
    if (price <= 0) return;
    try {
      await api.post(`/api/vouchers/${voucherId}/list`, { listed_price: price });
      const updated = await api.get<FutureVoucher[]>(`/api/users/${user!.id}/vouchers`);
      setVouchers(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) return <div className="text-center py-12 text-muted">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Profile</h1>

      {/* User info */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{user.display_name}</h2>
            <p className="text-muted text-sm mt-1 font-mono">{user.address}</p>
            <div className="flex gap-2 mt-3">
              <Badge variant={user.role === 'FARMER' ? 'farmer' : 'trader'}>{user.role}</Badge>
              {user.is_verified && <Badge variant="verified">Verified Farmer</Badge>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={toggleRole}>
              Switch to {user.role === 'FARMER' ? 'Trader' : 'Farmer'}
            </Button>
            {user.role === 'FARMER' && (
              <Button
                variant={user.is_verified ? 'danger' : 'primary'}
                size="sm"
                onClick={toggleVerification}
              >
                {user.is_verified ? 'Remove Verification' : 'Verify as Farmer'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Vouchers */}
      <Card>
        <CardTitle>Future Vouchers</CardTitle>
        <p className="text-muted text-sm mt-1 mb-4">
          Vouchers you received from buying sell orders. You can re-list them on the secondary market.
        </p>
        {vouchers.length === 0 ? (
          <p className="text-muted text-center py-4">No vouchers yet. Buy a sell order to receive one.</p>
        ) : (
          <div className="space-y-3">
            {vouchers.map(v => (
              <div key={v.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{CROP_LABELS[v.crop_type]}</div>
                  <div className="text-sm text-muted">
                    {formatLotsWithUnits(v.quantity, v.crop_type)} | Delivery: {formatDeliveryDate(v.delivery_date)}
                  </div>
                  <div className="text-sm font-data">
                    Paid: {formatPrice(v.purchase_price)}/{CROP_UNIT[v.crop_type]}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.is_listed ? (
                    <Badge variant="open">Listed at {formatPrice(v.listed_price!)}</Badge>
                  ) : (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Price"
                        value={listingPrice[v.id] || ''}
                        onChange={(e) => setListingPrice(prev => ({ ...prev, [v.id]: e.target.value }))}
                        className="w-24"
                      />
                      <Button size="sm" onClick={() => listVoucher(v.id)} disabled={!listingPrice[v.id]}>
                        Re-list
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Order History */}
      <Card>
        <CardTitle>Order History</CardTitle>
        {loading ? (
          <p className="text-muted text-center py-4">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-muted text-center py-4">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 text-xs font-bold uppercase text-muted">Crop</th>
                  <th className="pb-2 text-xs font-bold uppercase text-muted">Type</th>
                  <th className="pb-2 text-xs font-bold uppercase text-muted">Price</th>
                  <th className="pb-2 text-xs font-bold uppercase text-muted">Lots</th>
                  <th className="pb-2 text-xs font-bold uppercase text-muted">Delivery</th>
                  <th className="pb-2 text-xs font-bold uppercase text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="py-2 text-sm">{CROP_LABELS[o.crop_type]}</td>
                    <td className="py-2"><Badge variant={o.type === 'BID' ? 'bid' : 'ask'}>{o.type}</Badge></td>
                    <td className="py-2 font-data text-sm">{formatPrice(o.price)}</td>
                    <td className="py-2 font-data text-sm">{formatLots(o.quantity)}</td>
                    <td className="py-2 text-sm">{formatDeliveryDate(o.delivery_date)}</td>
                    <td className="py-2"><Badge variant={o.status.toLowerCase() as any}>{o.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
