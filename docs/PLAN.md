# HugFab Mobile — plan

Android first, Expo Go for development, `eas build` when Phase 1 outgrows it.

The web app has six surfaces (shop, account, merchant, admin, marketing, ads).
**Only the shopper surface comes to mobile.** A merchant approving a settlement
or an admin resolving a return is doing desk work on a 1440px screen; shrinking
those screens would cost months and serve nobody.

---

## Phase 1 — browse, save, sign in

Nine screens. Everything a shopper does before money moves.

| Route | Screen | Reads |
|---|---|---|
| `(tabs)/index` | Home — product rails | `GET /api/products` |
| `(tabs)/search` | Query, filters, infinite scroll | `GET /api/products`, `GET /api/search` |
| `(tabs)/wishlist` | Saved products | ⚠ needs `GET /api/wishlist` |
| `(tabs)/cart` | Bag: lines, quantities, server totals | ⚠ needs `GET /api/cart` |
| `(tabs)/account` | Profile, orders, addresses, sign out | `GET /api/account/summary`, ⚠ rest |
| `product/[slug]` | Gallery, best offer, offer count, Find Similar | `GET /api/products/:slug` |
| `offers/[slug]` | Every offer → click-out | `GET /api/products/:slug`, `GET /api/affiliate/click` |
| `auth/login` | Email + password | `supabase.auth.signInWithPassword` |
| `auth/signup` | Email + password | `supabase.auth.signUp` |

⚠ = the endpoint does not exist yet. See `docs/API-GAPS.md`. Those screens are
built, and they say plainly that the feature is not wired up rather than showing
invented rows.

The cart tab is labelled **Bag**, which is the web app's word for it
(`src/components/layout/nav-links.ts`). The route stays `cart` to match the API.

### Deliberately not in Phase 1

Checkout (needs payments), Live, Trial Room, AI Stylist, Community, Discover,
Compare, saved searches, price alerts, notifications. Each is a Phase 2 or 3
entry below, not an omission.

### Home, honestly

The web homepage is CMS-driven: an admin arranges ordered sections at
`/admin/homepage` and `src/modules/merchandising/service.ts` resolves them.
**There is no endpoint for it.**

So Phase 1 Home renders rails built from `GET /api/products` with real documented
parameters — newest listings, and a price band — through a `HomeSection`
abstraction. When `GET /api/homepage` lands (`docs/API-GAPS.md` §7), Home becomes
a map over server-supplied sections and the local list is deleted. The shape is
already the right shape; only the source changes.

The Deals rail is not in Phase 1 at all. Deals come from Cuelinks, which
`HUGFAB-AI/docs/hugfab-api-readiness.md` records as NOT CONFIGURED — a rail that
is empty in production is worse than no rail.

---

## Phase 2 — needs a dev build

Everything here needs a native module Expo Go does not carry. The trigger is one
`eas build -p android --profile preview`, which is still a hot-reloading client —
just one with our own native modules compiled in.

| Feature | Why Expo Go cannot | What it needs |
|---|---|---|
| **Checkout and payment** | Razorpay ships a native SDK | `react-native-razorpay` in a dev build. Phase 1 stubs the Bag's checkout button as "Continue on web", opening `/cart` in `expo-web-browser` — the web checkout works today and takes real money |
| **Push notifications** | Expo Go dropped remote push on Android | `expo-notifications` in a dev build, plus FCM credentials, plus a device-token table in HUGFAB-AI |
| **Trial Room** | Needs camera + on-device avatar work; AR is not available in Expo Go at all | `expo-camera` in a dev build; see `HUGFAB-AI/docs/HUGFAB-TRIAL-ROOM-AVATAR.md` |
| **Google sign-in** | Works in Expo Go only through a browser round trip with `exp://` redirects, which breaks the moment the scheme changes | `expo-auth-session` against a dev build's own scheme |

Also Phase 2, but not blocked by the build: HugFab Live playback (`expo-video`
plays HLS in Expo Go — it is deferred for scope, not capability), AI Stylist,
Community, Discover, price alerts, Compare.

---

## Phase 3

Deals once an affiliate network is live. Image search. Offline catalogue cache.
iOS — nothing in Phase 1 or 2 is Android-only, but nothing has been tested on
iOS either, and claiming otherwise would be a guess.

---

## Expo Go limits, in one list

Keep this honest; it decides what may be built.

**Works:** browsing, search, filters, product pages, click-out via
`expo-web-browser`, email/password auth, AsyncStorage sessions, `expo-image`,
HLS video via `expo-video`, basic camera.

**Does not work:** any native module not already in Expo Go — Razorpay, remote
push on Android, AR, background tasks, custom native crypto.

**The development catch:** Expo Go loads from a dev server your phone can reach.
Run `npx expo start` on your own machine, and point `EXPO_PUBLIC_API_BASE_URL` at
your laptop's LAN address (`http://192.168.x.x:3000`) or at `https://hugfab.com`.
`localhost` means the phone itself and will always fail. `--tunnel` when the
phone is on another network.

---

## Definition of done, Phase 1

1. `npx tsc --noEmit` clean, `npx eslint .` clean.
2. `npx expo start` → Expo Go on a real Android device, no red screen.
3. Browse → product → offers → click-out works signed out, end to end, against
   production `https://hugfab.com`.
4. Sign in, sign out, and a session that survives a cold start.
5. Every ⚠ screen states what is missing instead of pretending.
