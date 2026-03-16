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
import { SignupBonusModal } from '@/components/signup-bonus-modal';
import { isProfileIncomplete } from '@/lib/profile';
import { Spinner } from '@/components/ui/spinner';
import { ToastProvider } from '@/components/ui/toast';

function AuthAwareLayout({ children }: { children: ReactNode }) {
  const { user, loading, refreshUser, showSignupBonusModal, dismissSignupBonusModal } = useUser();
  const showOnboarding = user && isProfileIncomplete(user);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" variant="primary" />
        <p className="text-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background overflow-x-hidden">
        <NavBar />
        <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
          <SignInGate />
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] flex flex-col bg-background transition-colors duration-200 overflow-x-hidden">
      {showSignupBonusModal && (
        <SignupBonusModal open onClose={dismissSignupBonusModal} />
      )}
      {showOnboarding && (
        <OnboardingModal open user={user} onComplete={refreshUser} />
      )}
      <NavBar />
      <main className="flex-1 min-h-0 min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-6 overflow-y-auto overflow-x-hidden">
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
          <ToastProvider>
            <WatchedCropsProvider>
              <AuthAwareLayout>{children}</AuthAwareLayout>
            </WatchedCropsProvider>
          </ToastProvider>
        </UserProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
