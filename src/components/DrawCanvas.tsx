import { useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { clsx } from 'clsx';
import type { Pt, Stroke } from '../types';
import { useGameStore } from '../store/gameStore';
import { useConnStore } from '../store/connStore';
import { applyStroke, drawPolyline, repaintAll } from '../lib/canvasDraw';

interface Props {
  editable: boolean;
  className?: string;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * 同步画布：从 gameStore 读取笔画并渲染；editable 时捕获指针输入，
 * 本地落库的同时通过 connStore 发送增量笔画消息（节流批量）。
 * 远端消息由 GamePage 路由到 gameStore，本组件只负责"读状态→画"。
 */
export function DrawCanvas({ editable, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 渲染相关 refs（不触发 React 重渲染）
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<{ strokes: Stroke[]; active: Record<string, Stroke>; epoch: number }>({
    strokes: [],
    active: {},
    epoch: 0,
  });
  const bakedRef = useRef(0);
  const epochRef = useRef(0);
  const dirtyRef = useRef(true);
  const sizeRef = useRef({ w: 0, h: 0 });

  // 本地绘制状态
  const drawingRef = useRef<{ id: string; pending: Pt[] } | null>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    committedRef.current = document.createElement('canvas');
    frameRef.current = document.createElement('canvas');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cv.clientWidth * dpr));
      const h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (w === sizeRef.current.w && h === sizeRef.current.h) return;
      sizeRef.current = { w, h };
      for (const c of [cv, committedRef.current!, frameRef.current!]) {
        c.width = w;
        c.height = h;
      }
      bakedRef.current = 0; // 尺寸变化 → 重建
      dirtyRef.current = true;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // 初始化数据并订阅 store 变更
    const s0 = useGameStore.getState();
    dataRef.current = { strokes: s0.strokes, active: s0.active, epoch: s0.epoch };
    const unsub = useGameStore.subscribe((s) => {
      dataRef.current = { strokes: s.strokes, active: s.active, epoch: s.epoch };
      dirtyRef.current = true;
    });

    let raf = 0;
    const loop = () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        composite();
      }
      raf = requestAnimationFrame(loop);
    };

    const composite = () => {
      const { w, h } = sizeRef.current;
      const octx = committedRef.current!.getContext('2d')!;
      const fctx = frameRef.current!.getContext('2d')!;
      const ctx = cv.getContext('2d')!;
      const { strokes, active, epoch } = dataRef.current;

      // 0) 画布整体被替换（全量恢复）→ 清空 committed 并强制重建
      if (epoch !== epochRef.current) {
        epochRef.current = epoch;
        octx.clearRect(0, 0, w, h);
        bakedRef.current = 0;
      }

      // 1) 把已完成笔画烘焙进 committed（增量；撤销/清空时重建）
      if (strokes.length < bakedRef.current) {
        repaintAll(octx, w, h, strokes);
        bakedRef.current = strokes.length;
      } else if (strokes.length > bakedRef.current) {
        for (let i = bakedRef.current; i < strokes.length; i++) {
          applyStroke(octx, w, h, strokes[i]);
        }
        bakedRef.current = strokes.length;
      }

      // 2) frame = committed + 进行中的笔画（橡皮在副本上 destination-out 才能正确预览）
      fctx.clearRect(0, 0, w, h);
      fctx.drawImage(committedRef.current!, 0, 0);
      for (const id in active) {
        const s = active[id];
        if (s.tool !== 'fill') drawPolyline(fctx, w, h, s);
      }

      // 3) 输出到可见画布（白底 + frame）
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(frameRef.current!, 0, 0);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
    };
  }, []);

  // —— 指针输入 ——
  const getPt = (e: React.PointerEvent): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return [round3(x), round3(y)];
  };

  const flush = () => {
    const d = drawingRef.current;
    if (!d || !d.pending.length) return;
    const pts = d.pending.splice(0);
    useConnStore.getState().send({ t: 'stroke_points', id: d.id, pts });
  };

  const onDown = (e: React.PointerEvent) => {
    if (!editable || e.button > 0) return;
    canvasRef.current!.setPointerCapture(e.pointerId);
    const p = getPt(e);
    const { tool, color, width, strokeStart, strokeEnd } = useGameStore.getState();
    const send = useConnStore.getState().send;
    const id = nanoid(8);

    if (tool === 'fill') {
      const s: Stroke = { id, color, width, tool, pts: [p] };
      strokeStart(s);
      send({ t: 'stroke_start', id, color, width, tool, p });
      strokeEnd(id);
      send({ t: 'stroke_end', id });
      return;
    }

    const s: Stroke = { id, color, width, tool, pts: [p] };
    strokeStart(s);
    send({ t: 'stroke_start', id, color, width, tool, p });
    drawingRef.current = { id, pending: [] };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drawingRef.current;
    if (!editable || !d) return;
    const p = getPt(e);
    useGameStore.getState().strokePoints(d.id, [p]);
    d.pending.push(p);
    if (d.pending.length >= 4) flush();
  };

  const onUp = (e: React.PointerEvent) => {
    const d = drawingRef.current;
    if (!d) return;
    flush();
    useGameStore.getState().strokeEnd(d.id);
    useConnStore.getState().send({ t: 'stroke_end', id: d.id });
    drawingRef.current = null;
    try {
      canvasRef.current!.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={clsx('w-full h-full block rounded-md bg-white', className)}
      style={{ touchAction: 'none', cursor: editable ? 'crosshair' : 'default' }}
    />
  );
}
