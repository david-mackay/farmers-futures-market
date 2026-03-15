'use client';

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';
import { solanaAdapter, appkitProjectId } from '@/config/appkit-config';

const queryClient = new QueryClient();

const metadata = {
  name: "Future's Farmer's Market",
  description: "A Farmers' Futures Trading Post",
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: ['/favicon.ico'],
};

if (appkitProjectId && appkitProjectId.trim().length > 0) {
  createAppKit({
    adapters: [solanaAdapter],
    projectId: appkitProjectId,
    networks: [solana, solanaTestnet, solanaDevnet],
    defaultNetwork: solana,
    metadata,
    features: {
      email: true,
      socials: ['google', 'apple'],
      emailShowWallets: false,
      analytics: false,
    },
  });
}

export function AppKitProvider({
  children,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
