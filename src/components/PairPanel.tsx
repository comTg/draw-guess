import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { QrView } from './QrView';
import { QrScanner } from './QrScanner';
import { CopyCode, PasteCode } from './CodeFallback';
import { SignalAssembler } from '../net/signaling';
import { useConnStore } from '../store/connStore';

/**
 * 二维码配对面板（房主出码+扫应答 / 访客扫码+出应答）。
 * 初次配对与断线重连复用同一套交互。
 */
export function PairPanel({ role }: { role: 'host' | 'guest' }) {
  const localFrames = useConnStore((s) => s.localFrames);
  const error = useConnStore((s) => s.error);
  const hostReceiveAnswer = useConnStore((s) => s.hostReceiveAnswer);
  const guestReceiveOffer = useConnStore((s) => s.guestReceiveOffer);

  const asm = useRef(new SignalAssembler());
  const [scanned, setScanned] = useState(false);

  const onText = useCallback(
    (text: string) => {
      if (scanned) return;
      try {
        const r = asm.current.push(text);
        if (!r) return;
        if (role === 'host' && r.type === 'answer') {
          setScanned(true);
          hostReceiveAnswer(r.sdp);
        } else if (role === 'guest' && r.type === 'offer') {
          setScanned(true);
          guestReceiveOffer(r.sdp);
        }
      } catch {
        /* 非目标二维码：忽略 */
      }
    },
    [scanned, role, hostReceiveAnswer, guestReceiveOffer]
  );

  const Step = ({ n, title }: { n: number; title: string }) => (
    <p className="font-head text-base mb-2">
      <span className="text-primary">第{n}步</span> · {title}
    </p>
  );

  const Show = () =>
    localFrames.length ? (
      <div>
        <QrView frames={localFrames} size={196} />
        <div className="px-4">
          <CopyCode frames={localFrames} />
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-muted justify-center py-10">
        <Loader2 className="animate-spin" size={18} /> 生成中…
      </div>
    );

  const Scan = () =>
    scanned ? (
      <div className="flex items-center gap-2 text-accent justify-center py-10">
        <CheckCircle2 size={20} /> 已扫描，建立连接中…
      </div>
    ) : (
      <div className="flex flex-col items-center">
        <QrScanner onText={onText} size={196} />
        <div className="px-4 w-full">
          <PasteCode onSubmit={(lines) => lines.forEach(onText)} />
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="text-danger text-sm text-center">{error}</div>}
      {role === 'host' ? (
        <>
          <div>
            <Step n={1} title="让对方扫这个码" />
            <Show />
          </div>
          <div className="border-t-2 border-line pt-3">
            <Step n={2} title="扫描对方的应答码" />
            <Scan />
          </div>
        </>
      ) : (
        <>
          <div>
            <Step n={1} title="扫描房主的邀请码" />
            <Scan />
          </div>
          <div className="border-t-2 border-line pt-3">
            <Step n={2} title="把这个码给房主扫" />
            <Show />
          </div>
        </>
      )}
    </div>
  );
}
