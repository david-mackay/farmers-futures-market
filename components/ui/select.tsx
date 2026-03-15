'use client';

import { SelectHTMLAttributes, forwardRef, useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, value, className = '', id, disabled, onChange, ...rest }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement>(null);
    const [open, setOpen] = useState(false);

    const selectedOption = value != null ? options.find((o) => o.value === value) : undefined;
    const displayLabel = selectedOption?.label ?? placeholder ?? '';

    useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleSelect = (optionValue: string) => {
      const select = hiddenSelectRef.current;
      if (select) {
        select.value = optionValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setOpen(false);
    };

    return (
      <div ref={containerRef} className="space-y-1.5 relative">
        {label && (
          <label id={`${selectId}-label`} htmlFor={selectId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        {/* Hidden native select for form submission and ref */}
        <select
          ref={(node) => {
            (hiddenSelectRef as React.MutableRefObject<HTMLSelectElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
          }}
          id={selectId}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          aria-hidden
          tabIndex={-1}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Themed trigger and dropdown */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`
            w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] rounded-lg
            border border-border bg-card text-left
            text-foreground transition-colors duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:border-border/80
            ${!displayLabel ? 'text-muted' : ''}
            ${className}
          `}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? `${selectId}-label` : undefined}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-[min(16rem,50vh)] overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
          >
            {placeholder && (
              <li
                role="option"
                aria-selected={value === '' || value == null}
                onClick={() => handleSelect('')}
                className="px-3 py-2.5 text-sm cursor-pointer text-muted hover:bg-muted-bg hover:text-foreground"
              >
                {placeholder}
              </li>
            )}
            {options.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`
                  px-3 py-2.5 text-sm cursor-pointer transition-colors
                  ${value === opt.value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted-bg'}
                `}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
