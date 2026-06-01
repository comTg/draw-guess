import { useGameStore } from '../store/gameStore';
import { useConnStore } from '../store/connStore';
import { useUiStore } from '../store/uiStore';
import { HOST_ID, GUEST_ID, otherId, type Msg, type GameSnapshot } from '../net/protocol';
import { pickWords, categoryOf } from './words';
import { isCorrect, isClose, scoreForGuess, DRAWER_BONUS } from './scoring';
import type { PlayerId } from '../types';

// 主机权威引擎：计时、计分、回合切换只在房主侧运算，结果广播给访客。
// 访客只发送输入（choose_word / guess / ready），由房主裁决。

const PICK_SECONDS = 15;

interface EngineState {
  candidates: string[];
  currentWord: string | null;
  used: Set<string>;
  ready: Record<PlayerId, boolean>;
  timer: ReturnType<typeof setInterval> | null;
  pickTimer: ReturnType<typeof setTimeout> | null;
  revealed: Set<number>;
  maxHints: number;
}

const eng: EngineState = {
  candidates: [],
  currentWord: null,
  used: new Set(),
  ready: {},
  timer: null,
  pickTimer: null,
  revealed: new Set(),
  maxHints: 0,
};

const gs = () => useGameStore.getState();
const send = (m: Msg) => useConnStore.getState().send(m);
const role = () => useConnStore.getState().role;

const DRAW_TYPES = new Set<Msg['t']>([
  'stroke_start',
  'stroke_points',
  'stroke_end',
  'undo',
  'clear',
]);

function clearTimer() {
  if (eng.timer !== null) {
    clearInterval(eng.timer);
    eng.timer = null;
  }
}

function clearPickTimer() {
  if (eng.pickTimer !== null) {
    clearTimeout(eng.pickTimer);
    eng.pickTimer = null;
  }
}

/** 房主：本地应用 + 发送（部分消息本地与发送版本不同，如 round_start 的候选词）。 */
function broadcast(local: Msg, sent: Msg = local) {
  gs().applyServerMsg(local);
  send(sent);
}

// ===================== 房主流程 =====================

function hostStartRound(n: number) {
  const drawerId: PlayerId = n % 2 === 1 ? HOST_ID : GUEST_ID; // 第1回合房主先画
  const difficulty = useUiStore.getState().config.difficulty;
  eng.candidates = pickWords(3, difficulty, eng.used).map((w) => w.word);
  eng.currentWord = null;
  eng.ready = {};

  broadcast(
    { t: 'round_start', round: n, drawerId, wordChoices: drawerId === HOST_ID ? eng.candidates : undefined },
    { t: 'round_start', round: n, drawerId, wordChoices: drawerId === GUEST_ID ? eng.candidates : undefined }
  );

  // 选词限时：超时自动选第一个
  clearPickTimer();
  eng.pickTimer = setTimeout(() => {
    if (!eng.currentWord) hostBeginDrawing(0);
  }, PICK_SECONDS * 1000);
}

function hostBeginDrawing(index: number) {
  if (eng.currentWord) return; // 幂等：防止手动选词与超时自动选词重复触发
  const word = eng.candidates[index] ?? eng.candidates[0];
  if (!word) return;
  clearPickTimer();
  eng.currentWord = word;
  eng.used.add(word);
  eng.revealed = new Set();
  eng.maxHints = Math.floor([...word].length / 2);

  const drawerIsGuest = gs().drawerId === GUEST_ID;
  if (!drawerIsGuest) gs().setLocalWord(word); // 房主作画则本地持有词
  const seconds = gs().drawSeconds;
  const base = { t: 'word_selected' as const, wordLen: [...word].length, category: categoryOf(word), seconds };
  // 仅在访客是画手时把词随 word_selected 发给访客（含自动选词场景）
  broadcast(base, drawerIsGuest ? { ...base, word } : base);
  startTimer(seconds);
}

function startTimer(seconds: number) {
  clearTimer();
  let rem = seconds;
  eng.timer = setInterval(() => {
    rem -= 1;
    if (rem <= 0) {
      broadcast({ t: 'timer', remaining: 0 });
      hostEndRound(false);
      return;
    }
    broadcast({ t: 'timer', remaining: rem });
    maybeHint(seconds, rem);
  }, 1000);
}

/** 后半程逐步揭示字符（最多 floor(词长/2) 个）。 */
function maybeHint(total: number, rem: number) {
  if (eng.maxHints <= 0 || eng.revealed.size >= eng.maxHints) return;
  const half = total / 2;
  if (rem > half) return;
  const step = half / (eng.maxHints + 1);
  const due = Math.min(eng.maxHints, Math.floor((half - rem) / step));
  while (eng.revealed.size < due) revealOneHint();
}

function revealOneHint() {
  const word = eng.currentWord;
  if (!word) return;
  const chars = [...word];
  if (eng.revealed.size >= Math.min(eng.maxHints || chars.length, chars.length)) return;
  const candidates = chars.map((_, i) => i).filter((i) => !eng.revealed.has(i));
  if (!candidates.length) return;
  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  eng.revealed.add(idx);
  broadcast({ t: 'hint', revealed: [{ index: idx, ch: chars[idx] }] });
}

function hostGuess(text: string, fromId: PlayerId) {
  if (!eng.currentWord) return;
  if (isCorrect(text, eng.currentWord)) {
    broadcast({ t: 'guess_result', playerId: fromId, correct: true, text });
    hostEndRound(true);
  } else {
    broadcast({
      t: 'guess_result',
      playerId: fromId,
      correct: false,
      close: isClose(text, eng.currentWord),
      text,
    });
  }
}

