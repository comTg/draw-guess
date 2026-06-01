import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, Screen, TopBar } from '../components/ui';
import { QrView } from '../components/QrView';
import { QrScanner } from '../components/QrScanner';
import { CopyCode, PasteCode } from '../components/CodeFallback';
import { ConnectedPanel } from '../components/ConnectedPanel';
import { SignalAssembler } from '../net/signaling';
import { useConnStore } from '../store/connStore';
import { useNavStore } from '../store/navStore';

export function HostPage() {
  const phase = useConnStore((s) => s.phase);
  const localFrames = useConnStore((s) => s.localFrames);
  const error = useConnStore((s) => s.error);
  const startHost = useConnStore((s) => s.startHost);
  const hostReceiveAnswer = useConnStore((s) => s.hostReceiveAnswer);
  const leave = useConnStore((s) => s.leave);
  const go = useNavStore((s) => s.go);

  const asm = useRef(new SignalAssembler());
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    startHost();
  }, [startHost]);

  const onText = useCallback(
    (text: string) => {
      if (scanned) return;
      try {
        const r = asm.current.push(text);
        if (r && r.type === 'answer') {
          setScanned(true);
          hostReceiveAnswer(r.sdp);
        }
      } catch {
        /* 非应答码：忽略，继续扫描 */
      }
    },
    [scanned, hostReceiveAnswer]
  );

  const back = () => {
    leave();
    go('home');
  };

  if (phase === 'connected') {
    return (
      <Screen>
        <TopBar title="创建房间" onBack={back} />
        <ConnectedPanel />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="创建房间" onBack={back} />
      <div className="flex flex-col gap-5 pb-10">
        {error && (
          <Card className="!border-danger text-danger text-sm">{error}</Card>
        )}

        <div>
          <p className="font-head text-lg mb-3">
            <span className="text-primary">第一步</span> · 让对方扫这个码
          </p>
          {localFrames.length ? (
            <QrView frames={localFrames} />
          ) : (
            <div className="flex items-center gap-2 text-muted justify-center py-12">
              <Loader2 className="animate-spin" size={20} /> 正在生成邀请码…
            </div>
          )}
          {localFrames.length > 0 && (
            <div className="px-4">
              <CopyCode frames={localFrames} />
            </div>
          )}
        </div>

        <div className="border-t-2 border-line pt-4">
          <p className="font-head text-lg mb-3">
            <span className="text-primary">第二步</span> · 扫描对方的应答码
          </p>
          <div className="flex justify-center">
            {scanned ? (
              <div className="flex items-center gap-2 text-muted py-12">
                <Loader2 className="animate-spin" size={20} /> 正在建立连接…
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
      </div>
    </Screen>
  );
}
