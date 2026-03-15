'use client';

import { AppKitButton } from '@reown/appkit/react';
import { appkitProjectId } from '@/config/appkit-config';

export function SignInGate() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground text-center mb-2">
        Sign in to continue
      </h1>
      <p className="text-muted text-sm text-center mb-6 max-w-sm">
        Use your email, Google, or Apple to access Future&apos;s Farmer&apos;s Market.
      </p>
      {appkitProjectId ? (
        <AppKitButton />
      ) : (
        <p className="text-muted text-xs text-center max-w-sm">
          Sign-in is not configured. Set <code className="bg-muted-bg px-1 rounded">NEXT_PUBLIC_REOWN_PROJECT_ID</code> in your environment to enable authentication.
        </p>
      )}
    </div>
  );
}
