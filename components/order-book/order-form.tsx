'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { CropType, OrderType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DeliveryDateModal } from '@/components/delivery-date-modal';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { api } from '@/lib/api-client';
import { formatPrice, formatDeliveryDate, getNextContractDays, getPricePerKgLabel } from '@/lib/format';

interface OrderFormProps {
  onSuccess?: () => void;
  defaultCrop?: CropType;
  defaultType?: OrderType;
  defaultQuantityKg?: number;
  defaultPricePerKg?: number;
  defaultDeliveryDate?: string;
}

const cropOptions = Object.entries(CROP_LABELS).map(([value, label]) => ({ value, label }));

export function OrderForm({ onSuccess, defaultCrop, defaultType, defaultQuantityKg, defaultPricePerKg, defaultDeliveryDate }: OrderFormProps) {
  const { user } = useUser();
  const devMode = useDevMode();
  const [cropType, setCropType] = useState(defaultCrop || '');
  const [orderType, setOrderType] = useState<string>(defaultType || OrderType.BID);
  const [pricePerKg, setPricePerKg] = useState(defaultPricePerKg?.toString() || '');
  const [quantityKg, setQuantityKg] = useState(defaultQuantityKg?.toString() || '');
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate || getNextContractDays(1)[0] || '');
  const [showDateModal, setShowDateModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canCreateAsk = user?.is_farmer && user?.is_verified;
  const kg = parseInt(quantityKg, 10) || 0;
  const price = parseFloat(pricePerKg) || 0;
  const totalValue = kg > 0 && price > 0 ? kg * price : 0;

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
        price: parseFloat(pricePerKg),
        quantity: parseInt(quantityKg, 10),
        delivery_date: deliveryDate,
      });
      setCropType(defaultCrop ?? '');
      setPricePerKg(defaultPricePerKg?.toString() ?? '');
      setQuantityKg(defaultQuantityKg?.toString() ?? '');
      setDeliveryDate(defaultDeliveryDate ?? '');
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
          className={`flex-1 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
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
          className={`flex-1 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
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
        label={`Price per kg (${getPricePerKgLabel()})`}
        type="number"
        step="0.01"
        min="0.01"
        value={pricePerKg}
        onChange={(e) => setPricePerKg(e.target.value)}
        placeholder="e.g. 7.50"
        required
      />

      <div>
        <Input
          label="Quantity (kg)"
          type="number"
          min="1"
          value={quantityKg}
          onChange={(e) => setQuantityKg(e.target.value)}
          placeholder="e.g. 500"
          required
        />
        {totalValue > 0 && (
          <p className="text-xs text-muted mt-1">
            Total value: {formatPrice(totalValue)}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Delivery date</label>
        <button
          type="button"
          onClick={() => setShowDateModal(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-left hover:bg-muted-bg transition-colors"
        >
          <Calendar className="w-4 h-4 text-muted" aria-hidden />
          {deliveryDate ? formatDeliveryDate(deliveryDate) : 'Select date'}
        </button>
      </div>
      <DeliveryDateModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        selectedDate={deliveryDate}
        onSelect={(date) => setDeliveryDate(date)}
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
