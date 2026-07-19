export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        heading: [
          '"Space Grotesk"',
          'ui-monospace',
          'SFMono-Regular',
          'Consolas',
          'monospace',
        ],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
