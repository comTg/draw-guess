import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 样式加载顺序：先变量(tokens) → 再 Clay 组件类 → 最后 Tailwind(utilities 可覆盖)
import './theme/tokens.css';
import './theme/clay.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
