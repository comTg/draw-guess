// ============================================================
// 全局类型定义
// ============================================================

export type PlayerId = string; // nanoid

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Tool = 'pen' | 'eraser' | 'fill';

/** 归一化坐标 [x, y]，取值 0..1（相对画布宽高），消除两端分辨率差异 */
export type Pt = [number, number];

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  avatar: number; // 头像索引
}

/** 一笔完整的笔画（用于本地重绘与断线重放） */
export interface Stroke {
  id: string;
  color: string;
  width: number;
  tool: Tool;
  pts: Pt[];
}

export interface ChatItem {
  id: string;
  from: PlayerId;
  name: string;
  text: string;
  kind: 'chat' | 'guess' | 'system' | 'correct' | 'close';
}

export type GameStatus =
  | 'lobby'
  | 'wordpick'
  | 'drawing'
  | 'roundResult'
  | 'gameOver'
  | 'reconnecting';

export interface GameConfig {
  rounds: number;
  drawSeconds: number;
  difficulty: Difficulty;
  lanOnly: boolean; // 仅局域网模式：关闭 STUN
}

export const DEFAULT_CONFIG: GameConfig = {
  rounds: 6,
  drawSeconds: 80,
  difficulty: 'normal',
  lanOnly: false,
};
