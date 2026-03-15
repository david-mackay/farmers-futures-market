'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, LogOut } from 'lucide-react';
import { AppKitButton, useAppKitAccount, useDisconnect, useAppKitBalance } from '@reown/appkit/react';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { useTheme } from '@/contexts/theme-context';
import { useCurrency } from '@/contexts/currency-context';
import { Badge } from '@/components/ui/badge';
import { appkitProjectId } from '@/config/appkit-config';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/explore', label: 'Explore' },
  { href: '/funds', label: 'Funds' },
  { href: '/deliveries', label: 'Deliveries' },
  { href: '/crops', label: 'Crops' },
  { href: '/profile', label: 'Profile' },
];

export function NavBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { fetchBalance } = useAppKitBalance();
  const [balance, setBalance] = useState<{ formatted: string; symbol: string } | null>(null);
  const devMode = useDevMode();

  useEffect(() => {
    if (!isConnected) {
      setBalance(null);
      return;
    }
    fetchBalance()
      .then((res) => {
        const data = res && typeof res === 'object' && 'data' in res ? (res as { data?: { formatted?: string; symbol?: string } }).data : undefined;
        if (data?.formatted != null && data?.symbol != null) {
          setBalance({ formatted: data.formatted, symbol: data.symbol });
        } else {
          setBalance(null);
        }
      })
      .catch(() => setBalance(null));
  }, [isConnected, fetchBalance]);
  const { theme, toggleTheme } = useTheme();
  const { currency, toggleCurrency } = useCurrency();

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border safe-area-pt" aria-label="Site header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 min-h-[3rem] sm:min-h-[3.5rem]">
          {/* Logo: compact on mobile */}
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 cursor-pointer transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label="Future's Farmer's Market home"
          >
            <span className="text-base sm:text-xl font-bold text-primary truncate">Future&apos;s</span>
            <span className="text-base sm:text-xl font-bold text-foreground truncate hidden sm:inline">Farmer&apos;s Market</span>
            <span className="text-base font-bold text-foreground truncate sm:hidden">FFM</span>
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

          {/* Currency + theme toggle + user + dev */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
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
                {isConnected && (
                  <div className="flex items-center gap-2">
                    <AppKitButton />
                    {balance && (
                      <span className="text-sm text-muted whitespace-nowrap" title="Wallet balance">
                        {balance.formatted} {balance.symbol}
                      </span>
                    )}
                  </div>
                )}
                <Badge variant={user.is_farmer ? 'farmer' : 'trader'}>
                  {user.is_farmer ? 'Farmer' : 'Buyer'}
                </Badge>
                {user.is_verified && user.is_farmer && (
                  <span className="hidden sm:inline"><Badge variant="verified">Verified</Badge></span>
                )}
                <span className="text-sm text-foreground truncate max-w-[6rem] sm:max-w-[8rem]" title={user.display_name}>
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
