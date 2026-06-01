import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label: string;
  children: ReactNode;
}

export function IconButton({ active, label, className, children, ...rest }: Props) {
  return (
    <button
      aria-label={label}
      data-active={active ? 'true' : undefined}
      className={clsx('clay-icon-btn', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
