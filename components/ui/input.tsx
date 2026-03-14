import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-border bg-card
            text-foreground placeholder:text-muted transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus-visible:ring-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-accent-red' : ''} ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-accent-red">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