function hostEndRound(correct: boolean) {
  clearTimer();
  clearPickTimer();
  const drawerId = gs().drawerId;
  const guesserId = otherId(drawerId);
  const scores = { ...gs().scores };
  const delta: Record<PlayerId, number> = { [drawerId]: 0, [guesserId]: 0 };
  if (correct) {
    delta[guesserId] = scoreForGuess(gs().remaining, gs().drawSeconds);
    delta[drawerId] = DRAWER_BONUS;
  }
  scores[guesserId] = (scores[guesserId] ?? 0) + delta[guesserId];
  scores[drawerId] = (scores[drawerId] ?? 0) + delta[drawerId];
  eng.ready = {};
  broadcast({
    t: 'round_end',
    correctWord: eng.currentWord ?? '',
    deltaScores: delta,
    totals: scores,
  });
}

function hostEndGame() {
  const scores = gs().scores;
  const h = scores[HOST_ID] ?? 0;
  const g = scores[GUEST_ID] ?? 0;
  const winner: PlayerId | 'tie' = h === g ? 'tie' : h > g ? HOST_ID : GUEST_ID;
  eng.ready = {};
  broadcast({ t: 'game_end', winner, totals: scores });
}

function hostMarkReady(id: PlayerId) {
  eng.ready[id] = true;
  const ids = Object.keys(gs().players);
  if (!ids.every((pid) => eng.ready[pid])) return;

  const { status, round, totalRounds } = gs();
  if (status === 'lobby') {
    eng.used.clear();
    hostStartRound(1);
  } else if (status === 'roundResult') {
    if (round >= totalRounds) hostEndGame();
    else hostStartRound(round + 1);
  } else if (status === 'gameOver') {
    eng.used.clear();
    useGameStore.setState({
      scores: Object.fromEntries(Object.keys(gs().players).map((id2) => [id2, 0])),
    });
    hostStartRound(1);
  }
}

function handleClientMsg(m: Msg) {
  switch (m.t) {
    case 'choose_word':
      hostBeginDrawing(m.index);
      break;
    case 'guess':
      hostGuess(m.text, GUEST_ID);
      break;
    case 'ready':
      hostMarkReady(GUEST_ID);
      break;
    case 'giveup':
      hostEndRound(false);
      break;
    case 'hint_req':
      revealOneHint();
      break;
    default:
      break;
  }
}

// ===================== UI 调用的统一 API（按角色路由） =====================

/** 画手选词（index 指向候选词）。 */
export function chooseWord(index: number) {
  if (role() === 'host') {
    hostBeginDrawing(index);
  } else {
    const word = gs().wordChoices[index];
    if (word) gs().setLocalWord(word);
    send({ t: 'choose_word', index });
  }
}

/** 猜手提交猜测。 */
export function submitGuess(text: string) {
  const t = text.trim();
  if (!t) return;
  if (role() === 'host') hostGuess(t, HOST_ID);
  else send({ t: 'guess', text: t });
}

/** 准备/继续/再来一局（同一就绪手势）。 */
export function pressReady() {
  if (role() === 'host') hostMarkReady(HOST_ID);
  else send({ t: 'ready' });
}

/** 画手放弃本回合。 */
export function giveUp() {
  if (role() === 'host') hostEndRound(false);
  else send({ t: 'giveup' });
}

/** 画手主动给一个提示（揭示一个字）。 */
export function giveHint() {
  if (role() === 'host') revealOneHint();
  else send({ t: 'hint_req' });
}

/** 发送快捷表情（直连 P2P，不经裁判）。 */
export function sendEmoji(emoji: number) {
  const meId = gs().meId;
  gs().flyEmoji(emoji, meId);
  send({ t: 'emoji', id: emoji });
}

/** 画手发送文字聊天（直连 P2P）。 */
export function sendChat(text: string) {
  const t = text.trim();
  if (!t) return;
  const me = gs();
  me.pushChat({ from: me.meId, name: me.players[me.meId]?.name ?? '我', text: t, kind: 'chat' });
  send({ t: 'chat', text: t });
}

/** 统一入站消息处理：绘画→画布；社交(聊天/表情)直连双向；其余按角色分流。 */
export function handleMessage(m: Msg) {
  if (DRAW_TYPES.has(m.t)) {
    gs().applyDraw(m);
    return;
  }
  if (m.t === 'chat') {
    const me = gs();
    const fromId = otherId(me.meId);
    me.pushChat({ from: fromId, name: me.players[fromId]?.name ?? '对方', text: m.text, kind: 'chat' });
    return;
  }
  if (m.t === 'emoji') {
    gs().flyEmoji(m.id, otherId(gs().meId));
    return;
  }
  if (role() === 'host') handleClientMsg(m);
  else gs().applyServerMsg(m);
}

/** 重连后房主把全量状态同步给访客。 */
export function hostResync() {
  if (role() !== 'host') return;
  const g = gs();
  const drawerIsGuest = g.drawerId === GUEST_ID;
  const snapshot: GameSnapshot = {
    status: g.status,
    round: g.round,
    totalRounds: g.totalRounds,
    drawSeconds: g.drawSeconds,
    drawerId: g.drawerId,
    scores: g.scores,
    players: g.players,
    remaining: g.remaining,
    mask: g.mask,
    category: g.category,
    strokes: g.strokes,
    correctWord: g.correctWord,
    winner: g.winner,
    word: drawerIsGuest ? eng.currentWord ?? undefined : undefined,
  };
  send({ t: 'state_full', snapshot });
}

export function resetEngine() {
  clearTimer();
  clearPickTimer();
  eng.candidates = [];
  eng.currentWord = null;
  eng.used.clear();
  eng.ready = {};
  eng.revealed = new Set();
  eng.maxHints = 0;
}
