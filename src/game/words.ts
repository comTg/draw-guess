import type { Difficulty } from '../types';

export interface WordEntry {
  word: string;
  category: string;
  difficulty: Difficulty;
}

// 内置词库（分类 × 难度）。easy=具体名词，normal=组合词/动作，hard=抽象/成语/网络词。
export const WORDS: WordEntry[] = [
  // —— easy ——
  { word: '苹果', category: '食物', difficulty: 'easy' },
  { word: '西瓜', category: '食物', difficulty: 'easy' },
  { word: '草莓', category: '食物', difficulty: 'easy' },
  { word: '蛋糕', category: '食物', difficulty: 'easy' },
  { word: '太阳', category: '自然', difficulty: 'easy' },
  { word: '月亮', category: '自然', difficulty: 'easy' },
  { word: '星星', category: '自然', difficulty: 'easy' },
  { word: '树叶', category: '自然', difficulty: 'easy' },
  { word: '花朵', category: '自然', difficulty: 'easy' },
  { word: '小猫', category: '动物', difficulty: 'easy' },
  { word: '小狗', category: '动物', difficulty: 'easy' },
  { word: '蝴蝶', category: '动物', difficulty: 'easy' },
  { word: '小鱼', category: '动物', difficulty: 'easy' },
  { word: '雨伞', category: '生活用品', difficulty: 'easy' },
  { word: '帽子', category: '生活用品', difficulty: 'easy' },
  { word: '眼镜', category: '生活用品', difficulty: 'easy' },
  { word: '杯子', category: '生活用品', difficulty: 'easy' },
  { word: '书包', category: '生活用品', difficulty: 'easy' },
  { word: '铅笔', category: '生活用品', difficulty: 'easy' },
  { word: '气球', category: '生活用品', difficulty: 'easy' },
  { word: '汽车', category: '交通', difficulty: 'easy' },
  { word: '飞机', category: '交通', difficulty: 'easy' },
  { word: '房子', category: '生活用品', difficulty: 'easy' },
  { word: '雨靴', category: '生活用品', difficulty: 'easy' },

  // —— normal ——
  { word: '放风筝', category: '动作', difficulty: 'normal' },
  { word: '红绿灯', category: '生活', difficulty: 'normal' },
  { word: '过马路', category: '动作', difficulty: 'normal' },
  { word: '刷牙', category: '动作', difficulty: 'normal' },
  { word: '游泳', category: '动作', difficulty: 'normal' },
  { word: '踢足球', category: '运动', difficulty: 'normal' },
  { word: '打篮球', category: '运动', difficulty: 'normal' },
  { word: '弹吉他', category: '动作', difficulty: 'normal' },
  { word: '骑自行车', category: '动作', difficulty: 'normal' },
  { word: '吃火锅', category: '动作', difficulty: 'normal' },
  { word: '看电影', category: '动作', difficulty: 'normal' },
  { word: '堆雪人', category: '动作', difficulty: 'normal' },
  { word: '钓鱼', category: '动作', difficulty: 'normal' },
  { word: '爬山', category: '动作', difficulty: 'normal' },
  { word: '跳绳', category: '运动', difficulty: 'normal' },
  { word: '冰淇淋', category: '食物', difficulty: 'normal' },
  { word: '长颈鹿', category: '动物', difficulty: 'normal' },
  { word: '向日葵', category: '自然', difficulty: 'normal' },
  { word: '摩天轮', category: '游乐', difficulty: 'normal' },
  { word: '消防车', category: '交通', difficulty: 'normal' },
  { word: '圣诞树', category: '节日', difficulty: 'normal' },
  { word: '生日蛋糕', category: '节日', difficulty: 'normal' },
  { word: '熊猫', category: '动物', difficulty: 'normal' },
  { word: '企鹅', category: '动物', difficulty: 'normal' },
  { word: '章鱼', category: '动物', difficulty: 'normal' },
  { word: '彩虹', category: '自然', difficulty: 'normal' },

  // —— hard ——
  { word: '画蛇添足', category: '成语', difficulty: 'hard' },
  { word: '守株待兔', category: '成语', difficulty: 'hard' },
  { word: '亡羊补牢', category: '成语', difficulty: 'hard' },
  { word: '对牛弹琴', category: '成语', difficulty: 'hard' },
  { word: '井底之蛙', category: '成语', difficulty: 'hard' },
  { word: '掩耳盗铃', category: '成语', difficulty: 'hard' },
  { word: '自由', category: '抽象', difficulty: 'hard' },
  { word: '孤独', category: '抽象', difficulty: 'hard' },
  { word: '梦想', category: '抽象', difficulty: 'hard' },
  { word: '时间', category: '抽象', difficulty: 'hard' },
  { word: '后悔', category: '抽象', difficulty: 'hard' },
  { word: '紧张', category: '抽象', difficulty: 'hard' },
  { word: '惊喜', category: '抽象', difficulty: 'hard' },
  { word: '平衡', category: '抽象', difficulty: 'hard' },
  { word: '回忆', category: '抽象', difficulty: 'hard' },
  { word: '希望', category: '抽象', difficulty: 'hard' },
  { word: '温暖', category: '抽象', difficulty: 'hard' },
  { word: '勇气', category: '抽象', difficulty: 'hard' },
  { word: '默契', category: '抽象', difficulty: 'hard' },
  { word: '熬夜', category: '生活', difficulty: 'hard' },
  { word: '社恐', category: '网络', difficulty: 'hard' },
  { word: '内卷', category: '网络', difficulty: 'hard' },
];

const byDifficulty = (d: Difficulty) => WORDS.filter((w) => w.difficulty === d);

const lookup = new Map(WORDS.map((w) => [w.word, w]));
export const categoryOf = (word: string): string => lookup.get(word)?.category ?? '未知';

/** 随机抽 count 个该难度、未用过的词。词不够时回退到全部该难度词。 */
export function pickWords(count: number, difficulty: Difficulty, exclude: Set<string>): WordEntry[] {
  let pool = byDifficulty(difficulty).filter((w) => !exclude.has(w.word));
  if (pool.length < count) pool = byDifficulty(difficulty); // 用尽则允许重复
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
