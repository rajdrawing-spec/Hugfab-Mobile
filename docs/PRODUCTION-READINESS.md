# Production readiness

What is actually true as of **2026-09-30**, verified against the repositories
rather than carried over from `docs/PLAN.md`. Where a claim could be checked it
was checked, and the check is named.

The app cannot be called production-ready today, and the reason is not the app:
**no authenticated surface can work until HUGFAB-AI#173 merges**, and nothing in
this container can talk to the live API to prove the success paths.

---

## 1. Verified current state

### The two repositories

| | Verified by | Result |
|---|---|---|
| `Hugfab-Mobile` branch | `git branch --show-current` | `claude/nifty-albattani-w29cp9` |
| Working tree | `git status --porcelain` | clean |
| Branch vs `origin/main` | `git rev-list --left-right --count` | **1 ahead, 0 behind** |
| `c423152` merged? | same | **No.** It is that one commit. |
| `HUGFAB-AI` branch | `git branch --show-current` | `feature/mobile-api` |
| #173 merged? | `git merge-base --is-ancestor` | **No.** |
| #173 mergeable? | `git merge-tree --write-tree` | Yes, exit 0, zero conflicts |

`origin/main` on the web app is `b92e7a9`; #173's head is `1361c6b`.

### Production API base URL

`https://hugfab.com` — 118 occurrences across the web repo, and the value in
`.env.example`. Sibling hosts exist (`images.`, `sellers.`, `admin.`, `live.`,
`community.`, `users.`, `analytics.`) but the app only needs the apex.

### What the API serves **today**, without #173

From `git ls-tree origin/main` over `src/app/api/**/route.ts`:

| Route | Auth | The app uses it |
|---|---|---|
| `GET /api/products` | public | Home, Discover, Search |
| `GET /api/products/[slug]` | public | Product detail |
| `GET /api/search` | public | Search |
| `GET /api/affiliate/click` | public | Every Buy button |
| `POST /api/stylist` | **cookie session** | AI Stylist |
| `GET /api/account/summary` | **cookie session** | Account |
| `GET /api/merchant/attention` | **cookie session** | Console |
| `GET /api/admin/attention` | **cookie session** | Console |

Wishlist, orders and addresses have no route on `main` at all.

### The finding that matters most

The web app authenticates with **cookies**. React Native has no cookie jar. So
without #173 it is not only the four new endpoints that fail — **`stylist`,
`account/summary` and both console endpoints fail too**, because there is no way
for the phone to present an identity at all.

Scope of the dependency, corrected:

- **Works today:** catalogue browse, search, product detail, offer comparison,
  affiliate click-out. All public, all signed-out.
- **Cannot work at all until #173:** sign-in having any effect, AI Stylist,
  Account, Wishlist, Orders, Addresses, the seller/admin console.

`docs/PLAN.md` and the earlier build report described #173 as the dependency for
"the authenticated account surfaces". That was too narrow: it is the dependency
for *every* authenticated call the app makes.

### Environment

| | State |
|---|---|
| `hugfab.com` reachable from this container | **No** — the network policy answers 403 to CONNECT |
| `.env.local` | absent (correct; git-ignored) |
| `eas.json` | present (added 2026-09-30) |
| Android `versionCode` | managed remotely by EAS (`appVersionSource: remote`) |
| App icon | still the Expo template's |
| Tests in the mobile repo | 66, added 2026-09-30 |
| `npx expo-doctor` | 19/21 pass; the 2 failures are this container's network, not the project |
| `npx expo export --platform android` | bundles, 5.3 MB Hermes bytecode |

---

## 2. Completed

- 17 routes, five-tab navigation, design token system, TanStack Query, the REST
  client, Supabase auth wiring, skeleton/empty/error states on every list.
- `src/api/client.ts` is the only `fetch` in the app: envelope unwrap, bearer
  attach, one 401 refresh-and-replay, `x-request-id` on every error, 15s timeout.
