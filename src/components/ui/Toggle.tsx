import { clsx } from 'clsx';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-[58px] h-[34px] rounded-full border-[3px] transition-colors duration-200 cursor-pointer shrink-0',
        checked ? 'bg-primary border-primary-press' : 'bg-surface-2 border-line'
      )}
    >
      <span
        className={clsx(
          'absolute top-[2px] w-[24px] h-[24px] rounded-full bg-white shadow transition-all duration-200',
          checked ? 'left-[26px]' : 'left-[2px]'
        )}
      />
    </button>
  );
}
