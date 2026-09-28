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
  /**
   * `class`, not the `media` default, for two reasons that point the same way.
   *
   * The one that matters: this app has no dark palette. `src/theme/index.ts`
   * records why — the web app's dark values are derived rather than designed and
   * are waiting on a review. Under `media`, the first `dark:` class anyone adds
   * would activate from the OS setting and put that unreviewed palette on screen
   * with nobody deciding to. Under `class` it cannot turn on until we turn it on.
   *
   * The one that is visible today: react-native-css-interop's web runtime calls
   * `colorScheme.set()` from its own stylesheet observer, and `set()` throws when
   * the flag is `media` — an uncaught error over every screen in a dev build. The
   * error names this setting as the fix.
   */
  darkMode: 'class',
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
