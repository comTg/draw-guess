import { create } from 'zustand';
import { Peer, type PeerEvents } from '../net/peer';
import { PROTOCOL_VERSION, HOST_ID, GUEST_ID, type Msg } from '../net/protocol';
import { encodeSignal } from '../net/signaling';
import { useUiStore } from './uiStore';
import type { PlayerId, PlayerInfo } from '../types';

export type ConnPhase =
  | 'idle'
  | 'hostCreating' // 房主正在生成邀请码
  | 'hostAwaitAnswer' // 房主展示邀请码 + 扫描应答码
  | 'guestScanOffer' // 访客扫描邀请码
  | 'guestShowAnswer' // 访客展示应答码
  | 'connected'
  | 'closed'
  | 'error';

export type ConnRole = 'host' | 'guest' | null;

interface ConnState {
  role: ConnRole;
  phase: ConnPhase;
  peer: Peer | null;
  meId: PlayerId | null;
  localFrames: string[]; // 待展示的二维码帧
  multi: boolean;
  remote: PlayerInfo | null;
  error: string | null;

  startHost: () => Promise<void>;
  hostReceiveAnswer: (sdp: string) => Promise<void>;
  startJoin: () => void;
  guestReceiveOffer: (sdp: string) => Promise<void>;
  leave: () => void;
  send: (msg: Msg) => void;
}

/** 其他 store（gameStore）注册的消息处理器，用于路由游戏类消息。 */
let gameHandler: ((msg: Msg) => void) | null = null;
export function setMessageHandler(fn: ((msg: Msg) => void) | null) {
  gameHandler = fn;
}

export const useConnStore = create<ConnState>((set, get) => {
  const events: PeerEvents = {
    onOpen: () => {
      const { name, avatar } = useUiStore.getState();
      const meId = get().meId ?? HOST_ID;
      get().peer?.send({ t: 'hello', ver: PROTOCOL_VERSION, id: meId, name, avatar });
      set({ phase: 'connected' });
    },
    onClose: () => {
      if (get().phase === 'connected') set({ phase: 'closed' });
    },
    onMessage: (msg) => {
      if (msg.t === 'hello') {
        set({ remote: { id: msg.id, name: msg.name, avatar: msg.avatar } });
        return;
      }
      if (msg.t === 'ping') {
        get().peer?.send({ t: 'pong', ts: msg.ts });
        return;
      }
      gameHandler?.(msg);
    },
    onState: (s) => {
      if (s === 'failed') set({ phase: 'error', error: '连接失败：网络打洞未成功，建议同一 WiFi 重试。' });
    },
  };

  return {
    role: null,
    phase: 'idle',
    peer: null,
    meId: null,
    localFrames: [],
    multi: false,
    remote: null,
    error: null,

    startHost: async () => {
      if (get().peer) return; // 幂等，规避 StrictMode 双调用
      const lanOnly = useUiStore.getState().config.lanOnly;
      const peer = new Peer({ lanOnly }, events);
      set({
        role: 'host',
        meId: HOST_ID,
        phase: 'hostCreating',
        peer,
        error: null,
        localFrames: [],
        remote: null,
      });
      try {
        const offerSdp = await peer.createOffer();
        const enc = encodeSignal('offer', offerSdp);
        set({ localFrames: enc.frames, multi: enc.multi, phase: 'hostAwaitAnswer' });
      } catch (e) {
        set({ phase: 'error', error: '创建房间失败：' + String(e) });
      }
    },

    hostReceiveAnswer: async (sdp) => {
      const peer = get().peer;
      if (!peer) return;
      try {
        await peer.acceptAnswer(sdp); // 通道随后自动 open → onOpen
      } catch (e) {
        set({ error: '应答码无效：' + String(e) });
      }
    },

    startJoin: () => {
      if (get().peer) return;
      const lanOnly = useUiStore.getState().config.lanOnly;
      const peer = new Peer({ lanOnly }, events);
      set({
        role: 'guest',
        meId: GUEST_ID,
        phase: 'guestScanOffer',
        peer,
        error: null,
        localFrames: [],
        remote: null,
      });
    },

    guestReceiveOffer: async (sdp) => {
      const peer = get().peer;
      if (!peer) return;
      try {
        const answerSdp = await peer.acceptOfferCreateAnswer(sdp);
        const enc = encodeSignal('answer', answerSdp);
        set({ localFrames: enc.frames, multi: enc.multi, phase: 'guestShowAnswer' });
      } catch (e) {
        set({ phase: 'error', error: '连接失败：' + String(e) });
      }
    },

    leave: () => {
      get().peer?.close();
      set({
        role: null,
        phase: 'idle',
        peer: null,
        meId: null,
        localFrames: [],
        multi: false,
        remote: null,
        error: null,
      });
    },

    send: (msg) => get().peer?.send(msg),
  };
});
