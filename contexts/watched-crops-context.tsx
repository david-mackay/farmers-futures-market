'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { CropType } from '@/shared/types';

const STORAGE_KEY = 'ffm:watchedCrops';

function loadWatched(): CropType[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((c): c is CropType => Object.values(CropType).includes(c as CropType));
  } catch {
    return [];
  }
}

function saveWatched(crops: CropType[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
}

type WatchedCropsContextValue = {
  watched: CropType[];
  add: (crop: CropType) => void;
  remove: (crop: CropType) => void;
  isWatched: (crop: CropType) => boolean;
};

const WatchedCropsContext = createContext<WatchedCropsContextValue | null>(null);

export function WatchedCropsProvider({ children }: { children: ReactNode }) {
  const [watched, setWatched] = useState<CropType[]>([]);

  useEffect(() => {
    setWatched(loadWatched());
  }, []);

  const add = useCallback((crop: CropType) => {
    setWatched((prev) => {
      if (prev.includes(crop)) return prev;
      const next = [...prev, crop];
      saveWatched(next);
      return next;
    });
  }, []);

  const remove = useCallback((crop: CropType) => {
    setWatched((prev) => {
      const next = prev.filter((c) => c !== crop);
      saveWatched(next);
      return next;
    });
  }, []);

  const isWatched = useCallback(
    (crop: CropType) => watched.includes(crop),
    [watched]
  );

  const value: WatchedCropsContextValue = { watched, add, remove, isWatched };

  return (
    <WatchedCropsContext.Provider value={value}>
      {children}
    </WatchedCropsContext.Provider>
  );
}

export function useWatchedCropsContext(): WatchedCropsContextValue {
  const ctx = useContext(WatchedCropsContext);
  if (!ctx) throw new Error('useWatchedCropsContext must be used within WatchedCropsProvider');
  return ctx;
}
