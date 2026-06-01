// 验证房主权威引擎：状态机推进、选词、计分、回合切换与角色交换。
// 用假 peer 捕获发往访客的消息，并用 handleMessage 模拟访客输入。
import { useGameStore } from '../src/store/gameStore.ts';
import { useConnStore } from '../src/store/connStore.ts';
import type { Msg } from '../src/net/protocol.ts';
import { HOST_ID, GUEST_ID } from '../src/net/protocol.ts';
import {
  chooseWord,
  submitGuess,
  pressReady,
  handleMessage,
  resetEngine,
} from '../src/game/engine.ts';

let failed = false;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('  ✗ FAIL:', msg);
    failed = true;
  } else {
    console.log('  ✓', msg);
  }
}

const sent: Msg[] = [];
useConnStore.setState({
  role: 'host',
  meId: HOST_ID,
  peer: { send: (m: Msg) => sent.push(m) } as never,
});

const gs = () => useGameStore.getState();
gs().initGame({
  meId: HOST_ID,
  players: {
    [HOST_ID]: { id: HOST_ID, name: '房主', avatar: 0 },
    [GUEST_ID]: { id: GUEST_ID, name: '访客', avatar: 1 },
  },
  totalRounds: 2,
  drawSeconds: 80,
});

console.log('① 大厅：双方就绪 → 开始第 1 回合');
pressReady(); // host
handleMessage({ t: 'ready' }); // guest
assert(gs().status === 'wordpick', '进入 wordpick');
assert(gs().round === 1, '回合 = 1');
assert(gs().drawerId === HOST_ID, '第 1 回合房主作画');
assert(gs().wordChoices.length === 3, '画手收到 3 个候选词');

console.log('② 房主选词 → 进入作画');
const word = gs().wordChoices[0];
chooseWord(0);
assert(gs().status === 'drawing', '进入 drawing');
assert(gs().word === word, '画手本地持有所选词');
assert(gs().remaining === 80, '倒计时初始化为 80');
assert(sent.some((m) => m.t === 'word_selected'), '已广播 word_selected');

console.log('③ 访客猜错 → 不结算');
handleMessage({ t: 'guess', text: '一定不是这个词' });
assert(gs().status === 'drawing', '猜错后仍在 drawing');
assert(gs().scores[GUEST_ID] === 0, '猜错不得分');

console.log('④ 访客猜对 → 结算');
handleMessage({ t: 'guess', text: word });
assert(gs().status === 'roundResult', '进入 roundResult');
assert(gs().correctWord === word, '展示正确答案');
assert(gs().scores[GUEST_ID] === 100, `猜手满时间猜对得 100（实得 ${gs().scores[GUEST_ID]}）`);
assert(gs().scores[HOST_ID] === 60, `画手引导得 60（实得 ${gs().scores[HOST_ID]}）`);

console.log('⑤ 双方继续 → 第 2 回合角色交换');
pressReady();
handleMessage({ t: 'ready' });
assert(gs().status === 'wordpick', '进入第 2 回合 wordpick');
assert(gs().round === 2, '回合 = 2');
assert(gs().drawerId === GUEST_ID, '第 2 回合访客作画（角色交换）');
assert(gs().wordChoices.length === 0, '房主作为猜手不持有候选词');

console.log('⑥ 末回合：访客作画、房主猜对 → 结束游戏');
// 访客作画：访客发来 choose_word（房主据自己持有的候选定词）
handleMessage({ t: 'choose_word', index: 1 });
assert(gs().status === 'drawing', '第 2 回合进入 drawing');
// 房主此时是猜手；从发往访客的 round_start 候选里取该词来模拟猜对
const lastRoundStart = [...sent].reverse().find((m) => m.t === 'round_start') as
  | Extract<Msg, { t: 'round_start' }>
  | undefined;
const word2 = lastRoundStart?.wordChoices?.[1] ?? '';
assert(!!word2, '能取到第 2 回合候选词');
const before = gs().scores[HOST_ID];
submitGuess(word2); // 房主作为猜手猜对
assert(gs().status === 'roundResult', '末回合猜对后先进入 roundResult');
assert(gs().scores[HOST_ID] === before + 100, '房主作为猜手再得 100（累计 160）');
assert(gs().scores[GUEST_ID] === 100 + 60, '访客作为画手再得 60（累计 160）');

console.log('⑦ 末回合双方继续 → 游戏结束');
pressReady();
handleMessage({ t: 'ready' });
assert(gs().status === 'gameOver', '进入 gameOver');
assert(gs().winner === 'tie', `双方均 160 → 平局（winner=${gs().winner}）`);

resetEngine();
if (failed) {
  console.error('\n结果：存在失败用例');
  process.exit(1);
} else {
  console.log('\n结果：全部通过 ✅');
}
