'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { CropType, OrderType } from '@/shared/types';
import { CROP_LABELS, CROP_WHOLESALE_JMD_PER_KG } from '@/shared/constants';
import { useOrders } from '@/hooks/use-orders';
import { useWatchedCrops } from '@/hooks/use-watched-crops';
import { OrderBookView } from '@/components/order-book/order-book-view';
import { OrderForm } from '@/components/order-book/order-form';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { CropNameLink } from '@/components/crop-name-link';
import { formatDeliveryDate, getDefaultDeliveryDate, isContractDay } from '@/lib/format';
import Link from 'next/link';

const ALL_CROPS = Object.values(CropType) as CropType[];

function searchCrops(query: string): CropType[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_CROPS;
  return ALL_CROPS.filter((c) => CROP_LABELS[c].toLowerCase().includes(q));
}

export default function MarketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStripRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const initialCrop = searchParams.get('crop') || '';
  const initialDate = searchParams.get('date') || '';
  const [deliveryDate, setDeliveryDate] = useState(initialDate);
  const [selectedCrop, setSelectedCrop] = useState(initialCrop);
  const [showForm, setShowForm] = useState(false);
  const [newOrderAutoFocus, setNewOrderAutoFocus] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const newOrderParam = searchParams.get('newOrder') === '1';

  useEffect(() => {
    const crop = searchParams.get('crop') || '';
    const date = searchParams.get('date') || '';
    setSelectedCrop(crop);
    setDeliveryDate(date);
  }, [searchParams]);

  const filteredCrops = useMemo(() => searchCrops(query), [query]);

  const filtersForDefault = useMemo(
    () => (selectedCrop ? { crop_type: selectedCrop, status: 'OPEN' as const } : {}),
    [selectedCrop]
  );
  const { orders: ordersForDefault } = useOrders(filtersForDefault);

  const defaultDeliveryDateVal = useMemo(() => getDefaultDeliveryDate(ordersForDefault), [ordersForDefault]);

  const ordersMatchCrop = useMemo(
    () => ordersForDefault.length > 0 && ordersForDefault[0].crop_type === selectedCrop,
    [ordersForDefault, selectedCrop]
  );

  const datesWithOrders = useMemo(() => {
    if (!ordersMatchCrop) return [];
    const dates = [...new Set(ordersForDefault.map((o) => o.delivery_date).filter(isContractDay))]
      .filter((d) => d >= new Date().toISOString().slice(0, 10))
      .sort();
    return dates;
  }, [ordersForDefault, ordersMatchCrop]);

  useEffect(() => {
    if (selectedCrop && !deliveryDate && defaultDeliveryDateVal && ordersMatchCrop) {
      setDeliveryDate(defaultDeliveryDateVal);
    }
  }, [selectedCrop, deliveryDate, defaultDeliveryDateVal, ordersMatchCrop]);

  useEffect(() => {
    if (deliveryDate && selectedDateRef.current && dateStripRef.current) {
      selectedDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [deliveryDate]);

  const filters = useMemo(() => {
    if (deliveryDate && selectedCrop) {
      return { crop_type: selectedCrop, status: 'OPEN' as const, delivery_date: deliveryDate };
    }
    return {
      crop_type: selectedCrop || undefined,
      status: 'OPEN' as const,
    };
  }, [selectedCrop, deliveryDate]);

  const { orders, loading, refetch } = useOrders(filters);
  const { isWatched } = useWatchedCrops();
  const { showToast } = useToast();

  const spotPriceJmdPerKg = useMemo(() => {
    if (!selectedCrop) return null;
    const bids = orders.filter((o) => o.type === OrderType.BID).map((o) => o.price);
    const asks = orders.filter((o) => o.type === OrderType.ASK).map((o) => o.price);
    const bestBid = bids.length > 0 ? Math.max(...bids) : null;
    const bestAsk = asks.length > 0 ? Math.min(...asks) : null;
    if (bestBid != null && bestAsk != null) {
      return (bestBid + bestAsk) / 2;
    }
    const fallback = CROP_WHOLESALE_JMD_PER_KG[selectedCrop as CropType];
    return fallback ?? null;
  }, [selectedCrop, orders]);

  const showOrderBook = Boolean(selectedCrop && deliveryDate);
  const showSearchDropdown = searchFocused || query.length > 0;
  const relistEnabled = searchParams.get('relist') === '1';
  const relistSourceOrderId = searchParams.get('relist_source_order_id') || undefined;
  const relistTypeParam = searchParams.get('relist_type');
  const relistType =
    relistTypeParam === OrderType.ASK || relistTypeParam === OrderType.BID
      ? relistTypeParam
      : undefined;
  const relistQtyRaw = searchParams.get('relist_qty');
  const relistPriceRaw = searchParams.get('relist_price');
  const relistQty = relistQtyRaw ? Number.parseInt(relistQtyRaw, 10) : undefined;
  const relistPrice = relistPriceRaw ? Number.parseFloat(relistPriceRaw) : undefined;

  const handleSelectCrop = (crop: CropType) => {
    setQuery('');
    setSearchFocused(false);
    router.replace(`/markets?crop=${crop}`);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchDropdown]);

  useEffect(() => {
    if (!relistEnabled || !selectedCrop || !deliveryDate) return;
    setShowForm(true);
  }, [relistEnabled, selectedCrop, deliveryDate]);

  const hasHandledNewOrder = useRef(false);
  useEffect(() => {
    if (newOrderParam && !hasHandledNewOrder.current) {
      hasHandledNewOrder.current = true;
      setNewOrderAutoFocus(true);
      setShowForm(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('newOrder');
      const replacement = params.toString() ? `/markets?${params.toString()}` : '/markets';
      router.replace(replacement);
    }
  }, [newOrderParam, searchParams, router]);

  const openNewOrderModal = () => {
    setNewOrderAutoFocus(true);
    setShowForm(true);
  };

  const closeNewOrderModal = () => {
    setShowForm(false);
    setNewOrderAutoFocus(false);
    hasHandledNewOrder.current = false;
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="border-b border-border bg-background">
        <div className="px-4 sm:px-6 py-3">
          <div className="relative" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none z-10" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchFocused(false);
              }}
              placeholder="Search crops… e.g. potato, wheat"
              className="w-full pl-10 pr-4 py-3 bg-muted-bg border-0 rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Search crops"
              aria-expanded={showSearchDropdown}
              aria-haspopup="listbox"
              aria-controls="crop-search-listbox"
              id="crop-search-input"
            />
            {showSearchDropdown && (
              <ul
                id="crop-search-listbox"
                role="listbox"
                aria-labelledby="crop-search-input"
                className="absolute left-0 right-0 top-full mt-1 max-h-[min(60vh,20rem)] overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-50 divide-y divide-border"
              >
                {filteredCrops.length === 0 ? (
                  <li className="px-4 py-3 text-muted text-sm" role="option">
                    No crops match.
                  </li>
                ) : (
                  filteredCrops.map((crop) => (
                    <li key={crop} role="option" aria-selected={selectedCrop === crop}>
                      <button
                        type="button"
                        onClick={() => handleSelectCrop(crop)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted-bg focus:bg-muted-bg focus:outline-none cursor-pointer touch-manipulation"
                      >
                        <span>{CROP_LABELS[crop]}</span>
                        {selectedCrop === crop && (
                          <span className="text-primary text-xs">Current</span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {!selectedCrop ? (
        <div className="flex-1 overflow-auto">
          {loading && filteredCrops.length > 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner size="lg" variant="primary" />
              <p className="text-muted text-sm">Loading…</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredCrops.length === 0 ? (
                <li className="py-8 text-center text-muted text-sm">No crops match.</li>
              ) : (
                filteredCrops.map((crop) => (
                  <li key={crop}>
                    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 min-h-[3.25rem]">
                      <CropNameLink
                        cropName={CROP_LABELS[crop]}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {CROP_LABELS[crop]}
                      </CropNameLink>
                      <Link
                        href={`/markets?crop=${crop}&newOrder=1`}
                        className="inline-flex items-center justify-center rounded-md border-2 border-primary text-primary bg-transparent hover:bg-primary/10 font-medium text-xs min-h-[36px] px-3.5 py-1.5 transition-colors touch-manipulation"
                      >
                        New order
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border bg-background">
            <div className="flex items-center gap-2 px-4 sm:px-6 py-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCrop('');
                  setDeliveryDate('');
                  setQuery('');
                  router.replace('/markets');
                }}
                className="text-sm text-primary hover:underline cursor-pointer touch-manipulation font-medium"
              >
                ← All crops
              </button>
              <span className="text-muted">·</span>
              <CropNameLink
                cropName={CROP_LABELS[selectedCrop as CropType]}
                className="text-sm font-medium text-foreground truncate hover:text-primary hover:underline"
              >
                {CROP_LABELS[selectedCrop as CropType]}
              </CropNameLink>
              <Button
                onClick={openNewOrderModal}
                variant="outline"
                size="sm"
                className="ml-auto shrink-0 min-h-[2.5rem] touch-manipulation"
              >
                + New order
              </Button>
            </div>
            <div
              ref={dateStripRef}
              className="overflow-x-auto border-t border-border bg-muted-bg/30 scrollbar-thin"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div className="flex gap-0 min-w-max px-4 sm:px-6 py-1 items-center">
                {!ordersMatchCrop ? (
                  <span className="text-sm text-muted py-2">Loading dates…</span>
                ) : (
                  (datesWithOrders.length > 0 ? datesWithOrders : (defaultDeliveryDateVal ? [defaultDeliveryDateVal] : [])).map((date) => {
                    const selected = date === deliveryDate;
                    return (
                      <button
                        key={date}
                        ref={selected ? selectedDateRef : null}
                        type="button"
                        onClick={() => setDeliveryDate(date)}
                        className={`
                          shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-200
                          border-b-2 -mb-px touch-manipulation
                          ${selected
                            ? 'text-primary border-primary'
                            : 'text-muted border-transparent hover:text-foreground'}
                        `}
                      >
                        {formatDeliveryDate(date)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner size="lg" variant="primary" />
              <p className="text-muted text-sm">Loading orders…</p>
            </div>
          ) : showOrderBook ? (
            <div className="flex-1 overflow-auto">
              <OrderBookView
                orders={orders}
                cropType={selectedCrop}
                deliveryDate={deliveryDate}
                onUpdate={refetch}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
              <p className="text-muted text-sm">
                Select a delivery date to see the order book for{' '}
                <CropNameLink
                  cropName={CROP_LABELS[selectedCrop as CropType]}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {CROP_LABELS[selectedCrop as CropType]}
                </CropNameLink>
                .
              </p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          closeNewOrderModal();
          if (relistEnabled && selectedCrop && deliveryDate) {
            router.replace(`/markets?crop=${encodeURIComponent(selectedCrop)}&date=${encodeURIComponent(deliveryDate)}`);
          }
        }}
        title={relistEnabled ? 'Relist contract' : 'New order'}
      >
        <OrderForm
          onSuccess={() => {
            closeNewOrderModal();
            refetch();
            showToast(relistEnabled ? 'Contract relisted' : 'Order placed');
            if (relistEnabled && selectedCrop && deliveryDate) {
              router.replace(`/markets?crop=${encodeURIComponent(selectedCrop)}&date=${encodeURIComponent(deliveryDate)}`);
            }
          }}
          defaultCrop={selectedCrop ? (selectedCrop as CropType) : undefined}
          defaultDeliveryDate={deliveryDate || undefined}
          defaultType={relistType}
          defaultQuantityKg={relistQty}
          defaultPricePerKg={relistPrice}
          relistSourceOrderId={relistSourceOrderId}
          autoFocusFirstField={newOrderAutoFocus}
          fixedCrop={Boolean(selectedCrop)}
          spotPriceJmdPerKg={spotPriceJmdPerKg ?? undefined}
        />
      </Modal>
    </div>
  );
}
