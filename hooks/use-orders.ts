'use client';

import { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '@/shared/types';
import { api } from '@/lib/api-client';
import { useSocketEvent } from './use-socket';

interface UseOrdersOptions {
  crop_type?: string;
  type?: string;
  status?: string;
  delivery_month?: string;
  delivery_date?: string;
  filled_by?: string;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
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
      const qs = params.toString();
      const data = await api.get<Order[]>(`/api/orders${qs ? `?${qs}` : ''}`);
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.crop_type, options.type, options.status, options.delivery_month, options.delivery_date, options.filled_by]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useSocketEvent('order:created', (order: Order) => {
    setOrders(prev => [order, ...prev]);
  });

  useSocketEvent('order:filled', (updated: Order) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  });

  useSocketEvent('order:cancelled', (updated: Order) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  });

  return { orders, loading, error, refetch: fetchOrders };
}
