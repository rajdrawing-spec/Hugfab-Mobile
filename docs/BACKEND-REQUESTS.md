# What the app needs from HUGFAB-AI

Every change below is in **HUGFAB-AI**, not here. Each is numbered so it can be
approved or refused on its own. Nothing in this document has been built.

**Audited against HUGFAB-AI `main` at `1961413` on 19 October 2026**, read from
source rather than from memory of it. The web app has moved a long way since
this app's last audit (`4b9111b` → `1961413`), and one of those moves changes
the shape of the cart decision — §0.

The constraint this was written under: **no existing backend logic changes.**
Every request below is additive — a new route, or one new query. Where
something cannot be done without touching existing behaviour, it says so in as
many words rather than quietly proposing it.

---

## 0. The finding that changes the cart decision

`docs/API-GAPS.md` §3 ends with "Checkout: out of scope for Phase 1 either way.
Razorpay's SDK is native and the app runs in Expo Go, so the Bag's checkout
button opens `https://hugfab.com/cart`."

**That is more pessimistic than the code requires.** Reading
`src/app/(shop)/checkout/[orderId]/page.tsx` and `pay-button.tsx` on `main`:

- The payment page is reachable **by order id alone** — a uuid, explicitly
  designed so a guest with no account can find their order. No session, no
  cookie.
- Payment is taken by **Razorpay's web checkout script in the browser**, not by
  a native SDK.
- The page **reconciles payment itself** if the webhook is late
  (`reconcileOrderPayment`, added in `12a77ed`), so a shopper who pays and
  closes the browser still ends up with a paid order.

So the app does not need the native Razorpay SDK, and it does not need to send
the whole Bag to the website. It can keep the cart and the address step native,
place the order over HTTP, and hand off **only the payment step**:

```
app: POST /api/checkout  →  { orderId, orderNumber, payable }
app: WebBrowser.openBrowserAsync('https://hugfab.com/checkout/<orderId>')
     → the existing page, the existing Razorpay flow, the existing reconcile
app: on return, GET /api/orders/<orderId> to show what actually happened
```

This is why the recommendation below is now firmer than it was on 30 September.
It removes payment from the mobile scope entirely while still giving the shopper
a native Bag.

---

## 1. Cart — the decision, and the smallest change that implements it

### What exists today (verified, not assumed)

| | |
|---|---|
| Identity | `hugfab_cart`, an httpOnly cookie, 30 days. Never accepted from a request body — a deliberate refusal, documented in `service.ts`. |
| Storage | `carts` / `cart_items`. **`carts.user_id` already exists and is already written**: `createCart(userId)` on first write, `claimCart(cartId, userId)` when a guest signs in. |
| Access | `repository.ts` runs everything through `createAdminSupabase()` — the service role. **`carts` has no RLS policy at all**, by design, because a guest cart has no `auth.uid()` to match. |
| Money | `create_order_from_cart` totals in the database from `prices`. Nothing a client sends is ever priced. |
| Bundles | A HUGFAB Deal in the bag is several `cart_items` rows sharing a `cartDealId`, each one unit at its share of the deal price (`CartDeal`, `isBundleLine`). |

The important structural fact: **`repository.ts` is already keyed by `cartId`,
and `service.ts` is only the layer that turns a cookie into one.** Nothing about
the cart's logic is cookie-shaped. A mobile cart needs a different way to find
the id, and nothing else.

### Recommendation: option A, signed-in carts

Of the three options in `docs/API-GAPS.md` §3 — (A) signed-in only, (B) a signed
guest-cart token, (C) no mobile cart — **A**, unchanged from the earlier audit
and now cheaper because of §0.

B means accepting a cart identifier from a request body, which is the precise
thing `service.ts` refuses and gives a security reason for. It needs a new
signed token, rotation, and verification: a real piece of security work to
support guest carts on a surface where "sign in to use your bag" is an ordinary
expectation. Worth revisiting if guest-cart conversion data later says so.

C is the status quo and wastes the native Bag that already exists in this app.

### R1 — one new repository function

```ts
// src/modules/cart/repository.ts
export async function findCartForUser(userId: string): Promise<string | null>
```

A single `select id from carts where user_id = $1 order by created_at desc
limit 1`. No new logic, no new table, no change to any existing function.

If a user ends up with more than one cart row — possible today, because a guest
cart is claimed on sign-in and the shopper may already have had one — **the
newest wins and the older is left alone.** Merging two carts is a product
decision, not a technical one, and it is not needed for the app to work. Flagged
rather than decided: see "Decisions I cannot make for you" below.

### R2 — a thin service entry point that does not read the cookie

```ts
// src/modules/cart/service.ts
export async function getCartForUser(userId: string): Promise<Cart>
export async function addItemForUser(userId, variantId, quantity): Promise<CartOutcome>
export async function setQuantityForUser(userId, itemId, quantity): Promise<CartOutcome>
export async function addDealUnitsForUser(userId, dealId, …): Promise<CartOutcome>
export async function removeDealUnitsForUser(userId, cartDealId): Promise<CartOutcome>
export async function placeOrderForUser(userId, input): Promise<CheckoutOutcome>
```

