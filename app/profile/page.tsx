'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/hooks/use-user';
import { useWatchedCrops } from '@/hooks/use-watched-crops';
import { Order, OrderStatus } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatPrice, formatDeliveryDate, formatKg } from '@/lib/format';
import { useCurrency } from '@/contexts/currency-context';
import { CropType } from '@/shared/types';
import { Pencil, X } from 'lucide-react';
import { AppKitButton } from '@reown/appkit/react';
import { appkitProjectId } from '@/config/appkit-config';
import { VerificationModal } from '@/components/verification-modal';

function parseCropsProduced(raw: string | null | undefined): CropType[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((c): c is CropType => Object.values(CropType).includes(c as CropType));
}

const CROP_OPTIONS = Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label }));

export default function ProfilePage() {
  useCurrency(); // re-render when JMD/USD toggled
  const { user, refreshUser } = useUser();
  const { add: addToWatchlist } = useWatchedCrops();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'name' | 'delivery' | 'farmer' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [acreage, setAcreage] = useState('');
  const [cropList, setCropList] = useState<CropType[]>([]);
  const [addCropValue, setAddCropValue] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<{
    uiAmountString: string;
    mint: string;
  } | null>(null);
  const [tokenBalanceLoading, setTokenBalanceLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    if (!user) return;
    api.get<Order[]>(`/api/users/${user.id}/orders`).then(setOrders);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get<Order[]>(`/api/users/${user.id}/orders`).then(setOrders).finally(() => setLoading(false));
  }, [user]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await api.delete(`/api/orders/${orderId}`);
      await fetchOrders();
    } finally {
      setCancellingId(null);
    }
  }, [fetchOrders]);

  useEffect(() => {
    if (!user) return;
    setTokenBalanceLoading(true);
    api
      .get<{ uiAmountString: string; mint: string }>('/api/users/me/token-balance')
      .then(setTokenBalance)
      .catch(() => setTokenBalance(null))
      .finally(() => setTokenBalanceLoading(false));
  }, [user]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setDeliveryAddress(user.delivery_address ?? '');
      setAcreage(user.acreage != null ? String(user.acreage) : '');
      setCropList(parseCropsProduced(user.crops_produced));
    }
  }, [user]);

  const submitVerification = async () => {
    if (!user) return;
    await api.post(`/api/users/${user.id}/verify`, {});
    await refreshUser();
  };

  const toggleIsFarmer = async () => {
    if (!user) return;
    await api.patch(`/api/users/${user.id}`, { is_farmer: !user.is_farmer });
    await refreshUser();
  };

  const saveDisplayName = async () => {
    if (!user) return;
    const name = displayName.trim() || user.display_name;
    await api.patch(`/api/users/${user.id}`, { display_name: name });
    await refreshUser();
    setEditing(null);
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

  if (loading) return <div className="text-center py-12 text-muted">Loading profile...</div>;
  if (!user) return <div className="text-center py-12 text-muted">Sign in to view your profile.</div>;

  return (
    <div className="flex flex-col min-h-0 min-w-0 w-full">
      <VerificationModal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onSubmit={submitVerification}
      />

      {/* Identity */}
      <section className="border-b border-border bg-card">
        <div className="px-4 sm:px-6 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={user.is_farmer ? 'farmer' : 'trader'}>
              {user.is_farmer ? 'Farmer' : 'Buyer'}
            </Badge>
            {user.is_verified && user.is_farmer && <Badge variant="verified">Verified Farmer</Badge>}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-foreground">Name or business name</h2>
              {editing !== 'name' ? (
                <button
                  type="button"
                  onClick={() => setEditing('name')}
                  className="p-2 text-muted hover:text-foreground touch-manipulation"
                  aria-label="Edit name"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              ) : null}
            </div>
            {editing === 'name' ? (
              <div className="mt-2 flex gap-2">
                <Input
                  label=""
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name or business name"
                  className="flex-1"
                />
                <Button size="sm" onClick={saveDisplayName} className="min-h-[2.5rem] shrink-0">
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setDisplayName(user.display_name); }} className="min-h-[2.5rem]">
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-muted text-sm font-mono break-all mt-1">{user.display_name}</p>
            )}
          </div>
          <p className="text-muted text-xs font-mono break-all mt-1">{user.address}</p>
          {user.email && <p className="text-muted text-xs font-mono break-all">{user.email}</p>}

          {/* USDC balance (app mint via Helius) — money-style */}
          <div className="mt-3 rounded-xl border border-border bg-gradient-to-br from-emerald-500/8 to-emerald-600/4 dark:from-emerald-500/12 dark:to-emerald-600/8 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              {process.env.NEXT_PUBLIC_SOLANA_NETWORK !== 'mainnet' ? 'USDC (devnet)' : 'USDC balance'}
            </p>
            {tokenBalanceLoading ? (
              <p className="text-muted text-sm mt-1 tabular-nums">Loading…</p>
            ) : tokenBalance ? (
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                <span className="text-muted font-normal text-lg">$</span>
                {(Number(tokenBalance.uiAmountString) || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            ) : (
              <p className="text-muted text-sm mt-1 tabular-nums">—</p>
            )}
          </div>

          {/* Wallet: network & Solana balance — Reown modal */}
          {appkitProjectId && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AppKitButton />
              <span className="text-xs text-muted">Manage wallet, switch network, view SOL balance</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={toggleIsFarmer} className="min-h-[2.5rem] touch-manipulation">
              I&apos;m a {user.is_farmer ? 'Buyer' : 'Farmer'}
            </Button>
            {user.is_farmer && !user.is_verified && (
              <Button size="sm" onClick={() => setShowVerifyModal(true)} className="min-h-[2.5rem] touch-manipulation">
                Get verified
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
      {user.is_farmer && (
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

      {/* Order history: thin dividers between rows — min-w-0 so table scrolls inside, not the page */}
      <section className="border-b border-border flex-1 min-w-0">
        <div className="px-4 sm:px-6 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Order history</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-muted text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-muted text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[28rem]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Crop</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Type</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Price/kg</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Kg</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Delivery</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Status</th>
                  <th className="py-2 px-4 text-xs font-bold uppercase text-muted">Action</th>
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
                    <td className="py-3 px-4">
                      {o.status === OrderStatus.OPEN && o.creator_id === user?.id ? (
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={cancellingId === o.id}
                          onClick={() => handleCancelOrder(o.id)}
                          className="min-h-[2rem]"
                        >
                          {cancellingId === o.id ? 'Cancelling…' : 'Cancel'}
                        </Button>
                      ) : (
                        '—'
                      )}
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
