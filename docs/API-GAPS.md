# API gaps in HUGFAB-AI

What the mobile app needs from `rajdrawing-spec/HUGFAB-AI` and does not have.

## Status

**§1, §2, §4, §5 and §6 are written but NOT MERGED.** They live on
`feature/mobile-api` in HUGFAB-AI as pull request #173, which is green on CI,
mergeable, and has had no review since it opened. Bearer authentication, the
wishlist, orders and the address book are routes there; `GET /api/account/summary`
carries `orderCount` and `wishlistCount`. That branch passes the repo's full CI
suite (lint, format, typecheck, 2,149 tests, build) and documents every route in
its own `docs/api.md`.

**Until #173 merges, the app has no authenticated surface at all.** Not just the
four new endpoints: the web app authenticates with cookies, and a phone has no
cookie jar, so `POST /api/stylist`, `GET /api/account/summary` and both console
endpoints fail too. Only the public catalogue works — products, search, product
detail and the affiliate click-out. See `docs/PRODUCTION-READINESS.md`.

The sections below are kept as written, because they are the argument for each
route and the place to look when one behaves unexpectedly. Two of them turned out
to be wrong against the real code, and both are corrected in place:

- **Tracking is per shipment, not per line** (§5). One order can ship in several
  parcels from several merchants, so the courier and the AWB belong to a
  shipment and `itemIds` says which lines were in it.
- **The orders service redirects when signed out** (§5). `getMyOrders()` guards
  itself with `requireUser()`, a page guard, so a route must establish its own
  401 with `requireApiUser()` first.

**Still outstanding: §3 (cart), §7 (homepage) and all of §8.** §3 is now
documented against the real web implementation and needs a decision between three
named options before any code — see below. §8 is mostly schema work, and ratings
in particular is a product question rather than an endpoint.

---

Why these gaps exist: the web app performs its writes with **Next.js server
actions** — 55 files of them. A server action is a POST to an opaque, per-build
action id, authenticated by cookie. React Native cannot call one, and should not:
the action id changes every deploy. So every mutation the app needs has to exist
as a documented route as well.

The work is small because it has already been done once. `docs/architecture.md`
§2.1 forbids logic in a route handler, so every service below is already written,
tested, and called by a server action. Each route is a ~20-line adapter:
authorise, validate, call the service, return the envelope.

Conventions every item assumes — from `docs/api.md`:

- Success `{ "data": … }`, failure `{ "error": { "code", "message", "details"? } }`.
- Money as `{ "amountMinor": integer, "currency": "INR" }`.
- Codes `BAD_REQUEST` `UNAUTHORIZED` `FORBIDDEN` `NOT_FOUND` `CONFLICT`
  `UNPROCESSABLE` `RATE_LIMITED` `NOT_CONFIGURED` `INTERNAL`.
- `x-request-id` on every response.
- Writes go through `requireApiUser()` and spend the `write` budget (30/min).

---

## 1. Bearer-token authentication — BUILT

**The whole gap in one sentence:** `createServerSupabase()` builds its client from
`cookies()` (`src/lib/supabase/server.ts`), so a request carrying
`Authorization: Bearer <jwt>` is anonymous no matter how valid the token is.

`getCurrentUser()` (`src/lib/auth.ts`) calls `supabase.auth.getUser()`, which is
already the right call — it revalidates against the auth server rather than
trusting a decoded claim. It just never sees the token.

Suggested shape, additive — the cookie path is untouched:

```ts
// src/lib/supabase/server.ts
/**
 * The access token on this request, when it arrived as a Bearer header rather
 * than a cookie: a native client. Returns null for a browser.
 */
export async function bearerToken(): Promise<string | null> {
  const header = (await headers()).get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Request-scoped client for a native caller. No cookies: there is no session to
 * refresh here — the app holds the refresh token and renews it against Supabase
 * directly, so this client is read-only with respect to the session.
 */
export function createBearerSupabase(token: string) { /* createClient + global headers */ }
```

Then `createServerSupabase()` returns the bearer client when a bearer token is
present and the cookie client otherwise, and **every route and service below
works unchanged**, including `requireApiUser()` and the `profiles` role read.

Three things worth stating because getting them wrong is silent:

- Still `getUser()`, never `getSession()`, and never a hand-decoded JWT. A forged
  token must fail, and only revalidation makes it fail.
- The role keeps coming from `profiles` on every call (`readRole()`), never from a
  JWT claim the holder could influence. `src/lib/auth.ts` already says this.
- A bearer request must not write auth cookies. `setAll()` should be a no-op on
  that path, or a native call will set a cookie nobody reads.

