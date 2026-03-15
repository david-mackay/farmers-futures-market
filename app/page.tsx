'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/markets');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="py-12 text-center text-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="py-12 text-center text-muted text-sm">
      Redirecting to Markets…
    </div>
  );
}