Each one resolves the cart id with R1 (creating one on first write, exactly as
`resolveCartIdForWrite` does) and then calls **the same repository functions the
web calls**. The existing cookie functions are untouched, so the website behaves
identically.

**The security rule, stated once and applying to all of them:** the cart id is
never accepted from the request. It is derived from `requireApiUser()`. That
keeps the property `repository.ts` documents — "a caller that passed a cart id
from a request body would be letting a stranger read a stranger's cart" — on the
mobile path too.

### R3 — the routes

House pattern throughout: `handle()`, `requireApiUser()`, `ok()`, `ApiError`,
`RATE_LIMITS.write` on mutations, `Cache-Control: private, no-store` — the same
as `src/app/api/wishlist/route.ts`.

| Route | Body | Returns |
|---|---|---|
| `GET /api/cart` | — | the whole `Cart` |
| `POST /api/cart/items` | `{ variantId, quantity }` | the whole new `Cart` |
| `PATCH /api/cart/items/:itemId` | `{ quantity }` (0 removes) | the whole new `Cart` |
| `DELETE /api/cart/items/:itemId` | — | the whole new `Cart` |
| `POST /api/cart/deals` | `{ dealId, … }` | the whole new `Cart` |
| `DELETE /api/cart/deals/:cartDealId` | — | the whole new `Cart` |
| `POST /api/checkout` | `checkoutSchema` as it stands | `{ orderId, orderNumber, payable, payUrl }` |

Every mutation returns the **whole cart** rather than `{ ok: true }`, so the Bag
badge and the totals update in one round trip and the server remains the only
thing that computed either.

`GET /api/cart` must include `deals[]` and each line's `cartDealId`, or the app
renders a bundle's units as unrelated items at prices that look wrong alone.

`payUrl` is `${SITE_URL}/checkout/${orderId}` — the page from §0. Returning it
from the server rather than building it in the app means the hand-off survives a
change of domain.

Money crosses the wire as `{ amountMinor, currency }`, composed in the route
exactly as `toWire` does in the wishlist route.

### What R1–R3 explicitly do not touch

- No pricing, discount, stock or availability logic.
- No RLS policy, on `carts` or anything else. The route is the trust boundary,
  as it already is for the web.
- No change to the cookie path: the website's guest cart works exactly as now.
- No service-role key anywhere near the app. It stays server-side.
- No schema change.

---

## 2. Account deletion — required, and it cannot be done without backend work

### Why it is not optional

- **Apple**, guideline 5.1.1(v): an app that supports account creation must let
  people **initiate deletion from inside the app**. Pointing at an email address
  or a support flow is explicitly insufficient outside regulated industries.
- **Google Play**: an in-app path **and** a publicly reachable web URL for
  requesting deletion, which is entered in the Data safety form and shown on the
  store listing.

Both are submission blockers, not warnings.

### Current state

There is no deletion path anywhere in HUGFAB-AI — no route, no service, no
admin action. `src/app/(marketing)/privacy/page.tsx` says so plainly: *"There is
no self-service delete button in your account settings yet."* It directs people
to email instead. That is honest, and it is also the thing the stores reject.

### R4 — the deletion path

This one genuinely cannot be additive-only, because deletion has to decide what
happens to rows that already exist.

- `POST /api/account/delete` — `requireApiUser()`, re-authentication or an
  explicit typed confirmation, rate-limited.
- A web page at `/account/delete` for Google's required URL. It can be the same
  service behind a form.
- Deletion runs **server-side with the service role**: `auth.admin.deleteUser`
  cannot be called with the anon key, so this can never be done from the app.
- Sessions revoked, so the phone and every other device sign out.

### The part that is a decision, not an implementation

The privacy policy already describes the intended behaviour, and it is
**anonymise, not erase**: *"Click records are kept as a commercial record …
when the account is deleted, leaving a record that identifies nobody."* Orders
have to be kept for tax and for the seller's own records.

So deletion means, concretely: remove the auth user and the profile; detach or
anonymise `orders.user_id`, click records, reviews, community posts, wishlist
and addresses. **Which of those is anonymised and which is removed is your
call**, and `COMPANY.MISSING` in the web repo already lists `retentionPeriods`
as a known blank on the published legal pages. Deciding it here would also fill
that blank.

---

## 3. Homepage endpoint — wanted, not blocking

### R5 — `GET /api/homepage`

Read-only, public, cacheable. Wraps what `src/app/page.tsx` already composes:
`getHomepageSections()` and `loadSectionProducts()` from
`modules/merchandising/service`, plus `getActiveAds()` from
`modules/ads/storefront`.

No new logic — the rows are already data, arranged by your admins at
`/admin/homepage`. Without this the app's Home is a hardcoded arrangement that
silently diverges from the website every time somebody changes a row.

---

## 4. Optional: ratings, notifications, Community

In all three cases **the service layer is complete and only HTTP is missing**,
so each is a route file over an existing function.

