'use client';

import { ReactNode } from 'react';
import { UserProvider } from '@/hooks/use-user';
import { NavBar } from '@/components/layout/nav-bar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
