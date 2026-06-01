import type { Pt, Tool, PlayerId, Difficulty, Stroke, GameStatus, PlayerInfo } from '../types';

/** 协议版本，握手时校验，不一致则提示升级。 */
export const PROTOCOL_VERSION = 1;

/** 2 人对战使用固定的角色 ID，避免额外交换。 */
export const HOST_ID: PlayerId = 'H';
export const GUEST_ID: PlayerId = 'G';
export const otherId = (id: PlayerId): PlayerId => (id === HOST_ID ? GUEST_ID : HOST_ID);

/** 断线重连用的全量快照（房主 → 访客）。 */
export interface GameSnapshot {
  status: GameStatus;
  round: number;
  totalRounds: number;
  drawSeconds: number;
  drawerId: PlayerId;
  scores: Record<PlayerId, number>;
  players: Record<PlayerId, PlayerInfo>;
  remaining: number;
  mask: (string | null)[];
  category: string;
  strokes: Stroke[];
  correctWord: string | null;
  winner: PlayerId | 'tie' | null;
  word?: string | null; // 仅当访客是画手时下发
}

export type Msg =
  // —— 连接 / 会话 ——
  | { t: 'hello'; ver: number; id: PlayerId; name: string; avatar: number }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  | { t: 'state_full'; snapshot: GameSnapshot }

  // —— 游戏流程（房主权威，广播给访客）——
  | { t: 'game_config'; rounds: number; drawSeconds: number; difficulty: Difficulty }
  | { t: 'round_start'; round: number; drawerId: PlayerId; wordChoices?: string[] }
  | { t: 'word_selected'; wordLen: number; category: string; seconds: number; word?: string }
  | { t: 'timer'; remaining: number }
  | { t: 'hint'; revealed: { index: number; ch: string }[] }
  | { t: 'guess_result'; playerId: PlayerId; correct: boolean; close?: boolean; text: string }
  | {
      t: 'round_end';
      correctWord: string;
      deltaScores: Record<PlayerId, number>;
      totals: Record<PlayerId, number>;
    }
  | { t: 'game_end'; winner: PlayerId | 'tie'; totals: Record<PlayerId, number> }
  | { t: 'rematch' }

  // —— 玩家输入 ——
  | { t: 'choose_word'; index: number }
  | { t: 'guess'; text: string }
  | { t: 'chat'; text: string }
  | { t: 'emoji'; id: number }
  | { t: 'ready' }
  | { t: 'giveup' }
  | { t: 'hint_req' }

  // —— 绘画同步（画手→猜手）——
  | { t: 'stroke_start'; id: string; color: string; width: number; tool: Tool; p: Pt }
  | { t: 'stroke_points'; id: string; pts: Pt[] }
  | { t: 'stroke_end'; id: string }
  | { t: 'undo' }
  | { t: 'clear' };

export type MsgType = Msg['t'];

/** 安全解析收到的字符串为 Msg；失败返回 null。 */
export function decodeMsg(data: string): Msg | null {
  try {
    const obj = JSON.parse(data);
    if (obj && typeof obj === 'object' && typeof obj.t === 'string') return obj as Msg;
  } catch {
    /* ignore */
  }
  return null;
}

export const encodeMsg = (msg: Msg): string => JSON.stringify(msg);
