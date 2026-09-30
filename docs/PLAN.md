# HugFab Mobile — plan

Android first, Expo Go for development, `eas build` when Phase 1 outgrows it.

The web app has six surfaces (shop, account, merchant, admin, marketing, ads).
**The shopper surface comes to mobile, plus a read-only console.** A merchant
approving a settlement or an admin resolving a return is doing desk work on a
1440px screen; shrinking those screens would cost months and serve nobody. What
did come across is the one thing a phone is better at — seeing that something
needs you. See "The console" below.

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
| `dashboard` | Console: what is waiting on a seller or an admin | `GET /api/merchant/attention`, `GET /api/admin/attention` |
| `offers/[slug]` | Every offer → click-out | `GET /api/products/:slug`, `GET /api/affiliate/click` |
| `auth/login` | Email + password | `supabase.auth.signInWithPassword` |
| `auth/signup` | Email + password | `supabase.auth.signUp` |

⚠ = the endpoint does not exist yet. See `docs/API-GAPS.md`. Those screens are
built, and they say plainly that the feature is not wired up rather than showing
invented rows.

The cart tab is labelled **Bag**, which is the web app's word for it
(`src/components/layout/nav-links.ts`). The route stays `cart` to match the API.

### The console — a scope decision, reversed on purpose

This plan originally said no merchant or admin surface would come to mobile at
all. That was asked for and added, and the reasoning is worth keeping rather than
quietly deleting, because it still holds for most of what it covered.

**What has not changed:** approving a settlement, resolving a return, editing a
product, building a campaign. Those are desk work on a wide screen, and shrinking
them would cost months and serve nobody. None of them is in the app.

**What changed:** there is one question a phone is the right device for — *is
anything waiting on me?* — and answering it needed no new backend at all.
`GET /api/merchant/attention` and `GET /api/admin/attention` are both live REST
routes today, which makes the console the only screen in Phase 1 with no entry in
`docs/API-GAPS.md` beyond the bearer token every authenticated call needs.

So `app/dashboard.tsx` shows counts and what they mean, and every item on it opens
the web console. It reports; it does not administer. If a future change has it
approving or editing, that is the original decision being reversed for real, and
it should be argued for on its own terms rather than inherited from this line.

Which console a person sees is the server's decision. Both endpoints answer
`NOT_FOUND` for someone who is not a seller or not an admin — deliberately, so an
endpoint for shops does not confirm to someone without one that shops exist — so
the app asks both and renders whatever answers. The entry point on the Account tab
appears only when one does.

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

---

## What the guide specifies and this app now has

`HUGFAB-AI/docs/ui-ux-guide.md` §4 lists the patterns that recur across three or
more screens. The first build shipped tokens without them, which is why the UI
read as basic — correct colours, none of the concept.

| Guide §4 | State |
|---|---|
| Search bar: pill, magnifier left, camera right | Built. The camera is drawn and says visual search is Phase 2, rather than being left out and moving every other element when it arrives |
| Category rail: circular thumbnails, labels beneath | Built. `categories` has no image column, so a circle draws a tinted initial — the same fallback the web app uses |
| Product card: image, wishlist heart top-right, brand, name, price cluster, retailer | Built |
| Retailer shown with logo and name, never a bare domain | Built — `RetailerBadge`, with a monogram when the feed supplies no artwork |
| Price cluster: current h3 bold · original struck muted · discount green | Built. The discount is the server's figure, never derived from the two prices |
| Bottom bar: four destinations around a raised action button | Built. Destinations are this app's, not the web's — Discover and Community are not in Phase 1 |
| Affiliate disclosure on any surface with an outbound link (PRD §74) | Built — on Home, search, the product page and the offers list |
| Comparison table: logo, name, price, original, discount, action | Built as the offers screen |
| Deal Score, price history, Style DNA, Trust row | Not built — Phase 2, or needs feed data this app must not assert |

Two deviations worth naming:

- **The handwritten script** the concept uses for editorial asides (§7) is not
  used. It needs a licensed face and a `--font-script` token, neither of which
  exists, and the guide restricts it to marketing surfaces anyway.
- **Poppins is bundled**, reversing the first build's decision to ship the system
  face. It costs roughly 600KB in the APK and it is most of what separated this
  app from looking like HugFab.

---

## The 2026 mobile brief

A later brief re-scoped the app: a premium fashion-discovery product rather than
a mobile view of the website, with a five-tab structure and a pink brand.

### What changed

**Navigation.** Home · Discover · AI · Community · Account, with AI raised.
Search, the Bag and the Wishlist left the bar — they are actions and a list, not
destinations — and live in `AppHeader` and Account instead.

**The brand colour is pink, and it is not the reference image's pink.** That
matters enough to record the numbers:

| | White on fill | Verdict |
|---|---|---|
| `#E91E63` — the reference image | 4.35:1 | fails WCAG AA |
| `#EC4899` — a common hot pink | 3.53:1 | fails |
| `#D81B60` — **this app** | 4.95:1 | passes |
| `#DC2626` — the web app's red | 4.83:1 | passes |

