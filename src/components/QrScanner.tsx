import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

interface Props {
  onText: (text: string) => void;
  size?: number;
  paused?: boolean;
}

/** 摄像头扫码（@zxing/browser，走 getUserMedia，Web 与 Android WebView 通用）。 */
export function QrScanner({ onText, size = 232, paused }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paused) return;
    let controls: IScannerControls | undefined;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result) => {
          if (!cancelled && result) onText(result.getText());
        }
      )
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch((e) => {
        setError(
          /NotAllowed|Permission/i.test(String(e))
            ? '相机权限被拒绝，请改用「粘贴文本码」。'
            : '无法打开相机，请改用「粘贴文本码」。'
        );
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // onText 在父组件用 useCallback 稳定；paused 变化时重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex flex-col items-center justify-center gap-2 rounded-[18px] bg-surface-2 border-[3px] border-line text-muted text-center px-4"
      >
        <CameraOff size={36} />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-[18px] overflow-hidden border-[3px] border-line bg-black"
      style={{ width: size, height: size }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      {/* 取景框装饰 */}
      <div className="pointer-events-none absolute inset-4 rounded-[12px] border-2 border-white/70" />
    </div>
  );
}
