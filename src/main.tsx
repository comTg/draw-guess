import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// 自托管字体（离线可用，仅 latin 子集）：Fredoka(标题) + Nunito(正文)。
// 中文字符回退系统 CJK 字体——这两款字体本就不含 CJK 字形。
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
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
