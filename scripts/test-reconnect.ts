// 验证断线重连的全量状态恢复：房主 hostResync 生成 state_full，访客 applyServerMsg 还原。
import { useGameStore } from '../src/store/gameStore.ts';
import { useConnStore } from '../src/store/connStore.ts';
import { hostResync } from '../src/game/engine.ts';
import { HOST_ID, GUEST_ID, type Msg } from '../src/net/protocol.ts';

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
useConnStore.setState({ role: 'host', meId: HOST_ID, peer: { send: (m: Msg) => sent.push(m) } as never });

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

console.log('① 构造一个对局中状态并 hostResync');
useGameStore.setState({
  status: 'drawing',
  round: 1,
  drawerId: HOST_ID,
  remaining: 55,
  scores: { [HOST_ID]: 60, [GUEST_ID]: 100 },
  mask: [null, '风', null],
  category: '动作',
  strokes: [{ id: 'x', color: '#1F2937', width: 0.013, tool: 'pen', pts: [[0, 0], [0.5, 0.5]] }],
});
hostResync();
const sf = sent.find((m) => m.t === 'state_full') as Extract<Msg, { t: 'state_full' }> | undefined;
assert(!!sf, '已发送 state_full');

console.log('② 访客在“空白”状态下还原');
useGameStore.setState({
  status: 'lobby',
  round: 0,
  drawerId: HOST_ID,
  remaining: 0,
  scores: {},
  mask: [],
  category: '',
  strokes: [],
  epoch: 0,
});
if (sf) gs().applyServerMsg(sf);

const r = gs();
assert(r.status === 'drawing', '状态恢复为 drawing');
assert(r.round === 1, '回合恢复为 1');
assert(r.remaining === 55, '剩余时间恢复为 55');
assert(r.scores[GUEST_ID] === 100 && r.scores[HOST_ID] === 60, '比分恢复 (60/100)');
assert(r.mask.length === 3 && r.mask[1] === '风', '词格与已揭示恢复');
assert(r.category === '动作', '分类恢复');
assert(r.strokes.length === 1 && r.strokes[0].pts.length === 2, '画布笔画恢复');
assert(r.epoch === 1, 'epoch 自增（触发画布重建）');

if (failed) {
  console.error('\n结果：存在失败用例');
  process.exit(1);
} else {
  console.log('\n结果：全部通过 ✅');
}
