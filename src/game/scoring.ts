export const DRAWER_BONUS = 60;
const BASE = 100;
const MIN_GUESS = 20;

/** 标准化：去空白与标点、转小写。用于猜词比较。 */
export function normalizeWord(s: string): string {
  return s.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
}

export const isCorrect = (guess: string, word: string): boolean =>
  normalizeWord(guess) === normalizeWord(word) && normalizeWord(word).length > 0;

/** 猜手得分：基础分 × 剩余时间比例，向上取整，下限 20。 */
export function scoreForGuess(remaining: number, total: number): number {
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return Math.max(MIN_GUESS, Math.ceil(BASE * ratio));
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** "很接近"：标准化后编辑距离为 1（且长度≥2），用于温和提示，不计正确。 */
export function isClose(guess: string, word: string): boolean {
  const g = normalizeWord(guess);
  const w = normalizeWord(word);
  if (w.length < 2 || g.length === 0) return false;
  const d = levenshtein(g, w);
  return d >= 1 && d <= 1;
}
