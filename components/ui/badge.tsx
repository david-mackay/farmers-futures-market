import { ReactNode } from 'react';

type Variant = 'bid' | 'ask' | 'farmer' | 'trader' | 'verified' | 'open' | 'filled' | 'cancelled' | 'default';

const styles: Record<Variant, string> = {
  bid: 'bg-primary/12 text-primary-dark border-primary/25',
  ask: 'bg-accent-red/10 text-accent-red border-accent-red/25',
  farmer: 'bg-primary/12 text-primary-dark border-primary/25',
  trader: 'bg-accent-blue/10 text-accent-blue border-accent-blue/25',
  verified: 'bg-primary-light/15 text-primary-dark border-primary-light/30',
  open: 'bg-accent-blue/8 text-accent-blue border-accent-blue/20',
  filled: 'bg-primary/10 text-primary border-primary/20',
  cancelled: 'bg-muted-bg text-muted border-border',
  default: 'bg-muted-bg text-muted border-border',
};

export function Badge({ variant = 'default', children }: { variant?: Variant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  );
}
