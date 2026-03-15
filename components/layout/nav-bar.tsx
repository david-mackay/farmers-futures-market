'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Sun, Moon, LogOut } from 'lucide-react';
import { AppKitButton, useDisconnect } from '@reown/appkit/react';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { useTheme } from '@/contexts/theme-context';
import { useCurrency } from '@/contexts/currency-context';
import { Badge } from '@/components/ui/badge';
import { appkitProjectId } from '@/config/appkit-config';

const NAV_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/funds', label: 'Funds' },
  { href: '/deliveries', label: 'Contracts' },
  { href: '/crops', label: 'Crops' },
  { href: '/profile', label: 'Profile' },
];

export function NavBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { disconnect } = useDisconnect();
  const devMode = useDevMode();
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border safe-area-pt overflow-x-hidden" aria-label="Site header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-w-0">
        <div className="flex items-center justify-between gap-2 h-12 sm:h-14 md:h-16 min-h-[3rem] sm:min-h-[3.5rem] min-w-0">
          {/* Logo: single mark on all viewports (Apple-style) */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 min-w-0 cursor-pointer transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label="FFM — Future's Farmer's Market home"
          >
            <Image
              src="/assets/ffm-logo.png"
              alt=""
              width={180}
              height={180}
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              priority
            />
            <span className="logo-font text-xl sm:text-2xl tracking-wide text-foreground truncate hidden sm:inline">FFM</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${active ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground hover:bg-muted-bg'}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Currency + theme toggle + user + dev — allow shrink on mobile so we don't force horizontal scroll */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 overflow-hidden shrink">
            <button
              type="button"
              onClick={toggleCurrency}
              className="px-2 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-muted-bg transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation border border-border"
              aria-label={currency === 'JMD' ? 'Show prices in USD' : 'Show prices in JMD'}
              title={currency === 'JMD' ? 'Switch to USD' : 'Switch to JMD'}
            >
              {currency === 'JMD' ? 'JMD' : 'USD'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-muted-bg transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" strokeWidth={2} aria-hidden />
              ) : (
                <Moon className="w-5 h-5" strokeWidth={2} aria-hidden />
              )}
            </button>
            {devMode && (
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-secondary/30 text-foreground rounded font-mono font-bold">
                DEV
              </span>
            )}
            {appkitProjectId && !user && (
              <AppKitButton />
            )}
            {user && (
              <>
                <Badge variant={user.is_farmer ? 'farmer' : 'trader'}>
                  {user.is_farmer ? 'Farmer' : 'Buyer'}
                </Badge>
                {user.is_verified && user.is_farmer && (
                  <span className="hidden sm:inline"><Badge variant="verified">Verified</Badge></span>
                )}
                <span className="text-sm text-foreground truncate max-w-[5rem] sm:max-w-[8rem]" title={user.display_name}>
                  {user.display_name}
                </span>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-muted-bg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation"
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5" strokeWidth={2} aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
