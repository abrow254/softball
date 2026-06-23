import type { Config } from 'tailwindcss'

// Brand: clean diamond-dirt palette — cream paper, chalk lines, infield clay.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.ts',
  ],
  theme: {
    extend: {
      colors: {
        field: {
          cream: '#F7F4EC',
          paper: '#FFFFFF',
          ink: '#1C2321',
          muted: '#6B7280',
          line: '#E3DECF',
          'line-strong': '#C7BFA8',
          grass: '#2F6F4F',
          'grass-light': '#7FB295',
          clay: '#B0563A',
          'clay-light': '#D08A6E',
          gold: '#C99A2E',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
