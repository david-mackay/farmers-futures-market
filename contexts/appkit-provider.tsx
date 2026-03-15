'use client';

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cookieToInitialState, WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { mainnet } from '@reown/appkit/networks';
import { wagmiAdapter, appkitProjectId, wagmiConfig } from '@/config/appkit-config';
import type { Config } from 'wagmi';

const queryClient = new QueryClient();

const metadata = {
  name: "Future's Farmer's Market",
  description: "A Farmers' Futures Trading Post",
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: ['/favicon.ico'],
};

if (appkitProjectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: appkitProjectId,
    networks: [mainnet],
    defaultNetwork: mainnet,
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
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
