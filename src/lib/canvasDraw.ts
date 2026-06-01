import type { Stroke, Pt } from '../types';

/** 12 色调色盘（§6.2） */
export const PALETTE = [
  '#1F2937', '#FFFFFF', '#EF4444', '#F97316',
  '#FACC15', '#22C55E', '#06B6D4', '#3B82F6',
  '#6366F1', '#A855F7', '#EC4899', '#92400E',
];

/** 笔宽（归一化为 min(画布宽高) 的比例，跨分辨率一致） */
export const WIDTHS = [0.006, 0.013, 0.025, 0.045];

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const denorm = (p: Pt, w: number, h: number): [number, number] => [p[0] * w, p[1] * h];

/** 在 ctx 上绘制一笔（pen/eraser 折线，fill 洪水填充）。 */
export function applyStroke(ctx: CanvasRenderingContext2D, w: number, h: number, s: Stroke) {
  if (s.tool === 'fill') {
    const p = s.pts[0];
    if (p) floodFill(ctx, w, h, Math.round(p[0] * w), Math.round(p[1] * h), s.color);
    return;
  }
  drawPolyline(ctx, w, h, s);
}

export function drawPolyline(ctx: CanvasRenderingContext2D, w: number, h: number, s: Stroke) {
  if (s.pts.length === 0) return;
  const pxw = Math.max(1, s.width * Math.min(w, h));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = pxw;
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';

  if (s.pts.length === 1) {
    const [x, y] = denorm(s.pts[0], w, h);
    ctx.beginPath();
    ctx.arc(x, y, pxw / 2, 0, Math.PI * 2);
    ctx.fillStyle = s.tool === 'eraser' ? 'rgba(0,0,0,1)' : s.color;
    ctx.fill();
  } else {
    ctx.strokeStyle = s.tool === 'eraser' ? 'rgba(0,0,0,1)' : s.color;
    ctx.beginPath();
    const [x0, y0] = denorm(s.pts[0], w, h);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < s.pts.length; i++) {
      const [x, y] = denorm(s.pts[i], w, h);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** 洪水填充：从 (sx,sy) 起把连通的相近像素填成 hex 色（用于油漆桶）。 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sx: number,
  sy: number,
  hex: string
) {
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const seed = (sy * w + sx) * 4;
  const sr = data[seed], sg = data[seed + 1], sb = data[seed + 2], sa = data[seed + 3];
  const [fr, fg, fb] = hexToRgb(hex);
  const fa = 255;
  if (sr === fr && sg === fg && sb === fb && sa === fa) return;

  const tol = 40;
  const match = (i: number) =>
    Math.abs(data[i] - sr) <= tol &&
    Math.abs(data[i + 1] - sg) <= tol &&
    Math.abs(data[i + 2] - sb) <= tol &&
    Math.abs(data[i + 3] - sa) <= tol;

  const stack: number[] = [sy * w + sx];
  while (stack.length) {
    const p = stack.pop()!;
    const i = p * 4;
    if (!match(i)) continue;
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  ctx.putImageData(img, 0, 0);
}

/** 全量重绘：清空并按顺序回放所有笔画（用于撤销/清空/尺寸变化后的重建）。 */
export function repaintAll(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokes: Stroke[]
) {
  ctx.clearRect(0, 0, w, h);
  for (const s of strokes) applyStroke(ctx, w, h, s);
}
