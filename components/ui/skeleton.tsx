'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted-bg ${className}`}
      aria-hidden
    />
  );
}

/** Line placeholder (e.g. text row). */
export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <Skeleton className={`h-4 ${className}`} />;
}

/** Card-shaped placeholder. */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`rounded-xl border border-border p-4 ${className}`}>
      <Skeleton className="mb-3 h-4 w-2/3" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="mb-2 h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </div>
  );
}

/** Table row placeholder. */
export function SkeletonRow({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`flex items-center gap-2 border-b border-border py-3 ${className}`}
    >
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}
