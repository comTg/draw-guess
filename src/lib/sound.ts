import { useUiStore } from '../store/uiStore';

// 用 Web Audio 合成短音效，无需打包音频文件，离线可用。
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(
  a: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number
) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

export type Sfx = 'click' | 'pick' | 'correct' | 'tick' | 'roundEnd' | 'win' | 'lose';

export function play(name: Sfx) {
  const ui = useUiStore.getState();
  if (ui.muted) return;
  const a = ac();
  if (!a) return;
  if (a.state === 'suspended') void a.resume();
  const v = ui.volume;
  switch (name) {
    case 'click':
      tone(a, 440, 0, 0.06, 'triangle', 0.12 * v);
      break;
    case 'pick':
      tone(a, 660, 0, 0.09, 'triangle', 0.16 * v);
      break;
    case 'tick':
      tone(a, 880, 0, 0.05, 'square', 0.08 * v);
      break;
    case 'correct':
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, i * 0.08, 0.18, 'sine', 0.2 * v));
      break;
    case 'roundEnd':
      [392, 330].forEach((f, i) => tone(a, f, i * 0.12, 0.25, 'sine', 0.18 * v));
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, i * 0.1, 0.3, 'sine', 0.22 * v));
      break;
    case 'lose':
      [392, 311, 262].forEach((f, i) => tone(a, f, i * 0.12, 0.28, 'sine', 0.18 * v));
      break;
  }
}
