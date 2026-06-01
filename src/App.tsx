import { useApplyTheme } from './lib/useTheme';
import { useNavStore } from './store/navStore';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { HostPage } from './pages/HostPage';
import { JoinPage } from './pages/JoinPage';
import { GamePage } from './pages/GamePage';

export default function App() {
  useApplyTheme();
  const route = useNavStore((s) => s.route);

  switch (route) {
    case 'home':
      return <HomePage />;
    case 'settings':
      return <SettingsPage />;
    case 'help':
      return <HelpPage />;
    case 'host':
      return <HostPage />;
    case 'join':
      return <JoinPage />;
    case 'game':
      return <GamePage />;
    default:
      return <HomePage />;
  }
}