| Request | Route | Existing service |
|---|---|---|
| R6 | `GET /api/products/:slug/reviews`, `POST /api/reviews` | `modules/reviews/service` — `getProductReviews`, `submitReview` (8 exported functions, moderation included) |
| R7 | `GET /api/account/notifications` | `modules/account/notifications` — `buildNotifications` |
| R8 | `GET /api/community/feed`, `POST /api/community/posts` | `modules/community/service` — `discoverFeed`, `compose` (24 exported functions) |

R6 is the one with visible product impact: the mobile brief puts a rating on
every product card, and the app cannot show one today.

---

## 5. Store listing — what needs no backend at all

| Item | State |
|---|---|
| Privacy policy URL | **Exists**: `https://hugfab.com/privacy`. Usable as-is for both stores. |
| Support email | Not hardcoded — your admins set it at **Admin → Settings → Contact details** (`modules/contact`). Supply the live value; it must not be invented. |
| Account-deletion URL | Does not exist yet. Comes with R4. |
| Data safety / App Privacy forms | Can be drafted now from what the app actually does — see below. |
| Screenshots | Can be produced from the app once it has real data on a device. |
| Description | Can be drafted from the website's own copy. |

### What the forms will have to declare, from this app's actual behaviour

Collected and linked to identity: **email** (sign-in), **name, phone and postal
address** (delivery, via `/api/account/addresses`), **purchase history**
(orders). Transmitted to `hugfab.com` over HTTPS and to the Supabase project for
authentication only. Stored on the device: the session token, in AsyncStorage
today (`expo-secure-store` is the hardening step in `docs/PLAN.md`).

No advertising SDK, no analytics SDK, no location, no contacts, no camera — the
search bar's camera affordance in the brief is not built. If any of that changes,
the form answer changes with it, which is why this list is worth keeping beside
the code.

**Known blanks on the published legal pages** (`COMPANY.MISSING` in the web
repo), which the Play listing will also want: Grievance Officer's name and
designation, the registered office's street line and PIN, the CIN, the Supabase
region, and retention periods.

---

## Decisions I cannot make for you

1. **Cart option A, B or C.** A is recommended; it is the only one needing no new
   security primitive.
2. **Two carts, one user.** If a signed-in shopper has both a claimed guest cart
   and an older one, does the newest win (proposed), or do they merge?
3. **What deletion keeps.** Which rows are anonymised and which are removed, and
   the retention periods — which also fills a blank on the live privacy page.
4. **Whether R6–R8 are in scope** for the first release, or come after.

## Approval checklist

| | Change | Repo | Blocking a release? |
|---|---|---|---|
| R1 | `findCartForUser` query | HUGFAB-AI | **Approved and built** — `claude/mobile-cart-option-a` |
| R2 | User-keyed cart service entry points | HUGFAB-AI | **Approved and built** — `src/modules/cart/api.ts` |
| R3 | Cart + checkout routes | HUGFAB-AI | **Approved and built**, awaiting review and deploy |
| R4 | Account deletion, in-app and web | HUGFAB-AI | **Built** — one migration awaits your approval, below |
| R5 | `GET /api/homepage` | HUGFAB-AI | No |
| R6 | Reviews over HTTP | HUGFAB-AI | No |
| R7 | Notifications over HTTP | HUGFAB-AI | No |
| R8 | Community over HTTP | HUGFAB-AI | No |

R1–R3 were approved on 19 October and built the same day, on HUGFAB-AI's
`claude/mobile-cart-option-a`. `service.ts` was not edited, so the website's
cookie cart is untouched; the branch adds one query, one user-keyed module and
six routes, and `docs/api.md` there documents the contract. 2969 tests pass.

The app's side is built too: `src/api/cart.ts`, a Bag that groups a bundle's
units under their deal, and `app/checkout.tsx`, which picks a saved address,
places the order and opens `payUrl` for the payment step only.

**Neither half has met the other.** The branch is not merged or deployed, and
no request has been made against the real routes. That is `docs/DEVICE-QA.md`'s
job once it is live.

R4 was built on 19 October, on the same branch, with the web page Google
requires and the in-app path Apple requires behind one service. Reading the
foreign keys first changed the design and turned up one thing the proposal had
not: **seven columns are `on delete restrict` and `not null`, so Postgres
refuses the delete outright.** Six belong to sellers and admins. The seventh,
`plus_payments.user_id`, belongs to any shopper who ever bought HugFab Plus —
they cannot be deleted at all.

`supabase/migrations/20261019090000_plus_payments_anonymise_on_delete.sql`
fixes that the way `orders` already works: the payment is kept, without a name.
**It is written and not applied — it needs your approval**, since it was not in
the proposal you approved. Until then that case answers honestly rather than
appearing to work. HUGFAB-AI's `docs/account-deletion.md` has the detail.

Three consequences of the cascades are worth a decision rather than a
discovery, and are listed there too: reviews and community posts are **deleted
rather than anonymised**, and the points and wallet ledgers go with them.

Still open: two carts for one user (the newest wins today), the `plus_payments`
migration, whether the cascade behaviour above is what you want, and whether
R6–R8 are in this release.
