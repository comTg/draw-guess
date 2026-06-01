import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';

/** 把 uiStore 中的 theme/skin 应用到 <html> 的 data-* 属性上，并跟随系统主题变化。 */
export function useApplyTheme() {
  const theme = useUiStore((s) => s.theme);
  const skin = useUiStore((s) => s.skin);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    const onChange = () => {
      if (theme === 'system') apply();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin);
  }, [skin]);
}
