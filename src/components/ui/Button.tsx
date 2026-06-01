import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', full, className, children, ...rest }: Props) {
  return (
    <button
      className={clsx('clay-btn', `clay-btn--${variant}`, full && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
