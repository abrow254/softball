import type { Config } from 'tailwindcss'

// Brand: The Softball Team — Cardinals red + yellow on white, black outlines.
// The `field` palette keys are kept (ballfield), but mapped to brand roles:
//   grass       → Cardinals red   (primary: buttons, links, badges, wins)
//   grass-light → light red       (hover/soft)
//   clay        → deep red        (errors / remove / loss)
//   gold        → Cardinals yellow (accent: nav stripe, highlights)
//   ink         → near-black      (text + outlines)
//   cream/paper → off-white/white (background + cards)
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
          cream: '#FBF9F5',
          paper: '#FFFFFF',
          ink: '#17171A',
          muted: '#5C6470',
          line: '#E7E2D8',
          'line-strong': '#CFC8BA',
          grass: '#C41E3A', // Cardinals red — primary accent
          'grass-light': '#E0566C',
          clay: '#A0162B', // deep red — errors / loss
          'clay-light': '#D08A6E',
          gold: '#FEDB00', // Cardinals yellow — accent
        },
      },
      fontFamily: {
        // Sporty condensed display (Oswald) for headings + wordmark.
        display: ['Oswald', 'system-ui', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
