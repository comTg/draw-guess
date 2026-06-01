import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

/** 居中、限宽的全高页面容器（移动优先，Web 上限宽居中）。 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-full w-full flex justify-center bg-bg">
      <div
        className={clsx(
          'w-full max-w-md min-h-full flex flex-col px-5 safe-top safe-bottom',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-3 py-4">
      {onBack && (
        <button aria-label="返回" onClick={onBack} className="clay-icon-btn cursor-pointer">
          <ChevronLeft />
        </button>
      )}
      <h2 className="font-head text-2xl text-text">{title}</h2>
    </div>
  );
}
