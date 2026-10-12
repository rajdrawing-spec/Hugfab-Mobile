# Production readiness

What is actually true as of **2026-10-12**, verified against the repositories
rather than carried over from `docs/PLAN.md`. Where a claim could be checked it
was checked, and the check is named.

The app cannot be called production-ready today, and the reason is no longer the
backend. #173 merged on 6 October, so every authenticated screen now has an
endpoint behind it. What remains is that **nothing in this container can talk to
the live API**, so not one success path has ever been exercised — and the cart
still has no contract a phone can use.

---

## 1. Verified current state

### The two repositories

| | Verified by | Result |
|---|---|---|
| `Hugfab-Mobile` branch | `git branch --show-current` | `claude/nifty-albattani-w29cp9` |
| Working tree | `git status --porcelain` | clean |
| Branch vs `origin/main` | `git rev-list --left-right --count` | **14 ahead, 0 behind** |
| PR #3 merged? | `pull_request_read` | **No.** Open, green, 0 reviews since 30 September. |
| #173 merged? | `git merge-base --is-ancestor` | **Yes**, 2026-10-06, as `2fbea5a` |
| Web `origin/main` now | `git log -1 origin/main` | `4b9111b` |

All seven of #173's route files are on web `main`, `bearerToken()` and
`createBearerSupabase()` are in `src/lib/supabase/server.ts`, and
`AccountSummary` carries `orderCount` and `wishlistCount`.

Web `main` has moved on since: it is `4b9111b`, and the move brought
`/api/account/addresses` with it — which this app now uses. See §2.

**This changes the project's shape.** Until 6 October the app had no
authenticated surface at all. It now has an endpoint behind every signed-in
screen. What has *not* been established is whether `main` is deployed, and no
request from this container can tell — see §3.

### Production API base URL

`https://hugfab.com` — 118 occurrences across the web repo, and the value in
`.env.example`. Sibling hosts exist (`images.`, `sellers.`, `admin.`, `live.`,
`community.`, `users.`, `analytics.`) but the app only needs the apex.

### What the API serves **today**

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
| `GET/POST /api/wishlist`, `DELETE /[productId]` | bearer | Wishlist |
| `GET /api/orders`, `GET /[orderId]` | bearer | Orders |
| `GET/POST /api/account/addresses` | bearer | Addresses |
| `PATCH/DELETE /api/account/addresses/[id]` | bearer | Addresses |
| `POST /api/account/addresses/[id]/default` | bearer | Addresses |

Routes that exist and this app deliberately does **not** call:

| Route | Why not |
|---|---|
| `GET /api/delivery/estimate` | Answers `unavailable` until a courier serviceability service is connected. A PIN box whose only possible answer today is "we cannot say" is a control for a feature that does not exist. |
| `GET /api/deals/for-you`, `/quote`, `/events` | Part of HUGFAB Deals, which is bound up with the cart decision in §6. |
| `GET /api/recently-viewed` | Needs the write side (`/api/views`) wired first, or it is permanently empty on a phone. |
| `/api/live/*`, `/api/shares`, `/api/plus/*` | Out of Phase 1 scope — `docs/PLAN.md`. |

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
| App icon | a generated placeholder, no longer the Expo template's — §4 |
| Tests in the mobile repo | 89 |
| `npx expo-doctor` | 19/21 pass; the 2 failures are this container's network, not the project |
| `npx expo export --platform android` | bundles, 5.3 MB Hermes bytecode |

---

## 2. Completed

- 17 routes, five-tab navigation, design token system, TanStack Query, the REST
  client, Supabase auth wiring, skeleton/empty/error states on every list.
- `src/api/client.ts` is the only `fetch` in the app: envelope unwrap, bearer
  attach, one 401 refresh-and-replay, `x-request-id` on every error, 15s timeout.
- Money is integer minor units end to end; no arithmetic in the app.
- #173 merged on 6 October, so bearer auth, wishlist, orders, order detail,
  addresses and the account counts are all live.
- `c423152` fixes a NativeWind bug that made `containerClassName` a no-op,
  which had the tab bar and the Filter/Sort row laid out wrongly on every screen.
- **The address book** (`1e8455a`): list, add, edit, delete, set default,
  against the routes that shipped on 6 October. `unavailable` is honoured as
  distinct from empty, and no address rule is reimplemented here — the form
  posts and renders the server's field errors.
- **Password recovery** (`5b9b73a`) and **sign out everywhere else** (`2c8ad07`).
  The first deliberately gives one answer for every outcome, so the screen
  cannot be used to discover who has an account.
