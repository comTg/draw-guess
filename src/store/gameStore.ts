import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Stroke, Tool, PlayerId, PlayerInfo, GameStatus, ChatItem } from '../types';
import type { Msg } from '../net/protocol';
import { WIDTHS } from '../lib/canvasDraw';
import { play } from '../lib/sound';
import { haptic } from '../lib/haptics';

export type MaskCell = string | null; // null=未揭示

interface GameState {
  // ============ 绘画切片 ============
  strokes: Stroke[];
  active: Record<string, Stroke>;
  rev: number;
  epoch: number; // 画布整体替换计数（清空/全量恢复时自增，触发画布重建）
  tool: Tool;
  color: string;
  width: number;
  setTool: (t: Tool) => void;
  setColor: (c: string) => void;
  setWidth: (w: number) => void;
  strokeStart: (s: Stroke) => void;
  strokePoints: (id: string, pts: Stroke['pts']) => void;
  strokeEnd: (id: string) => void;
  undo: () => void;
  clear: () => void;
  applyDraw: (m: Msg) => void;

  // ============ 游戏切片 ============
  status: GameStatus;
  meId: PlayerId;
  round: number;
  totalRounds: number;
  drawSeconds: number;
  drawerId: PlayerId;
  word: string | null; // 仅画手本地持有
  wordChoices: string[]; // 仅画手
  category: string;
  mask: MaskCell[]; // 猜手看到的词格（null=空格）
  remaining: number;
  scores: Record<PlayerId, number>;
  players: Record<PlayerId, PlayerInfo>;
  chat: ChatItem[];
  correctWord: string | null; // 回合结算展示
  lastDelta: Record<PlayerId, number>;
  winner: PlayerId | 'tie' | null;
  flying: { key: string; emoji: number; from: PlayerId }[]; // 飘屏表情（短暂）
  flyEmoji: (emoji: number, from: PlayerId) => void;
  removeFly: (key: string) => void;

  initGame: (p: {
    meId: PlayerId;
    players: Record<PlayerId, PlayerInfo>;
    totalRounds: number;
    drawSeconds: number;
  }) => void;
  setLocalWord: (word: string, choices?: string[]) => void;
  pushChat: (item: Omit<ChatItem, 'id'>) => void;
  applyServerMsg: (m: Msg) => void;
  resetGame: () => void;
}

const emptyBoard = () => ({ strokes: [] as Stroke[], active: {} as Record<string, Stroke> });

