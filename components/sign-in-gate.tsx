"use client";

import { useAppKit } from "@reown/appkit/react";
import { appkitProjectId } from "@/config/appkit-config";
import Image from "next/image";
import { Button } from "@/components/ui/button";

function SignInButton() {
  const { open } = useAppKit();
  return (
    <Button type="button" size="lg" onClick={() => open()}>
      Sign in
    </Button>
  );
}

export function SignInGate() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Hero: full-bleed, mobile-first */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none"
          aria-hidden
        />
        <div className="relative w-full max-w-lg mx-auto text-center flex flex-col items-center">
          <div className="mb-6 sm:mb-8">
            <Image
              src="/assets/ffm-logo.png"
              alt=""
              width={80}
              height={80}
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight">
            Jamaica imports over half its food.
            <br />
            <span className="text-primary">Grow local. Lock in prices.</span>
          </h1>
          <p className="mt-4 sm:mt-5 text-sm sm:text-base text-muted max-w-md leading-relaxed">
            FFM connects farmers and buyers with crop futures—agree on price and
            delivery date today. Less waste, more local production, less
            reliance on imports.
          </p>

          <div className="mt-8 sm:mt-10 w-full max-w-xs sm:max-w-sm">
            {appkitProjectId ? (
              <div className="flex justify-center">
                <SignInButton />
              </div>
            ) : (
              <p className="text-muted text-xs text-center">
                Sign-in is not configured. Set{" "}
                <code className="bg-muted-bg px-1 rounded">
                  NEXT_PUBLIC_REOWN_PROJECT_ID
                </code>{" "}
                in your environment.
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted">
          Trade crop futures on Solana. One sign-in—email, Google, or wallet.
        </p>
      </footer>
    </div>
  );
}
