import { Palette, Play, UserPlus, Settings, HelpCircle, Shuffle } from 'lucide-react';
import { Button, Input, Card, IconButton, Screen } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { useUiStore } from '../store/uiStore';
import { useNavStore } from '../store/navStore';

const NAME_A = ['快乐', '神秘', '机智', '勇敢', '迷糊', '闪电'];
const NAME_B = ['小画家', '猜词王', '阿喵', '阿汪', '小恐龙', '泡泡'];
const AVATAR_OPTIONS = [0, 1, 2, 3, 4, 5];

export function HomePage() {
  const name = useUiStore((s) => s.name);
  const avatar = useUiStore((s) => s.avatar);
  const setProfile = useUiStore((s) => s.setProfile);
  const go = useNavStore((s) => s.go);

  const randomName = () => {
    const a = NAME_A[Math.floor(Math.random() * NAME_A.length)];
    const b = NAME_B[Math.floor(Math.random() * NAME_B.length)];
    setProfile({ name: a + b });
  };

  return (
    <Screen>
      <div className="flex-1 flex flex-col">
        {/* Hero */}
        <div className="pt-10 pb-6 text-center clay-pop">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-primary text-white shadow-clay mb-4">
            <Palette size={40} strokeWidth={2.2} />
          </div>
          <h1 className="font-head text-4xl font-bold text-text">你画我猜</h1>
          <p className="text-muted mt-1">双人 · 无需服务器</p>
        </div>

        {/* 玩家档案 */}
        <Card>
          <label htmlFor="nick" className="block text-sm font-bold text-muted mb-2">
            昵称
          </label>
          <div className="flex gap-2">
            <Input
              id="nick"
              value={name}
              maxLength={8}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder="给自己起个名字"
            />
            <IconButton label="随机昵称" onClick={randomName}>
              <Shuffle size={20} />
            </IconButton>
          </div>

          <p className="text-sm font-bold text-muted mt-4 mb-2">头像</p>
          <div className="flex gap-3 flex-wrap">
            {AVATAR_OPTIONS.map((i) => (
              <Avatar
                key={i}
                index={i}
                size={46}
                selected={avatar === i}
                onClick={() => setProfile({ avatar: i })}
              />
            ))}
          </div>
        </Card>

        {/* 主操作 */}
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="primary" full onClick={() => go('host')}>
            <Play size={22} /> 创建房间
          </Button>
          <Button variant="secondary" full onClick={() => go('join')}>
            <UserPlus size={22} /> 加入房间
          </Button>
        </div>

        <div className="flex-1" />

        {/* 次操作 */}
        <div className="flex justify-center gap-3 py-5">
          <Button variant="ghost" onClick={() => go('settings')}>
            <Settings size={20} /> 设置
          </Button>
          <Button variant="ghost" onClick={() => go('help')}>
            <HelpCircle size={20} /> 玩法
          </Button>
        </div>
      </div>
    </Screen>
  );
}
