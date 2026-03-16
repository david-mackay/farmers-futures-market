'use client';

import { createContext, useCallback, useContext, useState, useRef, ReactNode } from 'react';
import { CheckCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

type ToastState = {
  message: string;
  type: ToastType;
} | null;

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
} | null>(null);

const TOAST_DURATION_MS = 2800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[110] flex items-center gap-3 rounded-xl border border-border bg-card shadow-lg p-4 animate-toast-in safe-area-pb"
        >
          {toast.type === 'success' && (
            <CheckCircle className="w-5 h-5 shrink-0 text-primary" aria-hidden />
          )}
          <p className="text-sm font-medium text-foreground">{toast.message}</p>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}
