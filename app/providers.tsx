'use client';

import { ReactNode } from 'react';
import { UserProvider } from '@/hooks/use-user';
import { WatchedCropsProvider } from '@/contexts/watched-crops-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { NavBar } from '@/components/layout/nav-bar';
import { BottomNav } from '@/components/layout/bottom-nav';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <WatchedCropsProvider>
          <div className="min-h-screen flex flex-col bg-background transition-colors duration-200">
            <NavBar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6">
              {children}
            </main>
            <BottomNav />
          </div>
        </WatchedCropsProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
