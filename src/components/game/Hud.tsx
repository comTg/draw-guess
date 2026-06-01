import { clsx } from 'clsx';
import { Pencil } from 'lucide-react';
import { Avatar } from '../Avatar';
import { useGameStore } from '../../store/gameStore';
import { HOST_ID, GUEST_ID } from '../../net/protocol';
import type { PlayerId } from '../../types';

function Chip({ id }: { id: PlayerId }) {
  const player = useGameStore((s) => s.players[id]);
  const score = useGameStore((s) => s.scores[id] ?? 0);
  const drawerId = useGameStore((s) => s.drawerId);
  const meId = useGameStore((s) => s.meId);
  if (!player) return <div className="w-24" />;
  return (
    <div className={clsx('flex items-center gap-2 px-2 py-1 rounded-full', id === meId && 'bg-surface-2')}>
      <Avatar index={player.avatar} size={30} />
      <div className="leading-tight">
        <div className="text-sm font-bold flex items-center gap-1 max-w-[5.5rem] truncate">
          {player.name}
          {id === drawerId && <Pencil size={12} className="text-secondary shrink-0" />}
        </div>
        <div className="text-xs text-muted font-head tabular-nums">{score} 分</div>
      </div>
    </div>
  );
}

export function ScoreBar() {
  const round = useGameStore((s) => s.round);
  const total = useGameStore((s) => s.totalRounds);
  return (
    <div className="clay-card p-2 flex items-center justify-between">
      <Chip id={HOST_ID} />
      <span className="text-xs text-muted font-head whitespace-nowrap px-1">
        第 {round}/{total} 回合
      </span>
      <Chip id={GUEST_ID} />
    </div>
  );
}

export function CountdownBar() {
  const remaining = useGameStore((s) => s.remaining);
  const total = useGameStore((s) => s.drawSeconds);
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const low = remaining <= 10;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden border-2 border-line">
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-1000 ease-linear',
            low ? 'bg-danger' : 'bg-accent'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={clsx(
          'font-head tabular-nums w-10 text-right',
          low ? 'text-danger animate-pulse' : 'text-text'
        )}
      >
        {remaining}s
      </span>
    </div>
  );
}

/** 猜手视角的词格（揭示的字符 + 空格），附分类与字数。 */
export function WordMask() {
  const mask = useGameStore((s) => s.mask);
  const category = useGameStore((s) => s.category);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {mask.map((c, i) => (
          <span
            key={i}
            className="w-8 h-9 rounded-md bg-surface-2 border-2 border-line flex items-center justify-center font-head text-lg text-primary"
          >
            {c ?? ''}
          </span>
        ))}
      </div>
      {category && (
        <span className="text-xs text-muted">
          分类：{category} · {mask.length} 字
        </span>
      )}
    </div>
  );
}