- **Product tags** (`c289c69`) are drawn; they had been arriving and being
  discarded since #175.
- A **placeholder launcher icon** (`02ed9a3`) replaces the Expo template's.

## 3. Blocked

~~**#173 merging**~~ — merged 6 October. The blocker that gated everything else
is gone.

| Blocked on | What it stops |
|---|---|
| **Whether `main` is deployed** | Whether any of it is reachable yet. Merging is not deploying, and nothing here can check. |
| **Network policy denying `hugfab.com`** | All success-path verification. Every screen so far has only ever been exercised against a *failing* request. |
| **No Android device or emulator here** | `docs/DEVICE-QA.md` entirely. A container cannot scan a QR code. |
| **No Expo/EAS account or credentials** | Running a real build. Config can be written; a build cannot be produced. |
| **Cart architecture decision** | The Bag, and therefore checkout. See §6. |
| **PR #3 unreviewed** | Everything above is on that branch. It has been green with 0 reviews since 30 September. |

## 4. Broken or wrong

1. **`containerClassName` was a silent no-op.** Fixed in `c423152`, PR open,
   not yet merged. Tab bar and listing controls are mislaid until it lands.
1. **Field errors were typed as arrays.** `ApiError.fieldErrors` said
   `Record<string, string[]>`; the web app sends `Record<string, string>`. A
   form indexing `[0]` would have rendered the message's first *character*
   under the field. Fixed in `3d28f06`, before the address form became its
   first consumer.
2. ~~**No tests at all.**~~ Fixed: 66 unit tests over money, the error mapping,
   the API client and the link handling. `npm test`. They do not test the API —
   see §3 — and must never be cited as if they did.
3. ~~**No `versionCode`.**~~ Fixed by `eas.json` with `appVersionSource: remote`
   and `autoIncrement` on the production profile, so EAS owns the number and two
   builds cannot collide on it.
4. ~~**The app icon is the Expo template's.**~~ Replaced in `02ed9a3` with a
   generated H monogram in the brand pink, verified to sit inside Android's
   adaptive safe zone. **It is a placeholder, not a logo** — a store listing
   still wants real artwork, and that needs a designer, not code.
5. **The native splash is a background colour only.** `app.json` carries the
   legacy top-level `splash` key with no image, and `expo-splash-screen` is a
   dependency but not a config plugin. The app draws its own branded splash
   after launch, so this is cosmetic rather than broken — but it should be
   confirmed on a real build, since the legacy key's handling has moved between
   SDK versions.

## 5. Needs backend work

Ordered by what unblocks the most.

1. ~~**Merge #173.**~~ Done, 6 October.
2. **A cart contract for a client with no cookie jar** — see §6. The only
   remaining backend blocker for a complete shopping flow.
3. A **sessions endpoint**, if a device list is ever wanted beside "sign out
   everywhere else". Supabase does not expose its sessions through the client
   SDK, so the app can revoke the others but cannot name them.
4. **Courier serviceability**, which `GET /api/delivery/estimate` is waiting on
   before it can answer anything but `unavailable`.
5. Everything in `docs/API-GAPS.md` §8: ratings, size/colour/discount filters,
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

1. **Merge PR #3.** Fourteen commits, green, unreviewed since 30 September.
   Everything below is blocked behind it.
2. **Deploy web `main`** (`4b9111b`) if it is not already.
3. **Widen the network policy**, or run the verification from a machine that can
   reach `hugfab.com`.
4. **Verify the success paths** endpoint by endpoint against real data — the
   response shapes, not just the status codes. A field-name mismatch looks
   exactly like what has been seen so far, and `src/api/types.ts` is mirrored by
   hand.
5. **Run `docs/DEVICE-QA.md` on a real Android phone.**
6. **Decide the cart question**, then build the contract in §6.
7. **Configure EAS and build an AAB.**
8. **Real icon artwork, Play Store assets and declarations.**

Step 1 is the whole critical path. Steps 4 and 5 are the two that cannot be done
from this container at all, and together they are the only thing standing
between "every screen renders" and "this app works".

---

## What this document is not

It is not a claim that the app works. Every screen in it has been rendered, and
none of them has ever received a successful response from the real API. That
distinction is the single most important thing on this page, and nothing added
since 30 September has changed it — the address book, password recovery and the
rest are written and tested, not proven.

`docs/DEVICE-QA.md` is the list of what proving them would involve.
