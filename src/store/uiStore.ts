import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CONFIG, type GameConfig } from '../types';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Skin = 'grape' | 'ocean';

interface UiState {
  // 外观
  theme: ThemeMode;
  skin: Skin;
  // 声音 / 反馈
  muted: boolean;
  volume: number; // 0..1
  haptics: boolean;
  // 对局设置
  config: GameConfig;
  // 玩家档案（握手时发送给对端）
  name: string;
  avatar: number;

  setTheme: (t: ThemeMode) => void;
  setSkin: (s: Skin) => void;
  setMuted: (m: boolean) => void;
  setVolume: (v: number) => void;
  setHaptics: (h: boolean) => void;
  setConfig: (patch: Partial<GameConfig>) => void;
  setProfile: (patch: { name?: string; avatar?: number }) => void;
}

const AVATAR_COUNT = 6;
const randomName = () => {
  const a = ['快乐', '神秘', '机智', '勇敢', '迷糊', '闪电'];
  const b = ['小画家', '猜词王', '阿喵', '阿汪', '小恐龙', '泡泡'];
  // 不使用 Math.random 的全局副作用问题：此处仅初始化默认昵称，可被持久化覆盖
  const i = Math.floor(Math.random() * a.length);
  const j = Math.floor(Math.random() * b.length);
  return a[i] + b[j];
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      skin: 'grape',
      muted: false,
      volume: 0.7,
      haptics: true,
      config: { ...DEFAULT_CONFIG },
      name: randomName(),
      avatar: Math.floor(Math.random() * AVATAR_COUNT),

      setTheme: (theme) => set({ theme }),
      setSkin: (skin) => set({ skin }),
      setMuted: (muted) => set({ muted }),
      setVolume: (volume) => set({ volume }),
      setHaptics: (haptics) => set({ haptics }),
      setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
      setProfile: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    { name: 'draw-guess-ui' }
  )
);

export const AVATARS = AVATAR_COUNT;
