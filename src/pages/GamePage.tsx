import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Loader2, Trophy, Flag, Lightbulb } from 'lucide-react';
import { Button, Card, Screen, TopBar } from '../components/ui';
import { Avatar } from '../components/Avatar';
import { DrawCanvas } from '../components/DrawCanvas';
import { Toolbar } from '../components/Toolbar';
import { ScoreBar, CountdownBar, WordMask } from '../components/game/Hud';
import { ChatPanel, GuessInput, ChatInput } from '../components/game/Chat';
import { EmojiBar, EmojiLayer } from '../components/game/Emoji';
import { ReconnectOverlay } from '../components/game/ReconnectOverlay';
import { useGameStore } from '../store/gameStore';
import { useConnStore, setMessageHandler } from '../store/connStore';
import { useUiStore } from '../store/uiStore';
import { useNavStore } from '../store/navStore';
import { otherId, HOST_ID, GUEST_ID } from '../net/protocol';
import {
  chooseWord,
  pressReady,
  giveUp,
  giveHint,
  handleMessage,
  hostResync,
  resetEngine,
} from '../game/engine';

const DIFF_LABEL: Record<string, string> = { easy: '简单', normal: '普通', hard: '困难' };

export function GamePage() {
  const status = useGameStore((s) => s.status);
  const meId = useGameStore((s) => s.meId);
  const drawerId = useGameStore((s) => s.drawerId);
  const link = useConnStore((s) => s.link);
  const leave = useConnStore((s) => s.leave);
  const go = useNavStore((s) => s.go);
  const [waiting, setWaiting] = useState(false);

  const amDrawer = meId === drawerId;

  // 重连成功后，房主把全量状态同步给访客
  const prevLink = useRef(link);
  useEffect(() => {
    if (prevLink.current === 'reconnecting' && link === 'online') {
      if (useConnStore.getState().role === 'host' && useGameStore.getState().status !== 'lobby') {
        hostResync();
      }
    }
    prevLink.current = link;
  }, [link]);

  // 初始化对局 + 接管消息
  useEffect(() => {
    const conn = useConnStore.getState();
    const ui = useUiStore.getState();
    const id = conn.meId ?? HOST_ID;
    const oid = otherId(id);
    const players = {
      [id]: { id, name: ui.name, avatar: ui.avatar },
      [oid]: conn.remote
        ? { id: oid, name: conn.remote.name, avatar: conn.remote.avatar }
        : { id: oid, name: '对方', avatar: 0 },
    };
    useGameStore.getState().initGame({
      meId: id,
      players,
      totalRounds: ui.config.rounds,
      drawSeconds: ui.config.drawSeconds,
    });
    resetEngine();
    setMessageHandler(handleMessage);
    return () => {
      setMessageHandler(null);
      resetEngine();
    };
  }, []);

  // 状态推进后取消"等待对方"
  useEffect(() => {
    setWaiting(false);
  }, [status]);

  const onUndo = () => {
    useGameStore.getState().undo();
    useConnStore.getState().send({ t: 'undo' });
  };
  const onClear = () => {
    useGameStore.getState().clear();
    useConnStore.getState().send({ t: 'clear' });
  };
  const back = () => {
    leave();
    go('home');
  };
  const ready = () => {
    setWaiting(true);
    pressReady();
  };

  return (
    <Screen>
      <EmojiLayer />
      {link === 'reconnecting' && <ReconnectOverlay onHome={back} />}
      <TopBar title="你画我猜" onBack={back} />

      {status === 'lobby' && <Lobby waiting={waiting} onReady={ready} />}
      {status === 'wordpick' && <WordPick amDrawer={amDrawer} />}
      {status === 'drawing' && (
        <Drawing amDrawer={amDrawer} onUndo={onUndo} onClear={onClear} />
      )}
      {status === 'roundResult' && <RoundResult waiting={waiting} onReady={ready} />}
      {status === 'gameOver' && <GameOver waiting={waiting} onReady={ready} onHome={back} />}
    </Screen>
  );
}

// ============ 各阶段视图 ============

