'use client';

import { useState } from 'react';
import { CropType, OrderType } from '@/shared/types';
import { CROP_LABELS, LOT_SIZE, CROP_UNIT } from '@/shared/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { api } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';

interface OrderFormProps {
  onSuccess?: () => void;
  defaultCrop?: CropType;
  defaultType?: OrderType;
  defaultLots?: number;
  defaultPrice?: number;
  defaultDeliveryDate?: string;
}

const cropOptions = Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label }));

export function OrderForm({ onSuccess, defaultCrop, defaultType, defaultLots, defaultPrice, defaultDeliveryDate }: OrderFormProps) {
  const { user } = useUser();
  const devMode = useDevMode();
  const [cropType, setCropType] = useState(defaultCrop || '');
  const [orderType, setOrderType] = useState<string>(defaultType || OrderType.BID);
  const [price, setPrice] = useState(defaultPrice?.toString() || '');
  const [lots, setLots] = useState(defaultLots?.toString() || '');
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canCreateAsk = user?.role === 'FARMER' && user?.is_verified;
  const unit = cropType ? CROP_UNIT[cropType as CropType] : 'units';
  const totalUnits = (parseInt(lots) || 0) * LOT_SIZE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devMode) {
      alert('Wallet transactions not yet implemented. Enable DEV_MODE.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/api/orders', {
        crop_type: cropType,
        type: orderType,
        price: parseFloat(price),
        quantity: parseInt(lots),
        delivery_date: deliveryDate,
      });
      setCropType(defaultCrop || '');
      setPrice(defaultPrice?.toString() || '');
      setLots(defaultLots?.toString() || '');
      setDeliveryDate(defaultDeliveryDate || '');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order type toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setOrderType(OrderType.BID)}
          className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            orderType === OrderType.BID
              ? 'bg-primary text-white'
              : 'bg-card text-muted hover:bg-muted-bg'
          }`}
        >
          I want to Buy
        </button>
        <button
          type="button"
          onClick={() => canCreateAsk ? setOrderType(OrderType.ASK) : null}
          disabled={!canCreateAsk}
          className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            orderType === OrderType.ASK
              ? 'bg-accent-red text-white'
              : 'bg-card text-muted hover:bg-muted-bg'
          }`}
          title={!canCreateAsk ? 'Only verified farmers can create sell orders' : ''}
        >
          I want to Sell
          {!canCreateAsk && <span className="block text-xs opacity-70 mt-0.5">Verified Farmers Only</span>}
        </button>
      </div>

      <Select
        label="What crop?"
        value={cropType}
        onChange={(e) => setCropType(e.target.value)}
        options={cropOptions}
        placeholder="Choose a crop..."
        required
      />

      <Input
        label={`Price per ${unit}`}
        type="number"
        step="0.01"
        min="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="e.g. 7.50"
        required
      />

      <div>
        <Input
          label={`How many lots? (1 lot = ${LOT_SIZE} ${unit})`}
          type="number"
          min="1"
          value={lots}
          onChange={(e) => setLots(e.target.value)}
          placeholder="e.g. 5"
          required
        />
        {totalUnits > 0 && (
          <p className="text-xs text-muted mt-1">
            Total: {totalUnits.toLocaleString()} {unit}
            {price && ` | Contract value: ${formatPrice(totalUnits * parseFloat(price))}`}
          </p>
        )}
      </div>

      <Input
        label="Delivery date"
        type="date"
        value={deliveryDate}
        onChange={(e) => setDeliveryDate(e.target.value)}
        required
      />

      {error && (
        <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2 text-sm text-accent-red">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading
          ? 'Creating...'
          : orderType === OrderType.BID
            ? 'Post Buy Order'
            : 'Post Sell Order'}
      </Button>
    </form>
  );
}