export const useGameStore = create<GameState>((set, get) => ({
  // —— 绘画切片 ——
  strokes: [],
  active: {},
  rev: 0,
  epoch: 0,
  tool: 'pen',
  color: '#1F2937',
  width: WIDTHS[1],

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),

  strokeStart: (s) =>
    set((st) => {
      st.active[s.id] = s;
      return { active: st.active, rev: st.rev + 1 };
    }),
  strokePoints: (id, pts) =>
    set((st) => {
      const a = st.active[id];
      if (a) a.pts.push(...pts);
      return { rev: st.rev + 1 };
    }),
  strokeEnd: (id) =>
    set((st) => {
      const a = st.active[id];
      if (a) {
        st.strokes.push(a);
        delete st.active[id];
      }
      return { strokes: st.strokes, active: st.active, rev: st.rev + 1 };
    }),
  undo: () =>
    set((st) => {
      st.strokes.pop();
      return { strokes: st.strokes, rev: st.rev + 1 };
    }),
  clear: () =>
    set((st) => {
      st.strokes.length = 0;
      for (const k in st.active) delete st.active[k];
      return { strokes: st.strokes, active: st.active, rev: st.rev + 1 };
    }),
  applyDraw: (m) => {
    const a = get();
    switch (m.t) {
      case 'stroke_start':
        a.strokeStart({ id: m.id, color: m.color, width: m.width, tool: m.tool, pts: [m.p] });
        break;
      case 'stroke_points':
        a.strokePoints(m.id, m.pts);
        break;
      case 'stroke_end':
        a.strokeEnd(m.id);
        break;
      case 'undo':
        a.undo();
        break;
      case 'clear':
        a.clear();
        break;
      default:
        break;
    }
  },

  // —— 游戏切片 ——
  status: 'lobby',
  meId: 'H',
  round: 0,
  totalRounds: 6,
  drawSeconds: 80,
  drawerId: 'H',
  word: null,
  wordChoices: [],
  category: '',
  mask: [],
  remaining: 0,
  scores: {},
  players: {},
  chat: [],
  correctWord: null,
  lastDelta: {},
  winner: null,
  flying: [],

  flyEmoji: (emoji, from) =>
    set((st) => ({ flying: [...st.flying, { key: nanoid(6), emoji, from }].slice(-8) })),
  removeFly: (key) => set((st) => ({ flying: st.flying.filter((f) => f.key !== key) })),

  initGame: ({ meId, players, totalRounds, drawSeconds }) =>
    set({
      meId,
      players,
      totalRounds,
      drawSeconds,
      status: 'lobby',
      round: 0,
      scores: Object.fromEntries(Object.keys(players).map((id) => [id, 0])),
      chat: [],
      winner: null,
      word: null,
      wordChoices: [],
      mask: [],
      correctWord: null,
      ...emptyBoard(),
      rev: 0,
    }),

  setLocalWord: (word, choices) =>
    set((st) => ({ word, wordChoices: choices ?? st.wordChoices })),

  pushChat: (item) =>
    set((st) => ({ chat: [...st.chat, { ...item, id: nanoid(6) }].slice(-60) })),

  applyServerMsg: (m) => {
    const st = get();
    switch (m.t) {
      case 'round_start':
        set({
          status: 'wordpick',
          round: m.round,
          drawerId: m.drawerId,
          wordChoices: m.wordChoices ?? [],
          word: null,
          category: '',
          mask: [],
          correctWord: null,
          lastDelta: {},
          remaining: st.drawSeconds,
          ...emptyBoard(),
          rev: st.rev + 1,
        });
        break;
      case 'word_selected':
        set({
          status: 'drawing',
          category: m.category,
          mask: Array(m.wordLen).fill(null),
          remaining: m.seconds,
          ...emptyBoard(),
          rev: st.rev + 1,
        });
        if (m.word) get().setLocalWord(m.word); // 画手（含自动选词）据此获知词
        break;
      case 'timer':
        set({ remaining: m.remaining });
        if (m.remaining > 0 && m.remaining <= 10) {
          play('tick');
          haptic.tick();
        }
        break;
      case 'hint':
        set((s) => {
          const mask = [...s.mask];
          for (const r of m.revealed) mask[r.index] = r.ch;
          return { mask };
        });
        break;
      case 'guess_result': {
        const name = st.players[m.playerId]?.name ?? '对方';
        st.pushChat({
          from: m.playerId,
          name,
          text: m.text,
          kind: m.correct ? 'correct' : m.close ? 'close' : 'guess',
        });
        if (m.correct) {
          play('correct');
          haptic.correct();
        }
        break;
      }
      case 'round_end':
        set({
          status: 'roundResult',
          correctWord: m.correctWord,
          scores: m.totals,
          lastDelta: m.deltaScores,
        });
        st.pushChat({ from: 'sys', name: '系统', text: `答案是「${m.correctWord}」`, kind: 'system' });
        play('roundEnd');
        haptic.end();
        break;
      case 'game_end':
        set({ status: 'gameOver', scores: m.totals, winner: m.winner });
        play(m.winner === st.meId ? 'win' : 'lose');
        haptic.win();
        break;
      case 'state_full': {
        const s = m.snapshot;
        set({
          status: s.status,
          round: s.round,
          totalRounds: s.totalRounds,
          drawSeconds: s.drawSeconds,
          drawerId: s.drawerId,
          scores: s.scores,
          players: s.players,
          remaining: s.remaining,
          mask: s.mask,
          category: s.category,
          correctWord: s.correctWord,
          winner: s.winner,
          word: s.word ?? null,
          strokes: s.strokes,
          active: {},
          rev: st.rev + 1,
          epoch: st.epoch + 1,
        });
        break;
      }
      default:
        break;
    }
  },

  resetGame: () =>
    set({
      status: 'lobby',
      round: 0,
      word: null,
      wordChoices: [],
      mask: [],
      correctWord: null,
      winner: null,
      chat: [],
      ...emptyBoard(),
    }),
}));
