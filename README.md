# HugFab Mobile

The HugFab Android app — Expo (React Native + TypeScript + Expo Router + NativeWind).

Shares a Supabase backend with the HugFab web app
([`rajdrawing-spec/HUGFAB-AI`](https://github.com/rajdrawing-spec/HUGFAB-AI)), and
reads it over that app's documented REST API.

## Running it

Expo Go loads from a dev server your phone can reach, so run this on your own
machine — not in a container, and not over `localhost`.

```bash
npm install
npx expo start                  # add --tunnel if the phone is on another network
```

Scan the QR code with **Expo Go** on an Android device. No `.env` is needed: the
live API and the web app's Supabase project are committed defaults in
`src/lib/public-config.ts`, all three values being public already.

To point it somewhere else — a local `next dev`, a staging project — copy
`.env.example` to `.env.local` and set what you want to override. The API base
URL must be reachable *from the phone*: your laptop's LAN address
(`http://192.168.x.x:3000`), never `localhost`, which on a phone means the phone
and will always fail.

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
```

## Where things are

| Path | |
|---|---|
| `app/` | Routes. A route file wires and lays out; logic lives in `src/`. |
| `src/api/` | The REST client, the typed errors, and one module per resource. |
| `src/lib/supabase.ts` | Authentication only — the one file allowed to import supabase-js. |
| `src/theme/` | Tokens, ported from the web app's design system. |

## Read next

- [`CLAUDE.md`](./CLAUDE.md) — the working rules, and why the app renders rather
  than decides.
- [`docs/PLAN.md`](./docs/PLAN.md) — Phase 1 scope, Phase 2, and the Expo Go limits.
- [`docs/API-GAPS.md`](./docs/API-GAPS.md) — what HUGFAB-AI still needs to build for
  the bag, the wishlist, orders and addresses to work in the app.
