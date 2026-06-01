/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 颜色全部映射到 CSS 变量，由 theme/tokens.css 按 浅色/深色/皮肤 切换。
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        primary: 'var(--primary)',
        'primary-press': 'var(--primary-press)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        line: 'var(--border)',
      },
      fontFamily: {
        head: ['Fredoka', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '22px',
      },
      boxShadow: {
        clay: 'var(--shadow-clay)',
        'clay-press': 'var(--shadow-clay-press)',
      },
    },
  },
  plugins: [],
};
