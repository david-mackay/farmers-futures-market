'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/hooks/use-user';
import { useWatchedCrops } from '@/hooks/use-watched-crops';
import { Order } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatPrice, formatDeliveryDate, formatKg } from '@/lib/format';
import { CropType } from '@/shared/types';
import { Pencil, X } from 'lucide-react';

function parseCropsProduced(raw: string | null | undefined): CropType[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((c): c is CropType => Object.values(CropType).includes(c as CropType));
}

const CROP_OPTIONS = Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label }));

export default function ProfilePage() {
  const { user, refreshUser } = useUser();
  const { add: addToWatchlist } = useWatchedCrops();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'delivery' | 'farmer' | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [acreage, setAcreage] = useState('');
  const [cropList, setCropList] = useState<CropType[]>([]);
  const [addCropValue, setAddCropValue] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>(`/api/users/${user.id}/orders`).then(setOrders).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (user) {
      setDeliveryAddress(user.delivery_address ?? '');
      setAcreage(user.acreage != null ? String(user.acreage) : '');
      setCropList(parseCropsProduced(user.crops_produced));
    }
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

  const saveDeliveryAddress = async () => {
    if (!user) return;
    await api.patch(`/api/users/${user.id}`, { delivery_address: deliveryAddress || null });
    await refreshUser();
    setEditing(null);
  };

  const saveFarmerProfile = async () => {
    if (!user) return;
    const cropsProducedStr = cropList.length > 0 ? cropList.join(',') : null;
    await api.patch(`/api/users/${user.id}`, {
      acreage: acreage ? parseFloat(acreage) : null,
      crops_produced: cropsProducedStr,
    });
    await refreshUser();
    setEditing(null);
  };

  const addCrop = (crop: CropType) => {
    if (cropList.includes(crop)) return;
    setCropList((prev) => [...prev, crop]);
    addToWatchlist(crop);
    setAddCropValue('');
  };

  const removeCrop = (crop: CropType) => {
    setCropList((prev) => prev.filter((c) => c !== crop));
  };

  const availableCropsToAdd = useMemo(
    () => CROP_OPTIONS.filter((opt) => !cropList.includes(opt.value as CropType)),
    [cropList]
  );

  if (!user) return <div className="text-center py-12 text-muted">Loading profile...</div>;

  return (
    <div className="flex flex-col min-h-0">
      {/* Identity: full-width section, thin border below */}
      <section className="border-b border-border bg-card">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={user.role === 'FARMER' ? 'farmer' : 'trader'}>{user.role}</Badge>
            {user.is_verified && <Badge variant="verified">Verified Farmer</Badge>}
          </div>
          <p className="text-muted text-sm font-mono break-all mt-2">{user.display_name}</p>
          <p className="text-muted text-xs font-mono break-all">{user.address}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={toggleRole} className="min-h-[2.5rem] touch-manipulation">
              Switch to {user.role === 'FARMER' ? 'Trader' : 'Farmer'}
            </Button>
            {user.role === 'FARMER' && (
              <Button
                variant={user.is_verified ? 'danger' : 'primary'}
                size="sm"
                onClick={toggleVerification}
                className="min-h-[2.5rem] touch-manipulation"
              >
                {user.is_verified ? 'Remove Verification' : 'Verify as Farmer'}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Delivery address (buyers / all) */}
      <section className="border-b border-border">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Delivery address</h2>
            {editing !== 'delivery' ? (
              <button
                type="button"
                onClick={() => setEditing('delivery')}
                className="p-2 text-muted hover:text-foreground touch-manipulation"
                aria-label="Edit delivery address"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          {editing === 'delivery' ? (
            <div className="mt-2 space-y-2">
              <Input
                label=""
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Street, parish, Jamaica"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveDeliveryAddress} className="min-h-[2.5rem]">
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="min-h-[2.5rem]">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted mt-1">
              {user.delivery_address || 'Not set'}
            </p>
          )}
        </div>
      </section>

      {/* Farmer: acreage & crops produced */}
      {user.role === 'FARMER' && (
        <section className="border-b border-border">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Farm details</h2>
              {editing !== 'farmer' ? (
                <button
                  type="button"
                  onClick={() => setEditing('farmer')}
                  className="p-2 text-muted hover:text-foreground touch-manipulation"
                  aria-label="Edit farm details"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              ) : null}
            </div>
            {editing === 'farmer' ? (
              <div className="mt-2 space-y-3">
                <Input
                  label="Acreage"
                  type="number"
                  min="0"
                  step="0.1"
                  value={acreage}
                  onChange={(e) => setAcreage(e.target.value)}
                  placeholder="e.g. 10"
                />
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Crops produced</label>
                  <p className="text-xs text-muted mb-2">Each crop is added separately. New crops are added to your dashboard watchlist.</p>
                  {cropList.length > 0 && (
                    <ul className="divide-y divide-border border border-border rounded-lg mb-2">
                      {cropList.map((crop) => (
                        <li key={crop} className="flex items-center justify-between gap-2 px-3 py-2">
                          <span className="font-medium text-foreground">{CROP_LABELS[crop]}</span>
                          <button
                            type="button"
                            onClick={() => removeCrop(crop)}
                            className="p-1.5 text-muted hover:text-foreground hover:bg-muted-bg rounded touch-manipulation"
                            aria-label={`Remove ${CROP_LABELS[crop]}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {availableCropsToAdd.length > 0 && (
                    <div className="flex gap-2">
                      <Select
                        label=""
                        value={addCropValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) addCrop(v as CropType);
                          setAddCropValue('');
                        }}
                        options={[{ value: '', label: 'Add a crop…' }, ...availableCropsToAdd]}
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveFarmerProfile} className="min-h-[2.5rem]">
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setCropList(parseCropsProduced(user?.crops_produced));
                    }}
                    className="min-h-[2.5rem]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted space-y-1">
                <p>Acreage: {user.acreage != null ? user.acreage : 'Not set'}</p>
                <p>
                  Crops: {cropList.length > 0 ? cropList.map((c) => CROP_LABELS[c]).join(', ') : 'None'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Order history: thin dividers between rows */}
      <section className="border-b border-border flex-1">
        <div className="px-4 sm:px-6 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Order history</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-muted text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-muted text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[28rem]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Crop</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Type</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Price/kg</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Kg</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Delivery</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted-bg/30 transition-colors">
                    <td className="py-3 px-4">{CROP_LABELS[o.crop_type as CropType]}</td>
                    <td className="py-3 px-4">
                      <Badge variant={o.type === 'BID' ? 'bid' : 'ask'}>{o.type}</Badge>
                    </td>
                    <td className="py-3 px-4 font-data">{formatPrice(o.price)}/kg</td>
                    <td className="py-3 px-4 font-data">{formatKg(o.quantity)}</td>
                    <td className="py-3 px-4">{formatDeliveryDate(o.delivery_date)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={o.status.toLowerCase() as 'open' | 'filled' | 'cancelled'}>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