**Rate limiting:** `src/lib/ratelimit.ts` keys signed-in callers by user id, which
is already correct for mobile. Anonymous mobile reads key by IP — a mobile network
NATs thousands of handsets behind one address, so the `search` budget (60/min) may
need a separate mobile budget once there is traffic. Not a Phase 1 blocker; worth
knowing before the first store release.

---

## 2. Wishlist — BUILT

Service: `src/modules/wishlist/service.ts` — `myWishlist()`, `addToWishlist()`,
`removeFromWishlist()`. All three exist and are used by `(shop)/wishlist/actions.ts`.

### `GET /api/wishlist`

`requireApiUser()`. `Cache-Control: private, no-store`.

```jsonc
{ "data": { "items": [{
  "id": "…", "productId": "…", "slug": "club-oversized-hoodie",
  "title": "Club Oversized Hoodie", "imageUrl": "https://…",
  "price": { "amountMinor": 189900, "currency": "INR" },
  "inStock": true,
  "target": { "amountMinor": 150000, "currency": "INR" },
  "savedAt": "2026-09-20T10:00:00.000Z"
}] } }
```

`price` is null when the product has no offer; `target` is null without a price
alert. `WishlistItem` carries `priceMinor` + `currency` as separate fields; the
route should compose them into the documented `Money` shape rather than leaking
the internal pair, as `/api/products` already does.

### `POST /api/wishlist`

Body `{ "productId": "<uuid>" }` — `201 { "data": { "saved": true } }`.
`CONFLICT` when already saved, or make it idempotent and return `200` — either is
fine, but say which in `docs/api.md`, because the app's optimistic update needs to
know.

### `DELETE /api/wishlist/:productId`

`200 { "data": { "saved": false } }`. `NOT_FOUND` when it was not saved.

---

## 3. Cart — NOT BUILT: needs a product decision first

**Verified against `main`** (`src/modules/cart/service.ts`, `repository.ts`) on
2026-09-30, not inferred. The web cart's architecture is incompatible with a
mobile client in three separate ways, and no amount of mobile code closes that.

### How the web cart actually works

| Question | Answer, from the code |
|---|---|
| 1. Can anonymous users have a cart? | **Yes.** It is the deliberate design: "a shopper must be able to fill a cart before deciding whether to have an account". |
| 2. Is the cart authenticated? | **No.** Identity is the cart id itself. |
| 3. Persisted server-side? | Yes, in `carts` / `cart_items`. |
| 4. Tied to a user? | Only after sign-in. `carts.user_id` is nullable. |
| 5. Guest cart / session id? | `hugfab_cart`, an **httpOnly cookie**, 30-day max-age, `sameSite: lax`. Never accepted from a request body — the comment says taking it from a form field "would let anyone read anyone's cart by guessing". |
| 6. Guest → authenticated merge? | `claimCart(cartId, userId)` sets `user_id` where it `is null`. The guest cart becomes the user's; nothing is merged line by line. |
| 7. Unavailable products? | Server-side. The line stays, `available: false`, `unitPrice` and `lineTotal` null, excluded from the totals, counted in `unavailable`. |
| 8. Quantity limits? | Server-side, against stock and holds the client cannot see. `CartOutcome` carries the refusal sentence. |
| 9. Where is the total calculated? | In the database, from `prices`. Never from anything a client sent. |
| 10. How does checkout receive it? | `placeOrder()` reads the cookie, then `startPayment()` → **`createRazorpayOrder`**. Checkout is HugFab's own, through Razorpay. |

**Point 10 corrects an assumption the app currently embodies.** The catalogue is
affiliate offers with a `clickPath`, but HugFab also has its own marketplace
checkout that takes payment. The Bag is not merely a hand-off to a retailer.

### Why the app cannot simply call it

1. **No cookie jar.** The cart id lives in an httpOnly cookie the phone cannot
   hold or send.
2. **No RLS policy to satisfy.** `carts` has *none* — there is no `auth.uid()`
   for a policy to match against, because a guest cart has no user. Every read
   and write runs through `createAdminSupabase()`, the service role, server-side.
   A bearer-authenticated Supabase client from the app would be refused by
   deny-all, and the service-role key must never ship in an APK.
3. **The id cannot be passed.** The one obvious mobile fix — send the cart id in
   a header or body — is exactly what the web code refuses to do, for a stated
   security reason that applies identically on mobile.

### The decision to make

Three options. The app is already built to display whichever is chosen.

