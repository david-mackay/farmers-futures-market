'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Package, Store, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/explore', label: 'Explore', icon: Store },
  { href: '/deliveries', label: 'Deliveries', icon: Package },
  { href: '/crops', label: 'Crops', icon: BookOpen },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-5 h-14 min-h-[3.5rem]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 py-2
                transition-colors duration-200 cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                ${active ? 'text-primary' : 'text-muted hover:text-foreground'}
              `}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon className="w-6 h-6 shrink-0" strokeWidth={2} aria-hidden />
              <span className="text-[10px] font-medium truncate w-full text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
