'use client';

import { Order, OrderType } from '@/shared/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatKg, formatDeliveryDate, orderTotalUsd } from '@/lib/format';
import { CROP_LABELS } from '@/shared/constants';
import { JMD_PER_USD } from '@/shared/constants';

interface FillConfirmModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  actionLabel: string; // e.g. "Buy" or "Fill"
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
  /** When true, confirm button is disabled (e.g. wallet not connected). */
  confirmDisabled?: boolean;
  /** Label when confirm is disabled (e.g. "Connect wallet first"). */
  confirmDisabledReason?: string;
}

export function FillConfirmModal({
  open,
  onClose,
  order,
  actionLabel,
  onConfirm,
  loading = false,
  error = null,
  confirmDisabled = false,
  confirmDisabledReason,
}: FillConfirmModalProps) {
  const totalUsd = orderTotalUsd(order.price, order.quantity, JMD_PER_USD);
  const pricePerKgUsd = order.price / JMD_PER_USD;

  return (
    <Modal open={open} onClose={onClose} title={`Confirm ${actionLabel}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          You are about to {order.type === OrderType.ASK ? 'buy' : 'sell'} {formatKg(order.quantity)} of{' '}
          <span className="font-medium text-foreground">{CROP_LABELS[order.crop_type as keyof typeof CROP_LABELS]}</span>
          {' '}for delivery by {formatDeliveryDate(order.delivery_date)}.
        </p>
        <div className="rounded-xl border border-border bg-muted-bg/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Price per kg</span>
            <span className="font-data font-semibold text-foreground">${pricePerKgUsd.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Quantity</span>
            <span className="font-data text-foreground">{formatKg(order.quantity)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
            <span className="text-foreground">Total (USDC on Solana)</span>
            <span className="font-data text-primary">${totalUsd.toFixed(2)} USD</span>
          </div>
        </div>
        <p className="text-xs text-muted">
          Confirming will open your wallet to sign and send USDC to escrow. The order is filled only after payment is verified on-chain.
        </p>
        {error && (
          <p className="text-xs text-accent-red" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={loading || confirmDisabled}>
            {loading ? 'Processing...' : confirmDisabled ? (confirmDisabledReason ?? `Confirm ${actionLabel}`) : `Confirm ${actionLabel}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
