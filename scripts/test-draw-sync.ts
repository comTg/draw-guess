// 验证绘画同步数据通路：drawer 本地构建的笔画，receiver 通过线消息 applyDraw 重建后应逐字节一致。
import { useGameStore } from '../src/store/gameStore.ts';
import type { Msg } from '../src/net/protocol.ts';

let failed = false;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('  ✗ FAIL:', msg);
    failed = true;
  } else {
    console.log('  ✓', msg);
  }
}

const reset = () => useGameStore.setState({ strokes: [], active: {}, rev: 0 });
const strokesSnapshot = () => JSON.parse(JSON.stringify(useGameStore.getState().strokes));

console.log('① drawer 本地作画（pen 多点 + fill）');
reset();
const d = useGameStore.getState();
d.strokeStart({ id: 'a', color: '#1F2937', width: 0.013, tool: 'pen', pts: [[0.1, 0.1]] });
d.strokePoints('a', [[0.2, 0.2]]);
d.strokePoints('a', [[0.3, 0.25], [0.4, 0.3]]);
d.strokeEnd('a');
d.strokeStart({ id: 'b', color: '#EF4444', width: 0.013, tool: 'fill', pts: [[0.5, 0.5]] });
d.strokeEnd('b');
const drawer = strokesSnapshot();
assert(drawer.length === 2, 'drawer 完成 2 笔');
assert(drawer[0].pts.length === 4, '第一笔累计 4 个点');
assert(Object.keys(useGameStore.getState().active).length === 0, '无残留进行中笔画');

console.log('② receiver 通过线消息 applyDraw 重建');
reset();
const wire: Msg[] = [
  { t: 'stroke_start', id: 'a', color: '#1F2937', width: 0.013, tool: 'pen', p: [0.1, 0.1] },
  { t: 'stroke_points', id: 'a', pts: [[0.2, 0.2]] },
  { t: 'stroke_points', id: 'a', pts: [[0.3, 0.25], [0.4, 0.3]] },
  { t: 'stroke_end', id: 'a' },
  { t: 'stroke_start', id: 'b', color: '#EF4444', width: 0.013, tool: 'fill', p: [0.5, 0.5] },
  { t: 'stroke_end', id: 'b' },
];
const r = useGameStore.getState();
for (const m of wire) r.applyDraw(m);
const receiver = strokesSnapshot();
assert(JSON.stringify(receiver) === JSON.stringify(drawer), 'receiver 重建与 drawer 完全一致');

console.log('③ undo / clear 同步');
r.applyDraw({ t: 'undo' });
assert(useGameStore.getState().strokes.length === 1, 'undo 后剩 1 笔');
r.applyDraw({ t: 'clear' });
assert(useGameStore.getState().strokes.length === 0, 'clear 后画布为空');

if (failed) {
  console.error('\n结果：存在失败用例');
  process.exit(1);
} else {
  console.log('\n结果：全部通过 ✅');
}
