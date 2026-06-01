import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useUiStore } from '../store/uiStore';

// 原生平台用 Capacitor Haptics；Web 端用 navigator.vibrate。
function buzz(webPattern: number | number[], style: ImpactStyle) {
  if (!useUiStore.getState().haptics) return;
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {});
  } else {
    try {
      navigator.vibrate?.(webPattern);
    } catch {
      /* 不支持则忽略 */
    }
  }
}

export const haptic = {
  correct: () => buzz(60, ImpactStyle.Medium),
  tick: () => buzz(12, ImpactStyle.Light),
  win: () => buzz([60, 40, 120], ImpactStyle.Heavy),
  end: () => buzz(35, ImpactStyle.Light),
};
