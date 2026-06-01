import { ThumbsUp, Heart, Laugh, PartyPopper, Frown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { sendEmoji } from '../../game/engine';

export const EMOJIS = [ThumbsUp, Heart, Laugh, PartyPopper, Frown];
const COLORS = ['#3B82F6', '#EF4444', '#FACC15', '#A855F7', '#6B7280'];

export function EmojiBar() {
  return (
    <div className="flex gap-2 justify-center">
      {EMOJIS.map((Icon, i) => (
        <button
          key={i}
          aria-label={`表情 ${i + 1}`}
          onClick={() => sendEmoji(i)}
          className="clay-icon-btn !w-11 !h-11"
          style={{ color: COLORS[i] }}
        >
          <Icon size={22} />
        </button>
      ))}
    </div>
  );
}

/** 飘屏表情层（覆盖全屏，不拦截点击）。自己发的从右侧飘，对方从左侧飘。 */
export function EmojiLayer() {
  const flying = useGameStore((s) => s.flying);
  const remove = useGameStore((s) => s.removeFly);
  const meId = useGameStore((s) => s.meId);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 50 }}>
      <AnimatePresence>
        {flying.map((f) => {
          const Icon = EMOJIS[f.emoji] ?? EMOJIS[0];
          const fromMe = f.from === meId;
          return (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -180, scale: 1.25 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              onAnimationComplete={() => remove(f.key)}
              style={{ position: 'absolute', bottom: 120, left: fromMe ? '68%' : '22%' }}
            >
              <Icon size={46} style={{ color: COLORS[f.emoji] ?? '#888' }} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
