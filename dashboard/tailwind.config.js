export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-hover': 'var(--color-surface-hover)',
        primary: 'var(--color-primary)',
        muted: 'var(--color-muted)',
        'muted-lighter': 'var(--color-muted-lighter)',
        accent: 'var(--color-accent)',
        'accent-subtle': 'var(--color-accent-subtle)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
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
