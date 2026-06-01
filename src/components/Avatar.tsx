import { clsx } from 'clsx';

export const AVATAR_COLORS = [
  '#FF6B9D',
  '#6C5CE7',
  '#00C2A8',
  '#FFB020',
  '#3B82F6',
  '#A855F7',
];

interface Props {
  index: number;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
}

/** 简单可爱的 SVG 头像（按 index 取色），非 emoji。 */
export function Avatar({ index, size = 44, selected, onClick }: Props) {
  const c = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`头像 ${index + 1}`}
      aria-pressed={selected}
      disabled={!onClick}
      className={clsx(
        'rounded-full transition-transform duration-200 leading-none',
        onClick && 'cursor-pointer active:scale-95',
        selected && 'ring-[3px] ring-primary ring-offset-2'
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="21" fill={c} stroke="rgba(0,0,0,.12)" strokeWidth="2" />
        <circle cx="15" cy="19" r="3" fill="#fff" />
        <circle cx="29" cy="19" r="3" fill="#fff" />
        <circle cx="15" cy="20" r="1.4" fill="#1f2937" />
        <circle cx="29" cy="20" r="1.4" fill="#1f2937" />
        <path
          d="M14 27 Q22 33 30 27"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