`docs/design-system.md` records that the pink the web app's red replaced was
3.41:1 and failed. Picking the reference image's pink would have walked straight
back into that. `#D81B60` is visually the same pink and clears AA by a wider
margin than the red it replaces, so the brief's direction cost nothing. Anyone
tempted to nudge it brighter should re-run those numbers first.

`error` stays red: with pink as the brand colour, a pink error is
indistinguishable from a CTA, and "this failed" must never look like "press me".

### What the brief asks for that this app does not do

Not omissions — each is a claim the data cannot support, and all are specified in
`docs/API-GAPS.md` §8.

| Asked for | Why not |
|---|---|
| Star ratings on every card | There is no rating anywhere in the catalogue |
| Size and colour filters | `GET /api/products` takes neither parameter |
| Discount filter and sort | `discountPercent` is per offer, not stored on a product |
| "Trending Now" and "Price Drops" collections | No sort or filter answers either; relabelling `newest` as "trending" is the fiction PRD §69 forbids |
| "Price dropped ₹150" on the wishlist | `WishlistItem` has no previous price |
| "Why we picked this" per AI recommendation | The stylist returns one rationale for the set |
| A price range slider | A two-handle slider wants a native module Expo Go has not got. Price bands instead |
| Community feed | Server actions only — no endpoint React Native can call |

### Splash and onboarding

The launch sequence is native splash → animated splash → intro (first run only)
→ Home.

**Onboarding is a state, not a route.** The gate in `app/_layout.tsx` renders the
intro *instead of* the tab navigator. Redirecting with `router.replace` would
mount the tabs first and slide the intro over them, which flickers and leaves
Home in the back stack — press back on slide one and you are inside an app you
have not been introduced to. `app/onboarding.tsx` still exists as a route so the
intro can be replayed from Account and opened directly.

The flag is `hugfab.onboarding.seen.v1` in AsyncStorage, per install rather than
per account: the brief is explicit that nobody is asked to sign in before looking
around, and a server-side flag would need a session to read. Every storage call
is wrapped, and a failure degrades to showing the intro again rather than failing
the launch.

**The splash holds for a minimum beat** (`MIN_VISIBLE_MS`, 900ms) even when the
work behind it finishes sooner. Reading one storage key takes milliseconds, and a
splash that flashes for 20ms is worse than none — so this is a deliberate brand
moment, not a fake loader. Set it to `0` to remove it; nothing else depends on it.

**There is no HugFab artwork in this repo.** `assets/` holds the Expo template's
generic icons and nothing else — not the logo lockup, not photography. So:

- The splash and every intro slide take an optional `art` prop and draw the brand
  gradient or a tinted icon panel when none is given. Supplying real photography
  is a one-line change per slide.
- The wordmark is set in Poppins rather than drawn. `docs/design-system.md` says
  the lockup is `public/hugfab-logo.png` used exactly as supplied and never
  reconstructed in code, so type is the honest stand-in until that file is here.
- `app.json`'s native splash is a flat brand field with no image, because the
  alternative was showing the Expo template's mark for half a second on every
  launch. The app **icon is still the template's** and needs replacing before any
  release.

### Checkout, payment and order tracking

Still Phase 2, and the brief agrees with itself here: §19 says not to build a
fake HugFab checkout if the model is a redirect to the retailer. Today it is —
the whole catalogue is affiliate offers with a `clickPath`. Add Razorpay's native
SDK being unavailable in Expo Go, and the honest build is the one that exists:
the Bag hands off to the web checkout.

The screens in the reference (address, payment, confirmation, tracking) are drawn
for a model HugFab does not yet run for affiliate products. They arrive with the
dev build, alongside payments, and the UI is structured so both models fit.

---

## Status, as built

What has been verified, and what has not. The distinction matters: a container
cannot scan a QR code.

**Verified**

- `npx tsc --noEmit` and `npx eslint .` clean.
- `npx expo export --platform android` bundles (5.2MB Hermes bytecode) — so the
  module graph, Babel, NativeWind and Reanimated all wire up.
- Every route rendered in Chromium through the web target, with no console or page
  errors: home, search, wishlist, bag, account, product, offers, sign in, sign up.
  Tokens apply, the tab bar draws, and the error and sign-in states render.

**Not verified**

- Expo Go on a real Android device. This is the one gate that needs a phone.
- Anything behind a live API. The container cannot reach `hugfab.com`, so every
  screen was exercised against a failing request — which proves the error paths
  and proves nothing about the success paths. The first device run should be
  pointed at production and watched for shape mismatches.
- The write paths, which have no endpoint yet (`docs/API-GAPS.md`).

**Web is not a target.** `react-native-web` is not a dependency; it was installed
temporarily to run the render check above and removed afterwards. The `web` key in
`app.json` is what makes that check possible and nothing more.
