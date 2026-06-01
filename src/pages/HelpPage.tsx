import { Card, Screen, TopBar } from '../components/ui';
import { useNavStore } from '../store/navStore';

const STEPS: { t: string; d: string }[] = [
  { t: '1 · 建立连接', d: '一人「创建房间」展示二维码，另一人「加入房间」扫码；再把应答码给房主扫一次，即可直连。' },
  { t: '2 · 轮流作画', d: '每回合一人画、一人猜，回合结束自动交换角色。' },
  { t: '3 · 限时猜词', d: '画手从候选词中选一个开始作画，猜手在倒计时内输入猜测，猜对即得分。' },
  { t: '4 · 计分获胜', d: '越快猜对得分越高；全部回合结束后总分高者获胜。' },
];

export function HelpPage() {
  const back = useNavStore((s) => s.go);
  return (
    <Screen>
      <TopBar title="玩法说明" onBack={() => back('home')} />
      <div className="flex flex-col gap-3 pb-8">
        {STEPS.map((s) => (
          <Card key={s.t}>
            <h3 className="font-head text-lg text-primary">{s.t}</h3>
            <p className="text-text/90 mt-1 leading-relaxed">{s.d}</p>
          </Card>
        ))}
        <Card>
          <p className="text-sm text-muted leading-relaxed">
            提示：两台手机最好连接同一 WiFi，连接更稳定。本游戏不经过任何服务器，对局数据仅在两台设备之间点对点传输。
          </p>
        </Card>
      </div>
    </Screen>
  );
}
