'use client';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'primary' | 'muted' | 'inverse';

const sizeClasses: Record<Size, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

const variantClasses: Record<Variant, string> = {
  primary: 'border-primary border-t-transparent',
  muted: 'border-muted border-t-transparent',
  inverse: 'border-white border-t-transparent',
};

interface SpinnerProps {
  size?: Size;
  variant?: Variant;
  className?: string;
}

export function Spinner({
  size = 'md',
  variant = 'primary',
  className = '',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-hidden="true"
      className={`
        inline-block rounded-full animate-spin
        ${sizeClasses[size]} ${variantClasses[variant]}
        ${className}
      `}
    />
  );
}
