'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '@/shared/types';
import { api } from '@/lib/api-client';
import { useSocketEvent } from './use-socket';

interface UseOrdersOptions {
  crop_type?: string;
  type?: string;
  status?: string;
  delivery_month?: string;
  delivery_date?: string;
  filled_by?: string;
  creator_id?: string;
}

function orderMatchesOptions(order: Order, opts: UseOrdersOptions): boolean {
  if (opts.crop_type != null && order.crop_type !== opts.crop_type) return false;
  if (opts.type != null && order.type !== opts.type) return false;
  if (opts.status != null && order.status !== opts.status) return false;
  if (opts.delivery_date != null && order.delivery_date !== opts.delivery_date) return false;
  if (opts.delivery_month != null) {
    const month = order.delivery_date.slice(0, 7);
    if (month !== opts.delivery_month) return false;
  }
  if (opts.filled_by != null && order.filled_by !== opts.filled_by) return false;
  if (opts.creator_id != null && order.creator_id !== opts.creator_id) return false;
  return true;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  const requestSeqRef = useRef(0);
  optionsRef.current = options;

  const fetchOrders = useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.crop_type) params.set('crop_type', options.crop_type);
      if (options.type) params.set('type', options.type);
      if (options.status) params.set('status', options.status);
      if (options.delivery_month) params.set('delivery_month', options.delivery_month);
      if (options.delivery_date) params.set('delivery_date', options.delivery_date);
      if (options.filled_by) params.set('filled_by', options.filled_by);
      if (options.creator_id) params.set('creator_id', options.creator_id);
      const qs = params.toString();
      const data = await api.get<Order[]>(`/api/orders${qs ? `?${qs}` : ''}`);
      if (requestSeq !== requestSeqRef.current) return;
      setOrders(data);
    } catch (err: unknown) {
      if (requestSeq !== requestSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      if (requestSeq !== requestSeqRef.current) return;
      setLoading(false);
    }
  }, [options.crop_type, options.type, options.status, options.delivery_month, options.delivery_date, options.filled_by, options.creator_id]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useSocketEvent('order:created', (order: Order) => {
    if (!orderMatchesOptions(order, optionsRef.current)) return;
    setOrders(prev => [order, ...prev]);
  });

  useSocketEvent('order:filled', (updated: Order) => {
    const showingOpenOnly = optionsRef.current.status === 'OPEN';
    setOrders(prev => {
      const idx = prev.findIndex(o => o.id === updated.id);
      if (idx === -1) return prev;
      if (showingOpenOnly) return prev.filter(o => o.id !== updated.id);
      return prev.map(o => o.id === updated.id ? updated : o);
    });
  });

  useSocketEvent('order:cancelled', (updated: Order) => {
    const showingOpenOnly = optionsRef.current.status === 'OPEN';
    setOrders(prev => {
      const idx = prev.findIndex(o => o.id === updated.id);
      if (idx === -1) return prev;
      if (showingOpenOnly) return prev.filter(o => o.id !== updated.id);
      return prev.map(o => o.id === updated.id ? updated : o);
    });
  });

  return { orders, loading, error, refetch: fetchOrders };
}
