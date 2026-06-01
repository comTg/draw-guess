import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { Button } from '../ui';
import { PairPanel } from '../PairPanel';
import { useConnStore } from '../../store/connStore';

/**
 * 断线重连浮层：先给 3s 自动恢复宽限；仍未恢复则提供"重新配对"（原地二维码握手）。
 * 连接恢复后由 GamePage 隐藏本浮层。
 */
export function ReconnectOverlay({ onHome }: { onHome: () => void }) {
  const role = useConnStore((s) => s.role);
  const phase = useConnStore((s) => s.phase);
  const repair = useConnStore((s) => s.repair);
  const [mode, setMode] = useState<'grace' | 'prompt' | 'exchange'>('grace');

  useEffect(() => {
    const t = setTimeout(() => setMode((m) => (m === 'grace' ? 'prompt' : m)), 3000);
    return () => clearTimeout(t);
  }, []);

  const startRepair = () => {
    setMode('exchange');
    void repair();
  };

  return (
    <div
      className="fixed inset-0 bg-bg/92 backdrop-blur-sm flex justify-center overflow-y-auto"
      style={{ zIndex: 30 }}
    >
      <div className="w-full max-w-md min-h-full flex flex-col px-5 py-8 safe-top safe-bottom">
        <div className="flex flex-col items-center text-center gap-2 mb-4">
          <div className="w-16 h-16 rounded-[20px] bg-danger/15 text-danger flex items-center justify-center">
            <WifiOff size={32} />
          </div>
          <h3 className="font-head text-2xl">连接已断开</h3>
        </div>

        {mode === 'grace' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted">
            <Loader2 className="animate-spin" size={26} />
            正在尝试自动恢复…
          </div>
        )}

        {mode === 'prompt' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-muted text-center max-w-xs">
              没能自动恢复。可重新扫码配对（对局进度会自动恢复），或返回首页。
            </p>
            <Button variant="primary" onClick={startRepair}>
              {role === 'host' ? '重新出码配对' : '重新扫码配对'}
            </Button>
            <Button variant="ghost" onClick={onHome}>
              返回首页
            </Button>
          </div>
        )}

        {mode === 'exchange' && (
          <div className="clay-card p-4">
            {phase === 'connected' ? (
              <div className="flex items-center gap-2 text-accent justify-center py-8">
                <Loader2 className="animate-spin" size={18} /> 恢复对局中…
              </div>
            ) : (
              <PairPanel role={role === 'host' ? 'host' : 'guest'} />
            )}
            <Button variant="ghost" full className="mt-3" onClick={onHome}>
              返回首页
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
