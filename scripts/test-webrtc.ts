// 真实 WebRTC 回环测试：用 node-datachannel 的 polyfill 提供 RTCPeerConnection，
// 直接（不经二维码）交换 SDP，验证 Peer 握手 + 双向 hello 收发。
import { RTCPeerConnection } from 'node-datachannel/polyfill';
import nodeDataChannel from 'node-datachannel';

// peer.ts 在构造时才用到全局 RTCPeerConnection，此处先注入。
(globalThis as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = RTCPeerConnection;

import { Peer } from '../src/net/peer.ts';
import { PROTOCOL_VERSION } from '../src/net/protocol.ts';

function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('超时：连接或握手未在 15s 内完成')),
      15000
    );
    let hostGotHello = false;
    let guestGotHello = false;
    const check = () => {
      if (hostGotHello && guestGotHello) {
        clearTimeout(timeout);
        resolve();
      }
    };

    const host = new Peer(
      { lanOnly: true },
      {
        onOpen: () => {
          console.log('  · host 通道已打开，发送 hello');
          host.send({ t: 'hello', ver: PROTOCOL_VERSION, id: 'H', name: '房主阿猫', avatar: 0 });
        },
        onMessage: (m) => {
          if (m.t === 'hello') {
            console.log(`  · host 收到 hello ← ${m.name} (avatar ${m.avatar})`);
            hostGotHello = true;
            check();
          }
        },
        onState: (s) => console.log('  · host state:', s),
      }
    );

    const guest = new Peer(
      { lanOnly: true },
      {
        onOpen: () => {
          console.log('  · guest 通道已打开，发送 hello');
          guest.send({ t: 'hello', ver: PROTOCOL_VERSION, id: 'G', name: '访客阿狗', avatar: 1 });
        },
        onMessage: (m) => {
          if (m.t === 'hello') {
            console.log(`  · guest 收到 hello ← ${m.name} (avatar ${m.avatar})`);
            guestGotHello = true;
            check();
          }
        },
        onState: (s) => console.log('  · guest state:', s),
      }
    );

    (async () => {
      try {
        const offer = await host.createOffer();
        console.log(`  · 生成 offer (${offer.length} 字节 SDP)`);
        const answer = await guest.acceptOfferCreateAnswer(offer);
        console.log(`  · 生成 answer (${answer.length} 字节 SDP)`);
        await host.acceptAnswer(answer);
        console.log('  · SDP 交换完成，等待通道打开与 hello 互发…');
      } catch (e) {
        clearTimeout(timeout);
        reject(e as Error);
      }
    })();
  });
}

run()
  .then(() => {
    console.log('\n✅ WebRTC 回环握手 + 双向 hello 成功');
    try {
      nodeDataChannel.cleanup();
    } catch {
      /* ignore */
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n❌ 失败：', e?.message ?? e);
    try {
      nodeDataChannel.cleanup();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
