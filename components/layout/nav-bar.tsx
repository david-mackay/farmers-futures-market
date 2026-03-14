'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { useTheme } from '@/contexts/theme-context';
import { Badge } from '@/components/ui/badge';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/explore', label: 'Explore' },
  { href: '/crops', label: 'Crops' },
  { href: '/profile', label: 'Profile' },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, users, switchUser } = useUser();
  const devMode = useDevMode();
  const { theme, toggleTheme } = useTheme();

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

          {/* Theme toggle + user + dev */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
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
            {user && (
              <>
                <Badge variant={user.role === 'FARMER' ? 'farmer' : 'trader'}>
                  {user.role}
                </Badge>
                {user.is_verified && <span className="hidden sm:inline"><Badge variant="verified">Verified</Badge></span>}
              </>
            )}
            {devMode && users.length > 0 && (
              <select
                value={user?.id || ''}
                onChange={(e) => switchUser(e.target.value)}
                className="text-xs sm:text-sm border border-border rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 bg-card text-foreground cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 max-w-[7rem] sm:max-w-none"
                aria-label="Switch user"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.display_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
