'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TradingPostRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/explore');
  }, [router]);
  return (
    <div className="py-12 text-center text-muted text-sm">
      Redirecting to Explore…
    </div>
  );
}
