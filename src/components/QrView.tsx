import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface Props {
  frames: string[];
  size?: number;
  /** 多帧轮播间隔(ms) */
  interval?: number;
}

/** 展示二维码；多帧时自动轮播（动态码），扫描端会自动拼接。 */
export function QrView({ frames, size = 232, interval = 600 }: Props) {
  const [idx, setIdx] = useState(0);
  const [url, setUrl] = useState('');

  // 帧切换
  useEffect(() => {
    setIdx(0);
    if (frames.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % frames.length), interval);
    return () => clearInterval(t);
  }, [frames, interval]);

  // 渲染当前帧
  useEffect(() => {
    let alive = true;
    const text = frames[idx] ?? '';
    if (!text) {
      setUrl('');
      return;
    }
    QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size * 2,
      color: { dark: '#1f1840', light: '#ffffff' },
    })
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      alive = false;
    };
  }, [frames, idx, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="bg-white p-3 rounded-[18px] border-[3px] border-line"
        style={{ width: size + 24 }}
      >
        {url ? (
          <img
            src={url}
            width={size}
            height={size}
            alt="连接二维码"
            className="block rounded-md"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="animate-pulse bg-surface-2 rounded-md"
          />
        )}
      </div>
      {frames.length > 1 && (
        <span className="text-sm text-muted">
          动态码 {idx + 1}/{frames.length}（让对方持续对准即可）
        </span>
      )}
    </div>
  );
}
