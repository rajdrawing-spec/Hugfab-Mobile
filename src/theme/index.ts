/**
 * The design tokens, ported from HUGFAB-AI `src/styles/tokens.css` and
 * documented in that repo's `docs/design-system.md`.
 *
 * `tokens.json` is the single source. It is JSON rather than TypeScript for one
 * reason: `tailwind.config.js` has to read the same values, and a plain `require`
 * of a `.ts` module from a CommonJS config does not work. JSON is the one format
 * both the Tailwind config and the typed app code can read without a build step,
 * so the palette cannot drift between the classes NativeWind generates and the
 * hexes this module hands to React Native.
 *
 * Which means: **a component says `bg-surface` and `text-h3`, never a hex.**
 * `color()` below exists only for the handful of props React Native will not
 * accept a class name for.
 *
 * The web palette also has a dark theme. It is deliberately not ported: that
 * palette is derived rather than given, and `docs/design-system.md` records that
 * it wants a designer's review before Phase 1 ships. A phone switches theme
 * without asking, so guessing here would put unreviewed colour in front of every
 * user. `app.json` pins `userInterfaceStyle` to light until then.
 *
 * Two notes on values that look wrong and are not:
 *
 * - `primary` (#DC2626) is a shade deeper than the logo's red (#F5100F). White
 *   text on pure red is 4.00:1 and fails WCAG AA; this is 4.83:1. Measured, not
 *   accidental — do not "fix" it.
 * - `h1` is 32px here against the web's 48. The web scale is built for a 1440px
 *   column; 48px on a 360dp phone is four words to a line. The rest of the scale
 *   is shifted to match, and `display` is kept for a hero that does not exist yet.
 *
 * Poppins is the web app's face and is not bundled here. A font file is close to
 * a megabyte before first paint, Phase 1 has not measured whether that is worth
 * it on a slow connection, and the system face is honest in the meantime.
 */

import tokens from './tokens.json';

export const colors = tokens.colors;
export const fontSize = tokens.fontSize;
export const borderRadius = tokens.borderRadius;

export type ColorToken = keyof typeof colors;

/**
 * A token's hex, for a prop that cannot take a class name: `StatusBar`,
 * `ActivityIndicator`, a `Tabs` screen option, a `RefreshControl` tint.
 *
 * Reach for this only when NativeWind genuinely cannot do the job. Every use is
 * a place the theme has to be threaded by hand.
 */
export function color(token: ColorToken): string {
  return colors[token];
}
