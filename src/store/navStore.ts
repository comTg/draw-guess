import { create } from 'zustand';

/** 简单的页面路由。后续 M1+ 会结合 connStore.phase / gameStore.status 自动切换。 */
export type Route = 'home' | 'host' | 'join' | 'game' | 'settings' | 'help';

interface NavState {
  route: Route;
  go: (r: Route) => void;
  back: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  route: 'home',
  go: (route) => set({ route }),
  back: () => set({ route: 'home' }),
}));
