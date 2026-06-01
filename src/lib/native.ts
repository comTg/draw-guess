import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavStore } from '../store/navStore';
import { useConnStore } from '../store/connStore';

let inited = false;

/** 原生平台初始化：状态栏、Android 物理返回键。Web 端为 no-op。 */
export function initNative() {
  if (inited || !Capacitor.isNativePlatform()) return;
  inited = true;

  StatusBar.setStyle({ style: Style.Default }).catch(() => {});

  App.addListener('backButton', () => {
    const { route, go } = useNavStore.getState();
    if (route === 'home') {
      App.exitApp();
      return;
    }
    if (route === 'host' || route === 'join' || route === 'game') {
      useConnStore.getState().leave();
    }
    go('home');
  });
}
