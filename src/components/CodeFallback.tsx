import { useState } from 'react';
import { Button } from './ui';

/** 兜底：把本机要展示的二维码内容导出为文本，供对方手动粘贴。 */
export function CopyCode({ frames }: { frames: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = frames.join('\n');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 不可用时用户可手动选中复制 */
    }
  };
  return (
    <details className="mt-3">
      <summary className="text-sm text-muted cursor-pointer select-none">
        无法扫码？显示文本码
      </summary>
      <textarea
        readOnly
        value={text}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="clay-input mt-2 font-mono text-xs leading-tight"
      />
      <Button variant="ghost" full onClick={copy} className="mt-2">
        {copied ? '已复制 ✓' : '复制文本码'}
      </Button>
    </details>
  );
}

/** 兜底：手动粘贴对方的文本码（支持多帧，按行/空白分隔）。 */
export function PasteCode({ onSubmit }: { onSubmit: (lines: string[]) => void }) {
  const [v, setV] = useState('');
  const submit = () => {
    const lines = v.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length) onSubmit(lines);
  };
  return (
    <details className="mt-3">
      <summary className="text-sm text-muted cursor-pointer select-none">
        无法扫码？粘贴文本码
      </summary>
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        rows={3}
        placeholder="把对方的文本码粘贴到这里"
        className="clay-input mt-2 font-mono text-xs leading-tight"
      />
      <Button variant="ghost" full onClick={submit} className="mt-2">
        导入
      </Button>
    </details>
  );
}
