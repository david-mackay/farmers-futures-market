'use client';

import { useRef, useEffect } from 'react';
import { getNextMondays, formatDeliveryDate } from '@/lib/format';
import { Modal } from '@/components/ui/modal';

const MONDAYS = getNextMondays(52);

interface DeliveryDateModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (date: string) => void;
}

/** Robinhood-style modal: horizontal scrollable list of Mondays, one selected with underline. */
export function DeliveryDateModal({
  open,
  onClose,
  selectedDate,
  onSelect,
}: DeliveryDateModalProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [open, selectedDate]);

  return (
    <Modal open={open} onClose={onClose} title="Delivery date">
      <p className="text-sm text-muted mb-3">All contracts end on a Monday.</p>
      <div className="overflow-x-auto -mx-1 pb-2 flex gap-1">
        {MONDAYS.map((date) => {
          const selected = date === selectedDate;
          return (
            <button
              key={date}
              ref={selected ? selectedRef : null}
              type="button"
              onClick={() => {
                onSelect(date);
                onClose();
              }}
              className={`
                shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200
                border-b-2 touch-manipulation
                ${selected
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-muted-bg text-muted border-transparent hover:text-foreground hover:bg-muted-bg/80'
                }
              `}
            >
              {formatDeliveryDate(date)}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export { MONDAYS as DELIVERY_MONDAY_OPTIONS };
