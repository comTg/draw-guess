import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui';
import { Avatar } from './Avatar';
import { useConnStore } from '../store/connStore';
import { useUiStore } from '../store/uiStore';
import { useNavStore } from '../store/navStore';

function PlayerBadge({ name, avatar, me }: { name: string; avatar: number; me?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 w-24">
      <Avatar index={avatar} size={56} />
      <span className="font-bold text-text text-center truncate w-full">{name}</span>
      {me && <span className="text-xs text-muted">（我）</span>}
    </div>
  );
}

/** 连接成功后的双方信息 + 开始入口（Host/Join 共用）。 */
export function ConnectedPanel() {
  const remote = useConnStore((s) => s.remote);
  const name = useUiStore((s) => s.name);
  const avatar = useUiStore((s) => s.avatar);
  const go = useNavStore((s) => s.go);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 pb-10">
      <div className="text-center clay-pop">
        <CheckCircle2 className="text-accent mx-auto" size={60} strokeWidth={2.2} />
        <h3 className="font-head text-2xl mt-2 text-text">已连接！</h3>
      </div>

      <div className="flex items-center gap-5">
        <PlayerBadge name={name} avatar={avatar} me />
        <span className="text-muted font-head text-xl">VS</span>
        <PlayerBadge name={remote?.name ?? '对方'} avatar={remote?.avatar ?? 0} />
      </div>

      <Button variant="primary" onClick={() => go('game')}>
        开始游戏
      </Button>
      <p className="text-sm text-muted">（对局界面将在 M3 完成）</p>
    </div>
  );
}
