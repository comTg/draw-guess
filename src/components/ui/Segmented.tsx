import { clsx } from 'clsx';

interface Opt<T> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  className?: string;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: Props<T>) {
  return (
    <div
      className={clsx(
        'inline-flex p-1 gap-1 rounded-md bg-surface-2 border-[3px] border-line',
        className
      )}
      role="group"
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={clsx(
            'px-3 py-2 rounded-[12px] text-sm font-semibold transition-colors duration-200 cursor-pointer min-h-[40px]',
            value === o.value ? 'bg-primary text-white' : 'text-muted'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
