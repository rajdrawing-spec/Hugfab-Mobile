# HugFab Mobile — working rules

The HugFab Android app. Expo (React Native) + TypeScript + Expo Router +
NativeWind, talking to the same backend as the web app.

The web app is **`rajdrawing-spec/HUGFAB-AI`** (Next.js 15, Supabase). It is the
authority on every contract this app consumes. When this file and the web repo
disagree, the web repo wins and this file is wrong — say so in the PR.

Read before changing anything here:

| In HUGFAB-AI | For |
|---|---|
| `docs/api.md` | The response envelope, money shape, every endpoint, rate limits |
| `docs/design-system.md` | Tokens, type scale, radii — ported into `src/theme` |
| `docs/ui-ux-guide.md` | Screens and patterns |
| `src/modules/*/types.ts` | The domain types this app mirrors |
| `src/modules/*/service.ts` | The business rules — they stay there, never here |

## The one rule

**This app renders; it does not decide.** No price arithmetic, no discount
calculation, no availability rule, no cart total. Every one of those is a
`src/modules/*/service.ts` answer arriving over HTTP. When a screen needs a
number the API does not return, the fix is an endpoint in HUGFAB-AI — see
`docs/API-GAPS.md` — never a calculation here.

The second rule follows from it: a screen shows what the server said, or it
shows that it could not. Never a plausible substitute.

## Architecture

REST-first. `supabase-js` is used for **authentication only**.

```
screen → TanStack Query → src/api/<resource>.ts → apiFetch() → https://hugfab.com/api/...
                                                      ↑
                                         Authorization: Bearer <supabase access_token>
```

- `src/lib/supabase.ts` owns the session: email/password sign-in, persisted in
  AsyncStorage, `autoRefreshToken` on. Google arrives in Phase 2.
- `src/api/client.ts` is the only place `fetch` is called. It unwraps the
  `{ data }` / `{ error }` envelope, maps the documented codes to typed errors,
  retries **once** on `401` after refreshing the token, and carries
  `x-request-id` onto every error so a report can quote it.
- **Never query Supabase tables from this app.** RLS would allow some of it, but
  the offer, price and cart rules live in the web app's services and an app that
  reads rows reimplements them by accident.
- **Never ship `SUPABASE_SERVICE_ROLE_KEY`.** It bypasses RLS and anything in an
  APK is readable. The anon key is the only key this app may hold.

## Money

Integer minor units, always: `{ amountMinor: 189900, currency: 'INR' }`.
`src/lib/money.ts` is ported from the web app's `src/lib/money.ts` and is the
only place a currency symbol is produced. Never a float, never a hardcoded `₹`,
never `× 100`.

## Design

`src/theme/tokens.json` holds the palette, type scale, radii and elevation from
`docs/design-system.md`; `tailwind.config.js` and `src/theme/index.ts` both read
it, so the classes and the style objects cannot drift.

**No component hardcodes a hex, a font size or a radius.** `bg-surface`,
`text-h3`, `rounded-lg`. If the token you want is missing, add it to
`tokens.json` first.

Screens and patterns come from **HUGFAB-AI `docs/ui-ux-guide.md`**, which is as
binding as the token file and was under-read the first time: the search bar's
camera, the category rail, the wishlist heart on a card, the retailer shown with
its logo and name, and the bottom bar's raised action button are all specified
there, and all were missing from the first build.

Three rules that are not decoration:

- **Weight is a font family, not a `fontWeight`.** Poppins ships one file per
  weight and React Native cannot synthesise a bold, so `fontSize` tokens carry no
  weight and `Text` picks the family. A numeric weight beside a Poppins family is
  ignored on Android and faked on iOS.
- **`elevation()` is a style object, not a class.** There is no `box-shadow`
  here: iOS reads four `shadow*` props, Android reads one `elevation` integer,
  and no class carries both. Use it sparingly — a screen where everything is
  raised has said nothing.
- **NativeWind does not style third-party components.** `className` on
  `LinearGradient` and friends is silently dropped. Give the layout to a wrapper
  `View` and let the third-party component fill it.

The affiliate disclosure (`AffiliateNote`) belongs on **any** surface with an
outbound buy link — PRD §74 and the guide's §6, not a footer convention.

Every list has three states and all three are built at the same time: skeleton
(never a spinner), empty (say what to do next), error (say what happened and
offer Retry).

## Expo Go

Phase 1 runs in Expo Go, so the app uses **no native module Expo Go does not
already carry**. Razorpay's native SDK, remote push and AR are therefore out —
they are Phase 2, behind `eas build`, and listed in `docs/PLAN.md`. Do not
half-build them; do not add a native module to work around this.

## The console

`app/dashboard.tsx` is the one screen that is not a shopper screen. It reports
what is waiting on a seller or an admin and links out; it never administers
anything. Both its endpoints already exist, so it is also the only screen with no
outstanding entry in `docs/API-GAPS.md`.

One rule specific to it: **`NOT_FOUND` from a console endpoint means "not your
console", not "not built yet".** Both guards answer 404 for a person without a
shop or without the admin role, on purpose — so `src/api/dashboard.ts` resolves
that to `null` rather than routing it through `orUnavailable`, which would tell a
shopper their dashboard was coming soon.

## Conventions

- TypeScript `strict`. No `any` in application code.
- File-based routing under `app/`. A route file wires and lays out; logic lives
  in `src/`.
- `EXPO_PUBLIC_*` for anything read at runtime; everything else is a build
  secret and does not belong in this repo.
- Commits are reviewable steps. `npx tsc --noEmit` and `npx eslint .` clean
  before each one.