function VS() {
  const players = useGameStore((s) => s.players);
  return (
    <div className="flex items-center justify-center gap-5">
      {[HOST_ID, GUEST_ID].map((id, i) => {
        const p = players[id];
        return (
          <div key={id} className="contents">
            {i === 1 && <span className="font-head text-muted">VS</span>}
            <div className="flex flex-col items-center gap-1 w-24">
              <Avatar index={p?.avatar ?? 0} size={56} />
              <span className="font-bold truncate w-full text-center">{p?.name ?? '—'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Lobby({ waiting, onReady }: { waiting: boolean; onReady: () => void }) {
  const totalRounds = useGameStore((s) => s.totalRounds);
  const drawSeconds = useGameStore((s) => s.drawSeconds);
  const difficulty = useUiStore((s) => s.config.difficulty);
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-7 pb-8">
      <VS />
      <Card className="text-center text-sm text-muted">
        共 {totalRounds} 回合 · 每回合 {drawSeconds}s · 难度 {DIFF_LABEL[difficulty]}
      </Card>
      {waiting ? (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="animate-spin" size={20} /> 等待对方准备…
        </div>
      ) : (
        <Button variant="primary" onClick={onReady}>
          准备就绪
        </Button>
      )}
    </div>
  );
}

function WordPick({ amDrawer }: { amDrawer: boolean }) {
  const choices = useGameStore((s) => s.wordChoices);
  return (
    <div className="flex flex-col gap-4">
      <ScoreBar />
      {amDrawer ? (
        <div className="flex-1 flex flex-col items-center gap-4 pt-8">
          <p className="font-head text-xl text-text">选择一个词开始作画</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {choices.map((w, i) => (
              <Button key={w} variant="ghost" full onClick={() => chooseWord(i)}>
                {w}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted pt-16">
          <Loader2 className="animate-spin" size={28} />
          对方正在选词…
        </div>
      )}
    </div>
  );
}

function Drawing({
  amDrawer,
  onUndo,
  onClear,
}: {
  amDrawer: boolean;
  onUndo: () => void;
  onClear: () => void;
}) {
  const word = useGameStore((s) => s.word);
  const mask = useGameStore((s) => s.mask);
  const revealedCount = mask.filter((c) => c != null).length;
  const canHint = revealedCount < Math.floor(mask.length / 2);

  return (
    <div className="flex flex-col gap-3 pb-4">
      <ScoreBar />
      <CountdownBar />
      {amDrawer ? (
        <div className="flex items-center justify-center gap-3">
          <span className="font-head text-lg">
            你画：<span className="text-primary">{word}</span>
          </span>
          <button
            onClick={giveHint}
            disabled={!canHint}
            className="clay-btn clay-btn--ghost !min-h-[40px] !px-3 text-sm disabled:opacity-40"
          >
            <Lightbulb size={16} /> 提示
          </button>
        </div>
      ) : (
        <WordMask />
      )}

      <div className="relative w-full aspect-square clay-card p-0 overflow-hidden">
        <DrawCanvas editable={amDrawer} className="absolute inset-0" />
      </div>

      {amDrawer && <Toolbar onUndo={onUndo} onClear={onClear} />}
      <ChatPanel className="h-20" />
      {amDrawer ? <ChatInput /> : <GuessInput />}

      <div className="flex items-center justify-between gap-2 pt-1">
        <EmojiBar />
        {amDrawer && (
          <button
            onClick={giveUp}
            className="clay-btn clay-btn--ghost text-danger !min-h-[44px] !px-4 shrink-0"
          >
            <Flag size={16} /> 放弃
          </button>
        )}
      </div>
    </div>
  );
}

function DeltaRow({ id }: { id: string }) {
  const player = useGameStore((s) => s.players[id]);
  const delta = useGameStore((s) => s.lastDelta[id] ?? 0);
  const total = useGameStore((s) => s.scores[id] ?? 0);
  if (!player) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2">
        <Avatar index={player.avatar} size={32} />
        <span className="font-bold">{player.name}</span>
      </div>
      <div className="font-head tabular-nums">
        {delta > 0 && <span className="text-accent mr-2">+{delta}</span>}
        <span className="text-text">{total}</span>
      </div>
    </div>
  );
}

function RoundResult({ waiting, onReady }: { waiting: boolean; onReady: () => void }) {
  const correctWord = useGameStore((s) => s.correctWord);
  const round = useGameStore((s) => s.round);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const last = round >= totalRounds;
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 pb-8">
      <div className="text-center clay-pop">
        <p className="text-muted">答案是</p>
        <p className="font-head text-3xl text-primary mt-1">{correctWord}</p>
      </div>
      <Card className="w-full max-w-xs">
        <DeltaRow id={HOST_ID} />
        <div className="border-t-2 border-line" />
        <DeltaRow id={GUEST_ID} />
      </Card>
      {waiting ? (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="animate-spin" size={20} /> 等待对方…
        </div>
      ) : (
        <Button variant="primary" onClick={onReady}>
          {last ? '查看结果' : '继续'}
        </Button>
      )}
    </div>
  );
}

function GameOver({
  waiting,
  onReady,
  onHome,
}: {
  waiting: boolean;
  onReady: () => void;
  onHome: () => void;
}) {
  const winner = useGameStore((s) => s.winner);
  const meId = useGameStore((s) => s.meId);
  const players = useGameStore((s) => s.players);
  const scores = useGameStore((s) => s.scores);
  const title =
    winner === 'tie' ? '平局！' : winner === meId ? '你赢了！' : `${players[winner ?? '']?.name ?? '对方'} 赢了`;
  const maxScore = Math.max(1, ...Object.values(scores));

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 pb-8">
      <div className="text-center clay-pop">
        <Trophy className="mx-auto text-[color:var(--warning)]" size={56} />
        <h3 className="font-head text-3xl mt-2">{title}</h3>
      </div>
      <Card className="w-full max-w-xs flex flex-col gap-3">
        {[HOST_ID, GUEST_ID].map((id) => (
          <div key={id} className="flex items-center gap-3">
            <Avatar index={players[id]?.avatar ?? 0} size={32} />
            <div className="flex-1">
              <div className="flex justify-between text-sm font-bold">
                <span className="truncate">{players[id]?.name ?? '—'}</span>
                <span className="font-head tabular-nums">{scores[id] ?? 0}</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-2 mt-1 overflow-hidden">
                <div
                  className={clsx('h-full rounded-full', id === meId ? 'bg-primary' : 'bg-secondary')}
                  style={{ width: `${((scores[id] ?? 0) / maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </Card>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onHome}>
          返回首页
        </Button>
        {waiting ? (
          <Button variant="primary" disabled>
            <Loader2 className="animate-spin" size={18} /> 等待…
          </Button>
        ) : (
          <Button variant="primary" onClick={onReady}>
            再来一局
          </Button>
        )}
      </div>
    </div>
  );
}
