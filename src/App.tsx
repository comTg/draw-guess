import { lazy, Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useApplyTheme } from './lib/useTheme';
import { initNative } from './lib/native';
import { useNavStore } from './store/navStore';
import { Screen } from './components/ui';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';

// 重页面懒加载：把二维码扫描(@zxing)、画布、framer-motion 等拆出首屏，让首页秒开。
const HostPage = lazy(() => import('./pages/HostPage').then((m) => ({ default: m.HostPage })));
const JoinPage = lazy(() => import('./pages/JoinPage').then((m) => ({ default: m.JoinPage })));
const GamePage = lazy(() => import('./pages/GamePage').then((m) => ({ default: m.GamePage })));

function Fallback() {
  return (
    <Screen>
      <div className="flex-1 flex items-center justify-center text-muted">
        <Loader2 className="animate-spin" size={28} />
      </div>
    </Screen>
  );
}

export default function App() {
  useApplyTheme();
  useEffect(() => {
    initNative();
  }, []);
  const route = useNavStore((s) => s.route);

  return (
    <Suspense fallback={<Fallback />}>
      {route === 'settings' ? (
        <SettingsPage />
      ) : route === 'help' ? (
        <HelpPage />
      ) : route === 'host' ? (
        <HostPage />
      ) : route === 'join' ? (
        <JoinPage />
      ) : route === 'game' ? (
        <GamePage />
      ) : (
        <HomePage />
      )}
    </Suspense>
  );
}
