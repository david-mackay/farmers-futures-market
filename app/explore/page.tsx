'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { CropType } from '@/shared/types';
import { CROP_LABELS } from '@/shared/constants';
import { useOrders } from '@/hooks/use-orders';
import { useWatchedCrops } from '@/hooks/use-watched-crops';
import { OrderBookView } from '@/components/order-book/order-book-view';
import { OrderForm } from '@/components/order-book/order-form';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDeliveryDate, getDefaultDeliveryDate, isContractDay } from '@/lib/format';
import Link from 'next/link';

const ALL_CROPS = Object.values(CropType) as CropType[];

function searchCrops(query: string): CropType[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_CROPS;
  return ALL_CROPS.filter((c) => CROP_LABELS[c].toLowerCase().includes(q));
}

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStripRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  const defaultDeliveryDateVal = useMemo(
    () => getDefaultDeliveryDate(ordersForDefault),
    [ordersForDefault]
  );

  const ordersMatchCrop = useMemo(
    () => ordersForDefault.length > 0 && ordersForDefault[0].crop_type === selectedCrop,
    [ordersForDefault, selectedCrop]
  );

  const datesWithOrders = useMemo(() => {
    if (!ordersMatchCrop) return [];
    const dates = [...new Set(ordersForDefault.map((o) => o.delivery_date).filter(isContractDay))].filter(
      (d) => d >= new Date().toISOString().slice(0, 10)
    ).sort();
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

  const showOrderBook = Boolean(selectedCrop && deliveryDate);

  return (
    <div className="flex flex-col min-h-0">
      <div className="border-b border-border bg-background">
        <div className="px-4 sm:px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search crops… e.g. potato, wheat"
              className="w-full pl-10 pr-4 py-3 bg-muted-bg border-0 rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Search crops"
              autoFocus
            />
          </div>
        </div>
      </div>

      {!selectedCrop ? (
        <div className="flex-1 overflow-auto">
          {loading && filteredCrops.length > 0 ? (
            <div className="py-8 text-center text-muted text-sm">Loading…</div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredCrops.length === 0 ? (
                <li className="py-8 text-center text-muted text-sm">No crops match.</li>
              ) : (
                filteredCrops.map((crop) => (
                  <li key={crop}>
                    <Link
                      href={`/explore?crop=${crop}`}
                      className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 active:bg-muted-bg/50 transition-colors min-h-[3.25rem] touch-manipulation"
                    >
                      <span className="font-medium text-foreground">{CROP_LABELS[crop]}</span>
                      <span className="text-muted text-sm">
                        {isWatched(crop) ? 'On watchlist' : 'View orders'}
                      </span>
                    </Link>
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
              <Link
                href="/explore"
                className="text-sm font-medium text-foreground truncate hover:text-primary hover:underline touch-manipulation"
              >
                {CROP_LABELS[selectedCrop as CropType]}
              </Link>
              <Button
                onClick={() => setShowForm(true)}
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
            <div className="py-12 text-center text-muted text-sm">Loading orders…</div>
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
                Select a delivery date to see the order book for {CROP_LABELS[selectedCrop as CropType]}.
              </p>
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New order">
        <OrderForm
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
          defaultCrop={selectedCrop as CropType}
          defaultDeliveryDate={deliveryDate || undefined}
        />
      </Modal>
    </div>
  );
}
