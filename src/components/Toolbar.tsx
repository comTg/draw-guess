import { clsx } from 'clsx';
import { Pencil, Eraser, PaintBucket, Undo2, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { PALETTE, WIDTHS } from '../lib/canvasDraw';
import type { Tool } from '../types';

interface Props {
  onUndo: () => void;
  onClear: () => void;
}

const TOOLS: { tool: Tool; label: string; Icon: typeof Pencil }[] = [
  { tool: 'pen', label: '画笔', Icon: Pencil },
  { tool: 'eraser', label: '橡皮', Icon: Eraser },
  { tool: 'fill', label: '填充', Icon: PaintBucket },
];

export function Toolbar({ onUndo, onClear }: Props) {
  const tool = useGameStore((s) => s.tool);
  const color = useGameStore((s) => s.color);
  const width = useGameStore((s) => s.width);
  const setTool = useGameStore((s) => s.setTool);
  const setColor = useGameStore((s) => s.setColor);
  const setWidth = useGameStore((s) => s.setWidth);

  return (
    <div className="clay-card p-3 flex flex-col gap-3">
      {/* 调色盘 */}
      <div className="flex flex-wrap gap-2 justify-center">
        {PALETTE.map((c) => (
          <button
            key={c}
            aria-label={`颜色 ${c}`}
            onClick={() => setColor(c)}
            className={clsx(
              'w-8 h-8 rounded-full border-2 cursor-pointer transition-transform active:scale-90',
              color === c ? 'ring-[3px] ring-primary ring-offset-1' : 'border-line'
            )}
            style={{ background: c }}
          />
        ))}
      </div>

      {/* 笔宽 + 工具 + 撤销/清空 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              aria-label={`笔宽 ${i + 1}`}
              onClick={() => setWidth(w)}
              className={clsx(
                'w-9 h-9 rounded-[12px] border-2 flex items-center justify-center cursor-pointer',
                width === w ? 'border-primary bg-surface-2' : 'border-line'
              )}
            >
              <span
                className="rounded-full bg-text block"
                style={{ width: 4 + i * 4, height: 4 + i * 4 }}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {TOOLS.map(({ tool: t, label, Icon }) => (
            <button
              key={t}
              aria-label={label}
              data-active={tool === t ? 'true' : undefined}
              onClick={() => setTool(t)}
              className="clay-icon-btn !w-10 !h-10"
            >
              <Icon size={20} />
            </button>
          ))}
          <button aria-label="撤销" onClick={onUndo} className="clay-icon-btn !w-10 !h-10">
            <Undo2 size={20} />
          </button>
          <button
            aria-label="清空"
            onClick={onClear}
            className="clay-icon-btn !w-10 !h-10 text-danger"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
