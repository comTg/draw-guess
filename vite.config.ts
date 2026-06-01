import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host:true 让开发服务器监听局域网地址，方便两台设备/手机联调。
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  // 相对路径，便于 Capacitor 套壳后从 file:// 或自定义 scheme 加载资源。
  base: './',
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
