'use client';

interface DeliveryDateFilterProps {
  value: string;
  onChange: (month: string) => void;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

export function DeliveryDateFilter({ value, onChange }: DeliveryDateFilterProps) {
  const months = getMonthOptions();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-primary uppercase tracking-wide">
        Delivery Date
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`
            px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 min-h-[44px] cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            ${!value ? 'bg-primary text-white' : 'bg-muted-bg text-muted hover:bg-border hover:text-foreground'}
          `}
        >
          All Dates
        </button>
        {months.map(m => (
          <button
            type="button"
            key={m.value}
            onClick={() => onChange(m.value)}
            className={`
              px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 min-h-[44px] cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${value === m.value ? 'bg-primary text-white' : 'bg-muted-bg text-muted hover:bg-border hover:text-foreground'}
            `}
          >
            {m.label.split(' ')[0]} {/* Just month name, abbreviated via slice */}
          </button>
        ))}
      </div>
    </div>
  );
}
