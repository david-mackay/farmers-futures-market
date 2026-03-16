"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { CropType, OrderType } from "@/shared/types";
import { CROP_LABELS } from "@/shared/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DeliveryDateModal } from "@/components/delivery-date-modal";
import { useUser } from "@/hooks/use-user";
import { useCreateBidWithDeposit } from "@/hooks/use-create-bid-with-deposit";
import { useCurrency } from "@/contexts/currency-context";
import { api } from "@/lib/api-client";
import {
  formatPrice,
  formatDeliveryDate,
  getNextContractDays,
  getPricePerKgLabel,
  orderTotalUsd,
} from "@/lib/format";
import { JMD_PER_USD } from "@/shared/constants";

interface OrderFormProps {
  onSuccess?: () => void;
  defaultCrop?: CropType;
  defaultType?: OrderType;
  defaultQuantityKg?: number;
  defaultPricePerKg?: number;
  defaultDeliveryDate?: string;
  relistSourceOrderId?: string;
  autoFocusFirstField?: boolean;
  /** When true, crop is fixed to defaultCrop and the crop dropdown is hidden. */
  fixedCrop?: boolean;
  /** Spot price (JMD per kg) to show in the modal: mid of best bid/ask or fallback from crop data. */
  spotPriceJmdPerKg?: number | null;
}

