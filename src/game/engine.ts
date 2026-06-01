import { useGameStore } from '../store/gameStore';
import { useConnStore } from '../store/connStore';
import { useUiStore } from '../store/uiStore';
import { HOST_ID, GUEST_ID, otherId, type Msg } from '../net/protocol';
import { pickWords, categoryOf } from './words';
import { isCorrect, isClose, scoreForGuess, DRAWER_BONUS } from './scoring';
import type { PlayerId } from '../types';

// 主机权威引擎：计时、计分、回合切换只在房主侧运算，结果广播给访客。
// 访客只发送输入（choose_word / guess / ready），由房主裁决。

interface EngineState {
  candidates: string[];
  currentWord: string | null;
  used: Set<string>;
  ready: Record<PlayerId, boolean>;
  timer: ReturnType<typeof setInterval> | null;
}

const eng: EngineState = {
  candidates: [],
  currentWord: null,
  used: new Set(),
  ready: {},
  timer: null,
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
}

function hostBeginDrawing(index: number) {
  const word = eng.candidates[index];
  if (!word) return;
  eng.currentWord = word;
  eng.used.add(word);

  if (gs().drawerId === HOST_ID) gs().setLocalWord(word); // 房主作画则本地持有词
  const seconds = gs().drawSeconds;
  broadcast({ t: 'word_selected', wordLen: [...word].length, category: categoryOf(word), seconds });
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
    } else {
      broadcast({ t: 'timer', remaining: rem });
    }
  }, 1000);
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

/** 统一入站消息处理：绘画→画布；其余按角色分流。 */
export function handleMessage(m: Msg) {
  if (DRAW_TYPES.has(m.t)) {
    gs().applyDraw(m);
    return;
  }
  if (role() === 'host') handleClientMsg(m);
  else gs().applyServerMsg(m);
}

export function resetEngine() {
  clearTimer();
  eng.candidates = [];
  eng.currentWord = null;
  eng.used.clear();
  eng.ready = {};
}
