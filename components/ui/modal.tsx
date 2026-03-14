'use client';

import { ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 safe-area-pt">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-200 cursor-pointer"
        onClick={onClose}
        aria-hidden
      />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="relative bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto safe-area-pb">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2.5 min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center hover:bg-muted-bg rounded-xl text-muted cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
