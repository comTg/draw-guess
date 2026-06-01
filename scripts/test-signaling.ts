import { encodeSignal, SignalAssembler } from '../src/net/signaling.ts';

let failed = false;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('  ✗ FAIL:', msg);
    failed = true;
  } else {
    console.log('  ✓', msg);
  }
}

// 构造一个像样的 SDP（含多个候选，便于压缩测试）
const baseSdp =
  'v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' +
  'a=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' +
  'a=candidate:1 1 udp 2122260223 192.168.1.5 53111 typ host generation 0\r\n'.repeat(4);

console.log('① 单帧往返');
const enc1 = encodeSignal('offer', baseSdp);
assert(!enc1.multi, '小 SDP 应为单帧');
const asm1 = new SignalAssembler();
const r1 = asm1.push(enc1.frames[0]);
assert(!!r1 && r1.type === 'offer' && r1.sdp === baseSdp, '单帧解码与原文一致');

console.log('② 多帧往返（乱序）');
// 用确定性 LCG 生成高熵数据，确保压缩后仍超过单帧上限 → 触发分帧
let seed = 1234567;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let entropy = '';
for (let i = 0; i < 1600; i++) entropy += String.fromCharCode(33 + Math.floor(rand() * 90));
const bigSdp = baseSdp + entropy;
const enc2 = encodeSignal('answer', bigSdp);
assert(enc2.multi && enc2.frames.length > 1, `大 SDP 应分帧 (实得 ${enc2.frames.length} 帧)`);
const asm2 = new SignalAssembler();
let r2: ReturnType<SignalAssembler['push']> = null;
for (let i = enc2.frames.length - 1; i >= 0; i--) {
  r2 = asm2.push(enc2.frames[i]); // 逆序投喂
}
assert(!!r2 && r2.type === 'answer' && r2.sdp === bigSdp, '多帧乱序拼接后与原文一致');

console.log('③ 重复帧无害 + 进度');
const asm3 = new SignalAssembler();
asm3.push(enc2.frames[0]);
asm3.push(enc2.frames[0]); // 重复
const prog = asm3.progress;
assert(!!prog && prog.have === 1 && prog.total === enc2.frames.length, '重复帧只计一次，进度正确');

console.log('④ 非法载荷抛错');
let threw = false;
try {
  new SignalAssembler().push('hello world');
} catch {
  threw = true;
}
assert(threw, '非二维码文本应抛错');

if (failed) {
  console.error('\n结果：存在失败用例');
  process.exit(1);
} else {
  console.log('\n结果：全部通过 ✅');
}
