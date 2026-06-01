import type { ReactNode } from 'react';
import { Card, Segmented, Toggle, Screen, TopBar } from '../components/ui';
import { useUiStore } from '../store/uiStore';
import { useNavStore } from '../store/navStore';
import type { Difficulty } from '../types';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b-2 border-line last:border-0">
      <span className="text-text font-bold">{label}</span>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const back = useNavStore((s) => s.go);
  const u = useUiStore();

  return (
    <Screen>
      <TopBar title="设置" onBack={() => back('home')} />
      <div className="flex flex-col gap-4 pb-8">
        <Card className="py-2">
          <Row label="主题">
            <Segmented
              value={u.theme}
              onChange={u.setTheme}
              options={[
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' },
                { label: '跟随', value: 'system' },
              ]}
            />
          </Row>
          <Row label="皮肤">
            <Segmented
              value={u.skin}
              onChange={u.setSkin}
              options={[
                { label: '葡萄紫', value: 'grape' },
                { label: '海洋', value: 'ocean' },
              ]}
            />
          </Row>
        </Card>

        <Card className="py-2">
          <Row label="音量">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(u.volume * 100)}
              disabled={u.muted}
              onChange={(e) => u.setVolume(Number(e.target.value) / 100)}
              style={{ accentColor: 'var(--primary)' }}
              className="w-36 cursor-pointer disabled:opacity-40"
              aria-label="音量"
            />
          </Row>
          <Row label="静音">
            <Toggle checked={u.muted} onChange={u.setMuted} label="静音" />
          </Row>
          <Row label="震动反馈">
            <Toggle checked={u.haptics} onChange={u.setHaptics} label="震动反馈" />
          </Row>
        </Card>

        <Card className="py-2">
          <Row label="回合数">
            <Segmented
              value={u.config.rounds}
              onChange={(rounds) => u.setConfig({ rounds })}
              options={[
                { label: '4', value: 4 },
                { label: '6', value: 6 },
                { label: '8', value: 8 },
              ]}
            />
          </Row>
          <Row label="每回合时长">
            <Segmented
              value={u.config.drawSeconds}
              onChange={(drawSeconds) => u.setConfig({ drawSeconds })}
              options={[
                { label: '60s', value: 60 },
                { label: '80s', value: 80 },
                { label: '120s', value: 120 },
              ]}
            />
          </Row>
          <Row label="难度">
            <Segmented<Difficulty>
              value={u.config.difficulty}
              onChange={(difficulty) => u.setConfig({ difficulty })}
              options={[
                { label: '简单', value: 'easy' },
                { label: '普通', value: 'normal' },
                { label: '困难', value: 'hard' },
              ]}
            />
          </Row>
        </Card>

        <Card className="py-2">
          <Row label="仅局域网模式">
            <Toggle
              checked={u.config.lanOnly}
              onChange={(lanOnly) => u.setConfig({ lanOnly })}
              label="仅局域网模式"
            />
          </Row>
          <p className="text-sm text-muted pt-1 pb-2">
            开启后关闭公共 STUN，仅在同一 WiFi 下连接，二维码更小、更快。
          </p>
        </Card>
      </div>
    </Screen>
  );
}
