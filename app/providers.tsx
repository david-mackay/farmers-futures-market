'use client';

import { ReactNode } from 'react';
import { UserProvider, useUser } from '@/hooks/use-user';
import { WatchedCropsProvider } from '@/contexts/watched-crops-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { CurrencyProvider } from '@/contexts/currency-context';
import { NavBar } from '@/components/layout/nav-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SignInGate } from '@/components/sign-in-gate';
import { OnboardingModal } from '@/components/onboarding-modal';
import { isProfileIncomplete } from '@/lib/profile';

function AuthAwareLayout({ children }: { children: ReactNode }) {
  const { user, loading, refreshUser } = useUser();
  const showOnboarding = user && isProfileIncomplete(user);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NavBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <SignInGate />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-200">
      {showOnboarding && (
        <OnboardingModal open user={user} onComplete={refreshUser} />
      )}
      <NavBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <UserProvider>
          <WatchedCropsProvider>
            <AuthAwareLayout>{children}</AuthAwareLayout>
          </WatchedCropsProvider>
        </UserProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
