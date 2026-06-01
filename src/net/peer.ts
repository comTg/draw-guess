import { decodeMsg, encodeMsg, type Msg } from './protocol';

export interface PeerEvents {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (msg: Msg) => void;
  onState?: (state: RTCPeerConnectionState) => void;
}

const STUN = 'stun:stun.l.google.com:19302';

/** WebRTC 点对点连接封装：手动信令（无 trickle），等待 ICE 收集完成后再导出 SDP。 */
export class Peer {
  readonly pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private ev: PeerEvents;

  constructor(opts: { lanOnly: boolean }, ev: PeerEvents) {
    this.ev = ev;
    this.pc = new RTCPeerConnection({
      iceServers: opts.lanOnly ? [] : [{ urls: STUN }],
      iceCandidatePoolSize: 2,
    });
    this.pc.onconnectionstatechange = () => this.ev.onState?.(this.pc.connectionState);
    // 访客端通过此事件拿到房主创建的通道
    this.pc.ondatachannel = (e) => this.bindChannel(e.channel);
  }

  private bindChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.onopen = () => this.ev.onOpen?.();
    dc.onclose = () => this.ev.onClose?.();
    dc.onmessage = (e) => {
      const msg = decodeMsg(e.data);
      if (msg) this.ev.onMessage?.(msg);
    };
  }

  get channelOpen(): boolean {
    return this.dc?.readyState === 'open';
  }

  /** 房主：创建通道与 Offer，等待 ICE 完成，返回 SDP。 */
  async createOffer(): Promise<string> {
    const dc = this.pc.createDataChannel('game', { ordered: true });
    this.bindChannel(dc);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitIce();
    return this.pc.localDescription!.sdp;
  }

  /** 访客：接收 Offer，创建 Answer，等待 ICE 完成，返回 Answer SDP。 */
  async acceptOfferCreateAnswer(offerSdp: string): Promise<string> {
    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitIce();
    return this.pc.localDescription!.sdp;
  }

  /** 房主：接收 Answer，握手完成后通道会自动 open。 */
  async acceptAnswer(answerSdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  send(msg: Msg) {
    if (this.dc?.readyState === 'open') this.dc.send(encodeMsg(msg));
  }

  private waitIce(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') return resolve();
      const check = () => {
        if (this.pc.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', check);
          clearTimeout(timer);
          resolve();
        }
      };
      // 兜底：某些网络环境 complete 事件迟迟不触发，3.5s 后用已收集到的候选导出。
      const timer = setTimeout(() => {
        this.pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }, 3500);
      this.pc.addEventListener('icegatheringstatechange', check);
    });
  }

  close() {
    try {
      this.dc?.close();
    } catch {
      /* ignore */
    }
    try {
      this.pc.close();
    } catch {
      /* ignore */
    }
  }
}
