import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Send } from 'lucide-react';
import { Input } from '../ui';
import { useGameStore } from '../../store/gameStore';
import { submitGuess } from '../../game/engine';
import type { ChatItem } from '../../types';

function Bubble({ item }: { item: ChatItem }) {
  if (item.kind === 'system') {
    return <div className="text-center text-xs text-muted py-0.5">{item.text}</div>;
  }
  const tone =
    item.kind === 'correct'
      ? 'bg-accent/15 text-accent'
      : item.kind === 'close'
        ? 'bg-warning/15 text-[color:var(--warning)]'
        : 'bg-surface-2 text-text';
  return (
    <div className="text-sm">
      <span className="text-muted mr-1">{item.name}：</span>
      <span className={clsx('inline-block px-2 py-0.5 rounded-lg', tone)}>
        {item.kind === 'correct' ? `${item.text} ✓ 猜对了！` : item.text}
        {item.kind === 'close' && ' · 很接近了！'}
      </span>
    </div>
  );
}

export function ChatPanel({ className }: { className?: string }) {
  const chat = useGameStore((s) => s.chat);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [chat.length]);
  return (
    <div ref={ref} className={clsx('overflow-y-auto flex flex-col gap-1 px-1', className)}>
      {chat.length === 0 ? (
        <div className="text-center text-xs text-muted py-2">在下方输入你的猜测吧～</div>
      ) : (
        chat.map((c) => <Bubble key={c.id} item={c} />)
      )}
    </div>
  );
}

export function GuessInput({ disabled }: { disabled?: boolean }) {
  const [v, setV] = useState('');
  const submit = () => {
    const t = v.trim();
    if (!t) return;
    submitGuess(t);
    setV('');
  };
  return (
    <div className="flex gap-2">
      <Input
        value={v}
        disabled={disabled}
        placeholder={disabled ? '等待开始…' : '输入你的猜测…'}
        maxLength={20}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button
        aria-label="发送"
        onClick={submit}
        disabled={disabled}
        className="clay-btn clay-btn--primary !min-w-[52px] !px-4"
      >
        <Send size={20} />
      </button>
    </div>
  );
}