**A. Signed-in carts only.** `GET/POST/PATCH /api/cart*` key on
`requireApiUser()`; the route resolves `user_id` → cart server-side and never
touches a cookie. Smallest change, no schema work, no new security surface.
Cost: a mobile shopper must sign in before adding to the Bag, which is the
sign-up wall the web design exists to avoid.

**B. An opaque guest-cart token.** The API mints a signed, random cart token on
first write and returns it; the app stores it in `AsyncStorage` and sends it as
`X-Cart-Token`. On sign-in the app presents both and the server runs the
existing `claimCart`. Preserves anonymous carts. Cost: a new token, its
signing/rotation, and a body-supplied cart identifier — the thing the web code
deliberately refuses. It is only safe if the token is unguessable and verified,
which is a real piece of backend work rather than a parameter change.

**C. Do not ship a mobile cart in Phase 1.** The Bag opens
`https://hugfab.com/cart` in the in-app browser. Honest, zero backend work, and
the shopper signs in again in that browser — the seam the app already names.

**Recommended: A.** It is the only one that needs no new security primitive, and
"sign in to use your bag" is a normal mobile expectation where "sign in to
browse" is not. B is worth doing later if guest-cart conversion proves it.

### The contract, if A is chosen

All three routes `requireApiUser()`, `private, no-store`, `RATE_LIMITS.write` on
the mutations.

#### `GET /api/cart`

Returns `Cart` as `src/modules/cart/types.ts` defines it, minor-unit pairs
composed into `Money`:

```jsonc
{ "data": {
  "lines": [{
    "itemId": "…", "variantId": "…", "productId": "…",
    "title": "…", "slug": "…", "size": "M", "color": "Black",
    "imageUrl": "https://…", "quantity": 2,
    "unitPrice": { "amountMinor": 189900, "currency": "INR" },
    "lineTotal": { "amountMinor": 379800, "currency": "INR" },
    "available": true, "stock": 4
  }],
  "subtotal": { "amountMinor": 379800, "currency": "INR" },
  "mrpTotal": { "amountMinor": 599800, "currency": "INR" },
  "itemCount": 2, "lineCount": 1, "unavailable": 0
} }
```

`unitPrice` and `lineTotal` are null on an unavailable line, which is excluded
from the totals. Every total comes from the database; the app renders `subtotal`
and never adds the lines up itself.

#### `POST /api/cart/items`

Body `{ "variantId": "<uuid>", "quantity": 1 }` → `201` with the **whole new
cart**, same shape as `GET`. Returning the cart rather than `{ ok: true }` is
what lets the app update the Bag badge and the totals in one round trip, and
keeps the server the only thing that computed either.

`UNPROCESSABLE` with the service's own sentence when the variant is unbuyable —
inactive, unpriced, out of stock, not enough held. `CartOutcome` already carries
that message.

#### `PATCH /api/cart/items/:itemId`

Body `{ "quantity": 3 }`, integer ≥ 0 → the whole new cart. Zero removes the
line, which is what `setQuantity()` already does, so no separate DELETE is
needed — though `DELETE /api/cart/items/:itemId` as an alias would read better.

**Errors:** `UNAUTHORIZED` when signed out, `NOT_FOUND` for an item id not in
this user's cart, `UNPROCESSABLE` for a refused quantity, `BAD_REQUEST` for a
malformed body. **RLS:** unchanged — the route is the trust boundary, exactly as
`repository.ts` already documents for the web.

### Checkout

Out of scope for Phase 1 either way. Razorpay's SDK is native and the app runs
in Expo Go, so the Bag's checkout button opens `https://hugfab.com/cart`. That
hand-off must say plainly that payment happens on the website and that signing in
again may be required — it does today. See `docs/PLAN.md` Phase 2.

---

## 4. Addresses — BUILT

Service: `src/modules/addresses/service.ts` — `getAddressBook()`, `saveAddress()`,
`removeAddress()`, `makeDefault()`. `SavedAddress` is already a clean domain type
with no money in it, so these are the most mechanical routes on this list.

| Route | Body | Returns |
|---|---|---|
| `GET /api/account/addresses` | — | `{ "data": { "addresses": SavedAddress[], "defaultId": string \| null } }` |
| `POST /api/account/addresses` | the `saveAddress` schema | `201 { "data": { "address": SavedAddress } }` |
| `PATCH /api/account/addresses/:id` | same, partial | `200 { "data": { "address": SavedAddress } }` |
| `DELETE /api/account/addresses/:id` | — | `200 { "data": { "removed": true } }` |
| `POST /api/account/addresses/:id/default` | — | `200 { "data": { "defaultId": string } }` |

