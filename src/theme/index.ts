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
 * - `primary` is **#D81B60**, not the web app's #DC2626. The mobile brief asks
 *   for the brand's pink, and `docs/design-system.md` warns that the pink the
 *   red replaced was 3.41:1 and failed WCAG AA — so the shade was chosen by
 *   measurement rather than by eye:
 *
 *       #E91E63  (the reference image's pink)  4.35:1  FAILS AA
 *       #EC4899  (a common "hot pink")         3.53:1  FAILS AA
 *       #D81B60  (this token)                  4.95:1  passes
 *       #DC2626  (the web app's red)           4.83:1  passes
 *
 *   White on #D81B60 clears AA by a wider margin than the red it replaces, so
 *   the brief's direction costs nothing in contrast. Anyone tempted to nudge it
 *   towards the reference image should re-run those numbers first: the pink in
 *   that image is exactly the one the web app already rejected.
 *
 * - `error` stays red (#DC2626). With pink as the brand colour, a pink error
 *   would be indistinguishable from a CTA, and "this failed" must never look
 *   like "press me".
 * - `h1` is 32px here against the web's 48. The web scale is built for a 1440px
 *   column; 48px on a 360dp phone is four words to a line. The rest of the scale
 *   is shifted to match, and `display` is kept for a hero that does not exist yet.
 *
 * `fontSize` carries a size and a line height only — no `fontWeight`. Weight is
 * carried by the family (see `src/components/text.tsx`), and a numeric weight
 * beside a Poppins family is at best ignored and at worst a synthesised fake
 * bold. Leaving it out is what keeps the two from fighting.
 *
 * `borderRadius` carries `none` and `full` alongside the guide's 8/12/16/24.
 * Overriding Tailwind's scale replaces it rather than extending it, so leaving
 * them out silently deleted `rounded-full` — and the guide asks for exactly that
 * on pill CTAs and the search field. A missing radius class is invisible in
 * review: it compiles, it lints, and the corner is just wrong.
 *
 * Poppins is the web app's face, and it IS bundled — reversing an earlier call
 * to ship the system face. The weights add roughly 600KB to the APK, which is a
 * real cost on a slow connection; it buys the app looking like HugFab rather
 * than like whatever Android happens to ship, and that turned out to be most of
 * the difference between "basic" and "premium". The font is bundled rather than
 * fetched, so it costs nothing at runtime and cannot fail to load on a train.
 */

import tokens from './tokens.json';

export const colors = tokens.colors;
export const fontSize = tokens.fontSize;
export const borderRadius = tokens.borderRadius;
export const fontFamily = tokens.fontFamily;

/**
 * Depth, as React Native wants it.
 *
 * Not a Tailwind `shadow-*` scale, because there is no `box-shadow` here: iOS
 * reads four `shadow*` props and Android reads a single `elevation` integer, and
 * a class name cannot carry both. So a raised surface takes `elevation('md')` on
 * its `style` — the one place in this app where a style object beats a class.
 *
 * Used sparingly and on purpose. A 1px border says "here is an edge"; a shadow
 * says "this sits above the page". A screen where everything is raised has said
 * nothing at all.
 */
export type ElevationToken = keyof typeof tokens.elevation;

export function elevation(token: ElevationToken) {
  const e = tokens.elevation[token];
  return {
    shadowColor: e.shadowColor,
    shadowOpacity: e.shadowOpacity,
    shadowRadius: e.shadowRadius,
    shadowOffset: { width: e.shadowOffsetWidth, height: e.shadowOffsetHeight },
    elevation: e.elevation,
  } as const;
}

/**
 * The brand ribbon, for `expo-linear-gradient`. Two stops, left to right, from
 * the web app's `promo-from` / `promo-to`.
 */
export const promoGradient = [colors['promo-from'], colors['promo-to']] as const;

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