- Money is integer minor units end to end; no arithmetic in the app.
- #173 is written, green on repo CI, mergeable, and re-verified against the
  moved base (PR #174, catalogue switches): no file overlap, no new API routes,
  and `/api/conversions` — the one route with its own Bearer scheme — uses
  `createAdminSupabase`, so #173's bearer routing cannot reach it.
- `c423152` fixes a NativeWind bug that made `containerClassName` a no-op,
  which had the tab bar and the Filter/Sort row laid out wrongly on every screen.

## 3. Blocked

| Blocked on | What it stops |
|---|---|
| **#173 merging** | Every authenticated screen. Nothing else unblocks them. |
| **Network policy denying `hugfab.com`** | All success-path verification. Every screen so far has only ever been exercised against a *failing* request. |
| **No Android device or emulator here** | Phase 16 entirely. A container cannot scan a QR code. |
| **No Expo/EAS account or credentials** | Running a real build. Config can be written; a build cannot be produced. |
| **Cart architecture decision** | The Bag, and therefore checkout. See §6. |

## 4. Broken or wrong

1. **`containerClassName` was a silent no-op.** Fixed in `c423152`, PR open,
   not yet merged. Tab bar and listing controls are mislaid until it lands.
2. ~~**No tests at all.**~~ Fixed: 66 unit tests over money, the error mapping,
   the API client and the link handling. `npm test`. They do not test the API —
   see §3 — and must never be cited as if they did.
3. ~~**No `versionCode`.**~~ Fixed by `eas.json` with `appVersionSource: remote`
   and `autoIncrement` on the production profile, so EAS owns the number and two
   builds cannot collide on it.
4. **The app icon is the Expo template's**, as is the adaptive-icon foreground.
   This is a hard blocker for a store submission and needs artwork, not code.
5. **The native splash is a background colour only.** `app.json` carries the
   legacy top-level `splash` key with no image, and `expo-splash-screen` is a
   dependency but not a config plugin. The app draws its own branded splash
   after launch, so this is cosmetic rather than broken — but it should be
   confirmed on a real build, since the legacy key's handling has moved between
   SDK versions.

## 5. Needs backend work

Ordered by what unblocks the most.

1. **Merge #173.** Bearer auth plus wishlist, orders, order detail, addresses,
   account summary counts.
2. **A cart contract for a client with no cookie jar** — see §6.
3. Everything in `docs/API-GAPS.md` §8: ratings, size/colour/discount filters,
   price drops, trending, `previousPrice` on a wishlist item, price alerts,
   community read and write, stylist rationale, notifications.

## 6. Needs a product decision

**The cart, and it is a real architectural problem rather than a missing
endpoint.**

Verified in `src/modules/cart/service.ts` and `repository.ts` on `main`:

- A cart is identified by `hugfab_cart`, an **httpOnly cookie**, 30-day max-age.
  The id is never accepted from a request body — the comment is explicit that
  doing so "would let anyone read anyone's cart by guessing".
- `carts` therefore **has no RLS policy at all**. There is no `auth.uid()` to
  match against, so every read and write runs server-side through
  `createAdminSupabase()` — the service-role key.
- A guest cart is claimed on sign-in: `claimCart(cartId, userId)` sets `user_id`
  where it `is null`.
- Reads never create a cart; Next.js cannot set a cookie during render, so the
  cart is created on the first *write*.
- **Checkout is HugFab's own, through Razorpay** — `placeOrder`, `startPayment`,
  `createRazorpayOrder`. It is not affiliate-only.

Three of those four facts are incompatible with a mobile client as it stands: no
cookie jar, no service-role key, and no RLS policy that a bearer token could
satisfy. This cannot be closed by writing a mobile screen. The decision needed
is named in `docs/API-GAPS.md` §3.

## 7. Needs production configuration

- `EXPO_PUBLIC_API_BASE_URL=https://hugfab.com` in the build profile.
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the anon key
  only. `SUPABASE_SERVICE_ROLE_KEY` must never be present; anything in an APK is
  readable.
- ~~`eas.json` with development / preview / production profiles.~~ Added.
  `EXPO_PUBLIC_API_BASE_URL` is set per profile; the two Supabase values are
  deliberately **not** committed there. The anon key is public by construction
  — it is inlined into the bundle — but holding it as an EAS environment
  variable lets it rotate without a commit. Set it with `eas env:create`.
- An Android signing keystore held by EAS (`eas credentials`).
- App icon, adaptive icon, splash artwork, feature graphic, screenshots.
- Privacy policy and data-safety declarations for the Play listing.
- Widen the container's network policy to reach `hugfab.com`, or accept that no
  success path can be verified from here.

## 8. Recommended execution order

1. **Merge PR #3** (`c423152`). Small, verified, fixes layout everywhere.
2. **Review and merge HUGFAB-AI#173.** Nothing authenticated moves until it does.
3. **Deploy #173** to staging or production.
4. **Widen the network policy**, or run the verification from a machine that can
   reach `hugfab.com`.
5. **Verify the success paths** endpoint by endpoint against real data — the
   response shapes, not just the status codes. A field-name mismatch looks
   exactly like what has been seen so far.
6. **Decide the cart question**, then build the contract in §6.
7. **Run on a real Android device**; record results in `docs/DEVICE-QA.md`.
8. **Configure EAS and build an AAB.**
9. **Play Store assets and declarations.**

Steps 1 and 2 are the whole critical path. Steps 5 and 7 are the two that cannot
be done from this container at all.

---

## What this document is not

It is not a claim that the app works. Every screen in it has been rendered, and
none of them has ever received a successful response from the real API. That
distinction is the single most important thing on this page.
