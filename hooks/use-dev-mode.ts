'use client';

export function useDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEV_MODE === 'true';
}
