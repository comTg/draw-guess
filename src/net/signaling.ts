import pako from 'pako';
import { nanoid } from 'nanoid';

// ============================================================
// SDP ↔ 二维码载荷 编解码
// 单帧:  dg1:<O|A>:<base64url(deflateRaw(sdp))>
// 多帧:  dg1m:<O|A>:<id>:<i>/<n>:<chunk>
// base64url 字母表(A-Za-z0-9-_)不含冒号，可安全按 ':' 切分。
// ============================================================

const PREFIX = 'dg1';
const PREFIX_MULTI = 'dg1m';
/** 单帧 base64 字符上限；超过则分帧轮播。手机相机对 ~800 字符的 QR 识别稳定。 */
const CHUNK_LIMIT = 800;

export type SdpType = 'offer' | 'answer';

export interface EncodedSignal {
  frames: string[];
  multi: boolean;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const typeChar = (t: SdpType) => (t === 'offer' ? 'O' : 'A');
const charType = (c: string): SdpType => (c === 'O' ? 'offer' : 'answer');

/** 把 SDP 压缩编码成 1 或多帧二维码载荷。 */
export function encodeSignal(type: SdpType, sdp: string): EncodedSignal {
  const deflated = pako.deflateRaw(sdp);
  const b64 = b64urlEncode(deflated);
  const tc = typeChar(type);

  if (b64.length <= CHUNK_LIMIT) {
    return { frames: [`${PREFIX}:${tc}:${b64}`], multi: false };
  }

  const id = nanoid(4);
  const total = Math.ceil(b64.length / CHUNK_LIMIT);
  const frames: string[] = [];
  for (let i = 0; i < total; i++) {
    const part = b64.slice(i * CHUNK_LIMIT, (i + 1) * CHUNK_LIMIT);
    frames.push(`${PREFIX_MULTI}:${tc}:${id}:${i}/${total}:${part}`);
  }
  return { frames, multi: true };
}

export interface DecodedSignal {
  type: SdpType;
  sdp: string;
}

/**
 * 扫码组装器：持续 push 收到的二维码文本，单帧立即返回结果，
 * 多帧收齐后返回；尚未收齐返回 null；非法载荷抛错。
 */
export class SignalAssembler {
  private id: string | null = null;
  private parts = new Map<number, string>();
  private total = 0;
  private type: SdpType | null = null;

  /** 当前多帧进度（用于 UI 展示），单帧时为 null。 */
  get progress(): { have: number; total: number } | null {
    if (!this.id || this.total <= 1) return null;
    return { have: this.parts.size, total: this.total };
  }

  reset() {
    this.id = null;
    this.parts.clear();
    this.total = 0;
    this.type = null;
  }

  push(raw: string): DecodedSignal | null {
    const text = raw.trim();
    const seg = text.split(':');

    // 单帧
    if (seg[0] === PREFIX && seg.length === 3) {
      return { type: charType(seg[1]), sdp: inflate(seg[2]) };
    }

    // 多帧
    if (seg[0] === PREFIX_MULTI && seg.length === 5) {
      const type = charType(seg[1]);
      const id = seg[2];
      const [iStr, nStr] = seg[3].split('/');
      const i = Number(iStr);
      const n = Number(nStr);
      const chunk = seg[4];
      if (!Number.isFinite(i) || !Number.isFinite(n) || n < 1) {
        throw new Error('二维码格式错误');
      }
      if (this.id !== id) {
        this.reset();
        this.id = id;
        this.total = n;
        this.type = type;
      }
      this.parts.set(i, chunk);
      if (this.parts.size === this.total) {
        let b64 = '';
        for (let k = 0; k < this.total; k++) {
          const p = this.parts.get(k);
          if (p === undefined) return null; // 理论不达；防御
          b64 += p;
        }
        const result = { type: this.type!, sdp: inflate(b64) };
        this.reset();
        return result;
      }
      return null;
    }

    throw new Error('不是有效的连接二维码');
  }
}

function inflate(b64: string): string {
  const bytes = b64urlDecode(b64);
  return pako.inflateRaw(bytes, { to: 'string' });
}
