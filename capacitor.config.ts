import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drawguess.app',
  appName: '你画我猜',
  webDir: 'dist',
  // WebRTC / getUserMedia 需要安全上下文
  server: { androidScheme: 'https' },
  plugins: {
    StatusBar: { overlaysWebView: false },
  },
};

export default config;
