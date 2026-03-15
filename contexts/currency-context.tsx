'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { setDisplayCurrency, type DisplayCurrency } from '@/lib/format';

const STORAGE_KEY = 'ffm:currency';

function loadCurrency(): DisplayCurrency {
  if (typeof window === 'undefined') return 'JMD';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'USD' || stored === 'JMD') return stored;
  return 'JMD';
}

const CurrencyContext = createContext<{
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  toggleCurrency: () => void;
} | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>('JMD');

  useEffect(() => {
    const loaded = loadCurrency();
    setCurrencyState(loaded);
    setDisplayCurrency(loaded);
  }, []);

  useEffect(() => {
    setDisplayCurrency(currency);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, currency);
    }
  }, [currency]);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrency(c);
    setCurrencyState(c);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrencyState((prev) => {
      const next = prev === 'JMD' ? 'USD' : 'JMD';
      setDisplayCurrency(next);
      return next;
    });
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
