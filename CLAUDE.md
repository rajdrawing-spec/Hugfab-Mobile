# HugFab Mobile — working rules

The HugFab Android app: Expo (React Native + TypeScript + Expo Router + NativeWind).

These rules are binding. Anything they do not cover, ask before doing.

## 1. Repository boundaries

- **This repo (`rajdrawing-spec/hugfab-mobile`) is the only one we write to.**
- The web app, `rajdrawing-spec/HUGFAB-AI`, is **READ-ONLY reference**. Clone it
  into a temp folder outside this repo when you need to read it. Never commit to
  it, never push to it, never open a pull request against it.
- Work on a branch and open a PR. **Never push to `main`.**

## 2. Supabase

- Use the **same Supabase project as the web app**, via
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **Do not alter any existing table, column, RLS policy, or function.** Not a
  new policy, not a widened grant, not an added column. If the app needs
  something the schema does not already give it, write the proposal in
  `docs/PLAN.md` and wait for approval before touching the database.
- The app ships the **anon key only**. Every read and write it performs must be
  one that RLS permits for `anon` or `authenticated`.

## 3. Secrets

- **No secret keys in the app.** No service-role key, no payment gateway secret,
  no provider API key — not in source, not in `app.json`, not in an `EXPO_PUBLIC_*`
  variable. Anything bundled into the binary is public.
- Work that genuinely needs a secret goes into a **new Supabase Edge Function**,
  and only after approval.

## 4. Design

- **Match the web app exactly**: colours, fonts, spacing, radius, component
  styles. The web app's source of truth is `src/styles/tokens.css` and the
  `@theme inline` block in `src/styles/globals.css`.
- **No hard-coded colours outside the theme file.** Components ask for a
  semantic token (`bg-surface`, `text-muted`), never a raw hex or a Tailwind
  palette colour (`bg-red-600`).
- One light palette. The web app sets `color-scheme: only light` and has no dark
  theme; the app matches that.

## 5. Workflow

- Branch, commit with a clear message, push, open a PR, stop for review.
- Do not add a dependency that forces a custom dev build without saying so in
  the PR — it changes how the app is run and tested.