`saveAddress()` takes `unknown` and validates with its own Zod schema, so the route
passes the parsed body straight through and maps a schema failure to `BAD_REQUEST`
with `details.fields` — exactly what `docs/api.md` documents and what the app's
form already expects.

---

## 5. Orders — BUILT

Service: `src/modules/orders/service.ts` — `getMyOrders()`, `getMyOrder(orderId)`.

### `GET /api/orders`

`requireApiUser()`. `private, no-store`. `MyOrder[]`, newest first, money composed:

```jsonc
{ "data": { "orders": [{
  "id": "…", "orderNumber": "HF-1042", "createdAt": "2026-09-21T10:00:00.000Z",
  "status": "paid", "fulfilmentStatus": "shipped",
  "total": { "amountMinor": 379800, "currency": "INR" },
  "refunded": { "amountMinor": 0, "currency": "INR" },
  "lineCount": 2
}] } }
```

A list does not need every line. `lineCount` plus the first line's image is what a
card draws; sending all lines for twenty orders is a page the app then throws away.

### `GET /api/orders/:orderId`

The full `MyOrder` with `lines: MyOrderLine[]` — `fulfilmentStatus`,
`trackingReference`, `carrier`, `returnStatus`, `canReturn` per line. `NOT_FOUND`
when the order is not the caller's; never `FORBIDDEN`, which would confirm it
exists. `docs/api.md` already sets that precedent for admin surfaces.

`canReturn` must stay server-computed. `orders/types.ts` explains why: it decides
what to *show*, and a client that guesses will offer a button the database refuses.

**Returns** (`requestReturn()`) are not requested for Phase 1. The app links to
the web order page for them.

---

## 6. `GET /api/account/summary` — BUILT

The route is live and already returns `data: null` for a visitor rather than a
`401`, which is the right call and one the app relies on.

1. **Bearer support** — §1. Today the header-read path is cookie-only.
2. **Two more fields**, so the Account tab does not need three round trips. Both
   come from `src/modules/account/service.ts` (`getDashboardStats()`) and
   `src/modules/wishlist/service.ts` (`countMyWishlist()`):

```jsonc
{ "data": {
  "firstName": "Priya", "avatarUrl": null, "unreadNotifications": 3,
  "orderCount": 4,
  "wishlistCount": 12
} }
```

Additive, so no web caller changes. If the extra reads are unwelcome on a route the
header calls on every page load, a separate `GET /api/account/overview` is just as
good and the app will use whichever exists.

---

## 7. `GET /api/homepage` — wanted, not blocking

Service: `src/modules/merchandising/service.ts` — `getHomepageSections()` and
`loadSectionProducts()`. The homepage is already data, arranged by an admin at
`/admin/homepage`; only the endpoint is missing.

```jsonc
{ "data": { "sections": [{
  "id": "…", "kind": "product_rail", "title": "Biggest reductions",
  "source": "biggest_discount",
  "items": [ /* ProductSummary, exactly as /api/products returns them */ ]
}] } }
```

Public, cacheable, `s-maxage=60` like the catalogue. Restricting `kind` to
`product_rail` / `product_grid` / `category_rail` / `brand_rail` in a first cut is
fine — `ad_block`, `stylist_cta` and `discover_rail` are surfaces mobile does not
have yet, and the app skips any `kind` it does not recognise so the web CMS can add
one without shipping an app update.

Until this exists, Home builds its rails from `/api/products` with documented
parameters (`docs/PLAN.md` → "Home, honestly"). It looks right; it just is not the
merchandising an admin arranged.

---

## 8. What the mobile brief asks for and the API cannot answer

The 2026 mobile brief and its reference screens ask for several things the
catalogue does not hold. Each is listed here rather than approximated, because
every one of them would be a number or a claim invented on the client — which is
the single rule `CLAUDE.md` exists to enforce.

### 8.1 Ratings and reviews — on every card in the reference

`★ 4.5`, `★ 4.6 (1.2K reviews)`. There is **no rating anywhere in the
catalogue**: not on `products`, not in `ProductSummary`, not in the database
types. So the cards ship without them.

This is the largest visual difference between the reference and the built app,
and it is not a styling choice. A star rating is a claim about what other people
thought, and there is nobody to have thought it yet.

What it needs, roughly in order of cost:

1. A `product_reviews` table, or an aggregate column pair
   (`rating_average numeric(2,1)`, `rating_count integer`) maintained by trigger.