const cropOptions = Object.entries(CROP_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function OrderForm({
  onSuccess,
  defaultCrop,
  defaultType,
  defaultQuantityKg,
  defaultPricePerKg,
  defaultDeliveryDate,
  relistSourceOrderId,
  autoFocusFirstField,
  fixedCrop,
  spotPriceJmdPerKg,
}: OrderFormProps) {
  const { currency } = useCurrency();
  const { user } = useUser();
  const {
    createBidOrder,
    loading: bidLoading,
    error: bidError,
    clearError: clearBidError,
    canCreateBid,
  } = useCreateBidWithDeposit();
  const toDisplayPriceInput = (priceJmdPerKg: number): string => {
    const displayPrice =
      currency === "USD" ? priceJmdPerKg / JMD_PER_USD : priceJmdPerKg;
    return displayPrice.toFixed(2);
  };

  const toStoredPriceJmd = (priceInDisplayCurrency: number): number => {
    return currency === "USD"
      ? priceInDisplayCurrency * JMD_PER_USD
      : priceInDisplayCurrency;
  };

  const [cropType, setCropType] = useState(defaultCrop || "");
  const [orderType, setOrderType] = useState<string>(
    defaultType || OrderType.BID,
  );
  const [pricePerKg, setPricePerKg] = useState(
    defaultPricePerKg != null ? toDisplayPriceInput(defaultPricePerKg) : "",
  );
  const [quantityKg, setQuantityKg] = useState(
    defaultQuantityKg?.toString() || "",
  );
  const [deliveryDate, setDeliveryDate] = useState(
    defaultDeliveryDate || getNextContractDays(1)[0] || "",
  );
  const [showDateModal, setShowDateModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const previousCurrencyRef = useRef(currency);

  useEffect(() => {
    if (fixedCrop && defaultCrop) {
      setCropType(defaultCrop);
    }
  }, [fixedCrop, defaultCrop]);

  useEffect(() => {
    if (relistSourceOrderId && defaultQuantityKg != null) {
      setQuantityKg(String(defaultQuantityKg));
    }
  }, [relistSourceOrderId, defaultQuantityKg]);

  useEffect(() => {
    if (relistSourceOrderId && defaultDeliveryDate) {
      setDeliveryDate(defaultDeliveryDate);
    }
  }, [relistSourceOrderId, defaultDeliveryDate]);

  useEffect(() => {
    if (defaultPricePerKg != null) {
      setPricePerKg(toDisplayPriceInput(defaultPricePerKg));
    }
  }, [defaultPricePerKg]);

  useEffect(() => {
    const prevCurrency = previousCurrencyRef.current;
    if (prevCurrency === currency) return;
    previousCurrencyRef.current = currency;

    if (!pricePerKg) return;
    const parsed = parseFloat(pricePerKg);
    if (!Number.isFinite(parsed)) return;

    const converted =
      prevCurrency === "JMD" && currency === "USD"
        ? parsed / JMD_PER_USD
        : parsed * JMD_PER_USD;
    setPricePerKg(converted.toFixed(2));
  }, [currency, pricePerKg]);

  useEffect(() => {
    if (!autoFocusFirstField) return;
    const t = requestAnimationFrame(() => {
      priceInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [autoFocusFirstField]);

  const canCreateAsk = user?.is_farmer && user?.is_verified;
  const kg = parseInt(quantityKg, 10) || 0;
  const displayPrice = parseFloat(pricePerKg) || 0;
  const priceJmdPerKg = displayPrice > 0 ? toStoredPriceJmd(displayPrice) : 0;
  const totalValue = kg > 0 && priceJmdPerKg > 0 ? kg * priceJmdPerKg : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearBidError();

    if (orderType === OrderType.BID) {
      const ok = await createBidOrder({
        crop_type: cropType,
        price: toStoredPriceJmd(parseFloat(pricePerKg)),
        quantity: parseInt(quantityKg, 10),
        delivery_date: deliveryDate,
        relist_source_order_id: relistSourceOrderId,
      });
      if (ok) {
        setCropType(defaultCrop ?? "");
        setPricePerKg(
          defaultPricePerKg != null ? toDisplayPriceInput(defaultPricePerKg) : "",
        );
        setQuantityKg(defaultQuantityKg?.toString() ?? "");
        setDeliveryDate(defaultDeliveryDate ?? "");
        onSuccess?.();
      }
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/orders", {
        crop_type: cropType,
        type: orderType,
        price: toStoredPriceJmd(parseFloat(pricePerKg)),
        quantity: parseInt(quantityKg, 10),
        delivery_date: deliveryDate,
        relist_source_order_id: relistSourceOrderId,
      });
      setCropType(defaultCrop ?? "");
      setPricePerKg(
        defaultPricePerKg != null ? toDisplayPriceInput(defaultPricePerKg) : "",
      );
      setQuantityKg(defaultQuantityKg?.toString() ?? "");
      setDeliveryDate(defaultDeliveryDate ?? "");
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const isRelist = Boolean(relistSourceOrderId);

  // Relist: only price per kg is editable; crop, quantity, and delivery date are fixed.
  const showFixedQuantity = isRelist && defaultQuantityKg != null;
  const showFixedDeliveryDate = isRelist && defaultDeliveryDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order type toggle — hidden when relisting; side is fixed */}
      {!isRelist ? (
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setOrderType(OrderType.BID)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              orderType === OrderType.BID
                ? "bg-primary text-white"
                : "bg-card text-muted hover:bg-muted-bg"
            }`}
          >
            I want to Buy
          </button>
          <button
            type="button"
            onClick={() => (canCreateAsk ? setOrderType(OrderType.ASK) : null)}
            disabled={!canCreateAsk}
            className={`flex-1 py-3 text-sm font-semibold transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
              orderType === OrderType.ASK
                ? "bg-accent-red text-white"
                : "bg-card text-muted hover:bg-muted-bg"
            }`}
            title={
              !canCreateAsk
                ? "Only verified farmers can create sell orders"
                : ""
            }
          >
            I want to Sell
            {!canCreateAsk && (
              <span className="block text-xs opacity-70 mt-0.5">
                Verified Farmers Only
              </span>
            )}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Relisting your {orderType === OrderType.ASK ? "sell" : "buy"}{" "}
          position. Side cannot be changed.
        </p>
      )}

      {(fixedCrop || isRelist) && defaultCrop ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Crop
          </label>
          <p className="px-3 py-2 rounded-lg border border-border bg-muted-bg text-foreground font-medium">
            {CROP_LABELS[defaultCrop]}
          </p>
        </div>
      ) : (
        <Select
          label="What crop?"
          value={cropType}
          onChange={(e) => setCropType(e.target.value)}
          options={cropOptions}
          placeholder="Choose a crop..."
          required
        />
      )}

      {spotPriceJmdPerKg != null && spotPriceJmdPerKg > 0 && (
        <p className="text-sm text-muted">
          Spot price:{" "}
          <span className="font-data font-medium text-foreground">
            {formatPrice(spotPriceJmdPerKg)}
          </span>{" "}
          per kg
        </p>
      )}

      <Input
        ref={priceInputRef}
        label={`Price per kg (${getPricePerKgLabel()})`}
        type="number"
        step="0.01"
        min="0.01"
        value={pricePerKg}
        onChange={(e) => setPricePerKg(e.target.value)}
        placeholder="e.g. 7.50"
        required
      />

      {showFixedQuantity ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Quantity (kg)
          </label>
          <p className="px-3 py-2 rounded-lg border border-border bg-muted-bg text-foreground font-medium">
            {defaultQuantityKg} kg
          </p>
          {totalValue > 0 && (
            <p className="text-xs text-muted mt-1">
              Total value: {formatPrice(totalValue)}
            </p>
          )}
        </div>
      ) : (
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
      )}

      {orderType === OrderType.BID && totalValue > 0 && (
        <div className="rounded-xl border border-border bg-primary/5 dark:bg-primary/10 p-4">
          <p className="text-sm font-medium text-foreground">
            Deposit before confirming
          </p>
          <p className="text-xs text-muted mt-1">
            Your wallet will send{" "}
            <span className="font-data font-semibold text-primary">
              ${orderTotalUsd(priceJmdPerKg, kg, JMD_PER_USD).toFixed(2)} USDC
            </span>{" "}
            to escrow. This is the total that will be deducted.
          </p>
        </div>
      )}

      {orderType === OrderType.ASK && totalValue > 0 && (
        <p className="text-xs text-muted">
          Sell orders do not require a deposit. You will receive USDC when the
          buyer pays after filling your order.
        </p>
      )}

      {showFixedDeliveryDate ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Delivery date
          </label>
          <p className="px-3 py-2 rounded-lg border border-border bg-muted-bg text-foreground font-medium">
            {formatDeliveryDate(defaultDeliveryDate!)}
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Delivery date
            </label>
            <button
              type="button"
              onClick={() => setShowDateModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-left hover:bg-muted-bg transition-colors"
            >
              <Calendar className="w-4 h-4 text-muted" aria-hidden />
              {deliveryDate ? formatDeliveryDate(deliveryDate) : "Select date"}
            </button>
          </div>
          <DeliveryDateModal
            open={showDateModal}
            onClose={() => setShowDateModal(false)}
            selectedDate={deliveryDate}
            onSelect={(date) => setDeliveryDate(date)}
          />
        </>
      )}

      {(error || bidError) && (
        <div className="bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2 text-sm text-accent-red">
          {orderType === OrderType.BID ? bidError : error}
        </div>
      )}

      {relistSourceOrderId && (
        <p className="text-xs text-muted">
          Relisting from contract position. Your existing contract obligations
          remain active until this relist is actually filled.
        </p>
      )}

      <Button
        type="submit"
        disabled={
          orderType === OrderType.BID ? bidLoading || !canCreateBid : loading
        }
        className="w-full"
        size="lg"
      >
        {orderType === OrderType.BID
          ? bidLoading
            ? "Depositing USDC…"
            : !canCreateBid
              ? "Connect wallet to post buy order"
              : "Post Buy Order (deposit USDC)"
          : loading
            ? "Creating..."
            : "Post Sell Order"}
      </Button>
    </form>
  );
}
