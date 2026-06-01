import { clsx } from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={clsx('clay-input', className)} {...rest} />
  )
);
Input.displayName = 'Input';