2. `ProductSummary.rating: { average: number; count: number } | null` — null
   meaning "no ratings", never `0`, so a card can tell "unrated" from "rated
   badly".
3. `sort=rating` on `GET /api/products`, which the brief's sort sheet lists.

Until then the sort sheet says why the option is missing rather than hiding it.

### 8.2 Size and colour filters

The reference's filter sheet has both. `GET /api/products` documents neither, and
`docs/api.md` is the whole list. Sizes live on `product_variants`, so filtering a
listing by size means a join the listing query does not currently do.

Requested: `size` (csv) and `color` (csv) on `GET /api/products`, matching any
variant. Plus a facet endpoint, or facet counts on the listing response, so the
sheet can offer the sizes that exist in *these* results rather than a fixed list
of six that mostly return nothing.

### 8.3 Discount filter and sort

`20%+ / 40%+ / 60%+ / 70%+` in the reference. `discountPercent` is computed per
offer for display and is not stored on a product, so there is nothing to filter
or sort on. Requested: `minDiscount` on the listing, and `sort=discount`.

### 8.4 Price-drop and trending collections

The brief's Discover has "Price Drops" and "Trending Now" as collections.

- `ProductSummary.priceDrop` already exists on a card, so the data is there — but
  nothing filters a listing to only products that have one. Requested:
  `hasPriceDrop=true`.
- Trending is click-outs by distinct shoppers in
  `src/modules/merchandising`, and the web app already computes it. It has no
  route. `GET /api/homepage` (§7) would answer both.

Discover ships without either rather than relabelling `sort=newest` as
"Trending", which would be exactly the flattering fiction PRD §69 forbids.

### 8.5 Wishlist previous price

The brief's wishlist tabs are All / Price drops / Available, and the price-drop
tab is what makes a wishlist a tracking tool. `WishlistItem` carries the current
price and the alert target, but no previous price — so "dropped ₹150" cannot be
shown.

The database keeps the history (the grid's `priceDrop` proves it). Requested on
`GET /api/wishlist` (§2): `previousPrice: Money | null` and `changedAt`. The tab
currently filters to items with an alert set, and says so.

### 8.6 Community feed

Every community read is a server component and every write a server action
(`src/app/(shop)/community/actions.ts`), so React Native can reach none of it.

Requested, smallest useful set:

| Route | Returns |
|---|---|
| `GET /api/community/posts` | Paginated posts: author, media, caption, counts, and the products attached to the look |
| `POST /api/community/posts/:id/like` | The new like state |
| `POST /api/community/posts/:id/save` | The new save state |

Service: `src/modules/community/service.ts`, which already holds the rules.

Until then the Community tab is a signpost to the web feed, not an empty shell.

### 8.7 Per-product stylist rationale

The brief wants "Why we picked this" under each AI recommendation.
`StylistReply` carries one `text` for the whole answer plus `products[]`, so the
rationale is shown once above the set.

Requested: `products: { product: ProductSummary; reason: string }[]`, with
`reason` coming from the model's `recommend` tool call rather than parsed out of
the prose — the same discipline `src/modules/ai/service.ts` already applies to
ids, and for the same reason.

### 8.8 Notifications feed

`GET /api/account/summary` returns `unreadNotifications` — a count with nothing
behind it. The bell in the header opens the web list. Requested:
`GET /api/account/notifications` returning the feed `getMyNotifications()`
already builds, and `POST /api/account/notifications/seen`.

---

## What is left, in order

1. **§3 Cart.** Blocked on one question, not on code: a web cart is identified by
   a cookie, so a bearer-authenticated cart must be keyed on the user id. Either
   an anonymous mobile cart is not supported — sign in before adding to the Bag,
   which the app is already built to say — or `carts` grows a `user_id` path.
   That is a product decision.
2. **§7 Homepage.** Whenever. The app degrades honestly without it and says so on
   the screen.
3. **§8.4 Price-drop and trending collections.** Listing parameters over data the
   database already holds; the cheapest of the §8 items.
4. **§8.5 Wishlist previous price**, which makes the wishlist a price tracker
   rather than a bookmark list.
5. **§8.2 / §8.3 Size, colour and discount filters.** Real query work, and size
   needs a join the listing does not do today.
6. **§8.6 Community feed**, **§8.8 notifications**, **§8.7 stylist rationale**.
7. **§8.1 Ratings.** Last, and a product question before an engineering one: a
   reviews table means deciding who may write one, when, and who moderates it.

The app ships against whatever exists. Screens behind a missing endpoint say
"not available in the app yet" and link to the web page — they do not show
invented rows, and they do not pretend a write succeeded.
