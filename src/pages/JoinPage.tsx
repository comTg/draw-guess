import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Screen, TopBar } from '../components/ui';
import { QrView } from '../components/QrView';
import { QrScanner } from '../components/QrScanner';
import { CopyCode, PasteCode } from '../components/CodeFallback';
import { ConnectedPanel } from '../components/ConnectedPanel';
import { SignalAssembler } from '../net/signaling';
import { useConnStore } from '../store/connStore';
import { useNavStore } from '../store/navStore';

export function JoinPage() {
  const phase = useConnStore((s) => s.phase);
  const localFrames = useConnStore((s) => s.localFrames);
  const error = useConnStore((s) => s.error);
  const startJoin = useConnStore((s) => s.startJoin);
  const guestReceiveOffer = useConnStore((s) => s.guestReceiveOffer);
  const leave = useConnStore((s) => s.leave);
  const go = useNavStore((s) => s.go);

  const asm = useRef(new SignalAssembler());
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    startJoin();
  }, [startJoin]);

  const onText = useCallback(
    (text: string) => {
      if (scanned) return;
      try {
        const r = asm.current.push(text);
        if (r && r.type === 'offer') {
          setScanned(true);
          guestReceiveOffer(r.sdp);
        }
      } catch {
        /* 非邀请码：忽略 */
      }
    },
    [scanned, guestReceiveOffer]
  );

  const back = () => {
    leave();
    go('home');
  };

  if (phase === 'connected') {
    return (
      <Screen>
        <TopBar title="加入房间" onBack={back} />
        <ConnectedPanel />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="加入房间" onBack={back} />
      <div className="flex flex-col gap-5 pb-10">
        {error && (
          <Card className="!border-danger text-danger text-sm">{error}</Card>
        )}

        <div>
          <p className="font-head text-lg mb-3">
            <span className="text-primary">第一步</span> · 扫描房主的邀请码
          </p>
          <div className="flex justify-center">
            {scanned ? (
              <div className="flex items-center gap-2 text-accent py-12">
                <CheckCircle2 size={22} /> 已扫描，生成应答码中…
              </div>
            ) : (
              <QrScanner onText={onText} />
            )}
          </div>
          {!scanned && (
            <div className="px-4">
              <PasteCode onSubmit={(lines) => lines.forEach(onText)} />
            </div>
          )}
        </div>

        <div className="border-t-2 border-line pt-4">
          <p className="font-head text-lg mb-3">
            <span className="text-primary">第二步</span> · 把这个码给房主扫
          </p>
          {localFrames.length ? (
            <QrView frames={localFrames} />
          ) : (
            <div className="flex items-center gap-2 text-muted justify-center py-12">
              {scanned ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> 生成中…
                </>
              ) : (
                <span className="text-sm">扫描成功后这里会出现应答码</span>
              )}
            </div>
          )}
          {localFrames.length > 0 && (
            <div className="px-4">
              <CopyCode frames={localFrames} />
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}
