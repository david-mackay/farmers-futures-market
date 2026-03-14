'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useDevMode } from '@/hooks/use-dev-mode';
import { Badge } from '@/components/ui/badge';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/trading-post', label: 'Trading Post' },
  { href: '/plant-advisor', label: 'Plant Advisor' },
  { href: '/hedge-flow', label: 'Hedge Flow' },
  { href: '/profile', label: 'Profile' },
];

export function NavBar() {
  const pathname = usePathname();
  const { user, users, switchUser } = useUser();
  const devMode = useDevMode();

  return (
    <nav className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold text-primary">Future&apos;s</span>
            <span className="text-xl font-bold text-foreground">Farmer&apos;s Market</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-foreground hover:bg-muted-bg'
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side: user switcher + badges */}
          <div className="flex items-center gap-3">
            {devMode && (
              <span className="text-xs px-2 py-1 bg-secondary/30 text-foreground rounded font-mono font-bold">
                DEV
              </span>
            )}
            {user && (
              <>
                <Badge variant={user.role === 'FARMER' ? 'farmer' : 'trader'}>
                  {user.role}
                </Badge>
                {user.is_verified && <Badge variant="verified">Verified</Badge>}
              </>
            )}
            {devMode && users.length > 0 && (
              <select
                value={user?.id || ''}
                onChange={(e) => switchUser(e.target.value)}
                className="text-sm border border-border rounded-lg px-2 py-1.5 bg-card text-foreground cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.display_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                  ${active ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground'}
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
