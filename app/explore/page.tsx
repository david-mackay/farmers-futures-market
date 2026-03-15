'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExploreRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/markets');
  }, [router]);
  return (
    <div className="py-12 text-center text-muted text-sm">
      Redirecting to Markets…
    </div>
  );
}
