/**
 * NativeWind's Tailwind config. Tokens come from `src/theme/tokens.json`, which
 * `src/theme/index.ts` also reads — one source for the classes NativeWind
 * generates and the hexes React Native is handed directly.
 *
 * The default Tailwind palette is deliberately NOT spread in. `bg-blue-500` would
 * work, and would say what a thing looks like today rather than what it is —
 * `docs/design-system.md`, "The one rule". White, black and transparent are kept
 * because an overlay and a border need them.
 */
const { colors, fontSize, borderRadius } = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: {
      ...colors,
      white: '#FFFFFF',
      black: '#000000',
      transparent: 'transparent',
    },
    fontSize,
    borderRadius,
    extend: {},
  },
  plugins: [],
};
