import { create } from 'zustand';
import { Peer, type PeerEvents } from '../net/peer';
import { PROTOCOL_VERSION, HOST_ID, GUEST_ID, type Msg } from '../net/protocol';
import { encodeSignal } from '../net/signaling';
import { useUiStore } from './uiStore';
import type { PlayerId, PlayerInfo } from '../types';

export type ConnPhase =
  | 'idle'
  | 'hostCreating'
  | 'hostAwaitAnswer'
  | 'guestScanOffer'
  | 'guestShowAnswer'
  | 'connected'
  | 'closed'
  | 'error';

export type ConnRole = 'host' | 'guest' | null;
export type Link = 'online' | 'reconnecting';

interface ConnState {
  role: ConnRole;
  phase: ConnPhase;
  link: Link;
  rtt: number;
  peer: Peer | null;
  meId: PlayerId | null;
  localFrames: string[];
  multi: boolean;
  remote: PlayerInfo | null;
  error: string | null;

  startHost: () => Promise<void>;
  startJoin: () => void;
  hostReceiveAnswer: (sdp: string) => Promise<void>;
  guestReceiveOffer: (sdp: string) => Promise<void>;
  repair: () => Promise<void>; // 断线后原地重新配对（保留角色）
  leave: () => void;
  send: (msg: Msg) => void;
}

let gameHandler: ((msg: Msg) => void) | null = null;
export function setMessageHandler(fn: ((msg: Msg) => void) | null) {
  gameHandler = fn;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
let hbInterval: ReturnType<typeof setInterval> | null = null;
let lastPong = 0;

export const useConnStore = create<ConnState>((set, get) => {
  const stopHeartbeat = () => {
    if (hbInterval !== null) {
      clearInterval(hbInterval);
      hbInterval = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    lastPong = now();
    hbInterval = setInterval(() => {
      const peer = get().peer;
      if (!peer?.channelOpen) return;
      peer.send({ t: 'ping', ts: now() });
      if (now() - lastPong > 9000 && get().link === 'online') {
        set({ link: 'reconnecting' });
      }
    }, 3000);
  };

  const events: PeerEvents = {
    onOpen: () => {
      const { name, avatar } = useUiStore.getState();
      const meId = get().meId ?? HOST_ID;
      get().peer?.send({ t: 'hello', ver: PROTOCOL_VERSION, id: meId, name, avatar });
      set({ phase: 'connected', link: 'online' });
      startHeartbeat();
    },
    onClose: () => {
      if (get().phase === 'connected') set({ link: 'reconnecting' });
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
      if (msg.t === 'pong') {
        lastPong = now();
        set({ rtt: Math.round(now() - msg.ts), link: 'online' });
        return;
      }
      gameHandler?.(msg);
    },
    onState: (s) => {
      if (s === 'failed' || s === 'disconnected') {
        if (get().phase === 'connected') set({ link: 'reconnecting' });
      } else if (s === 'connected') {
        set({ link: 'online' });
      }
    },
  };

  const makeHostOffer = async () => {
    const lanOnly = useUiStore.getState().config.lanOnly;
    const peer = new Peer({ lanOnly }, events);
    set({ peer, phase: 'hostCreating', localFrames: [], error: null });
    try {
      const sdp = await peer.createOffer();
      const enc = encodeSignal('offer', sdp);
      set({ localFrames: enc.frames, multi: enc.multi, phase: 'hostAwaitAnswer' });
    } catch (e) {
      set({ phase: 'error', error: '创建房间失败：' + String(e) });
    }
  };

  const makeGuest = () => {
    const lanOnly = useUiStore.getState().config.lanOnly;
    const peer = new Peer({ lanOnly }, events);
    set({ peer, phase: 'guestScanOffer', localFrames: [], error: null });
  };

  return {
    role: null,
    phase: 'idle',
    link: 'online',
    rtt: 0,
    peer: null,
    meId: null,
    localFrames: [],
    multi: false,
    remote: null,
    error: null,

    startHost: async () => {
      if (get().peer) return;
      set({ role: 'host', meId: HOST_ID, remote: null });
      await makeHostOffer();
    },

    startJoin: () => {
      if (get().peer) return;
      set({ role: 'guest', meId: GUEST_ID, remote: null });
      makeGuest();
    },

    hostReceiveAnswer: async (sdp) => {
      try {
        await get().peer?.acceptAnswer(sdp);
      } catch (e) {
        set({ error: '应答码无效：' + String(e) });
      }
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

    repair: async () => {
      stopHeartbeat();
      get().peer?.close();
      set({ peer: null, link: 'reconnecting', error: null });
      if (get().role === 'host') await makeHostOffer();
      else makeGuest();
    },

    leave: () => {
      stopHeartbeat();
      get().peer?.close();
      set({
        role: null,
        phase: 'idle',
        link: 'online',
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
