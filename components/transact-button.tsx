'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDevMode } from '@/hooks/use-dev-mode';
import { api } from '@/lib/api-client';

interface TransactButtonProps {
  orderId: string;
  action: string;
  endpoint: string;
  method?: 'post' | 'delete';
  body?: unknown;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function TransactButton({
  orderId,
  action,
  endpoint,
  method = 'post',
  body,
  onSuccess,
  onError,
  variant = 'primary',
  size = 'sm',
  disabled,
}: TransactButtonProps) {
  const devMode = useDevMode();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!devMode) {
      alert('Wallet transactions not yet implemented. Enable DEV_MODE.');
      return;
    }

    setLoading(true);
    try {
      const result = method === 'delete'
        ? await api.delete(endpoint)
        : await api.post(endpoint, body);
      onSuccess?.(result);
    } catch (err: any) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : action}
    </Button>
  );
}
