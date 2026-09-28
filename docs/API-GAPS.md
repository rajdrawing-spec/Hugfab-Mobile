# API gaps in HUGFAB-AI

What the mobile app needs from `rajdrawing-spec/HUGFAB-AI` and does not have.

**Nothing in this document has been changed in that repo.** It is a request, written
in that repo's own conventions so it can be implemented without re-deciding
anything.

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

## 1. Bearer-token authentication — blocks everything else

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

## 2. Wishlist

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

## 3. Cart

Service: `src/modules/cart/service.ts` — `getCart()`, `addItem(variantId, qty)`,
`setQuantity(itemId, qty)`. Used by `(shop)/cart/actions.ts`.

**One caveat the implementer must resolve, and the app cannot:** a web cart is
identified by a cookie (`ensureCartId()`), and `docs/api.md` says as much —
"the cart's identity is a cookie, history belongs to an account". A mobile cart has
no cookie jar. So a bearer-authenticated cart must be keyed on the **user id**,
which means either an anonymous mobile cart is not supported (sign-in required
before adding to Bag — acceptable for Phase 1, and the app is built to show that),
or `carts` grows a `user_id` path. **This is a product decision, not an
implementation detail.** The app currently requires sign-in for the Bag.

### `GET /api/cart`

`requireApiUser()`. `private, no-store`. Return `Cart` as
`src/modules/cart/types.ts` defines it, with minor-unit pairs composed into `Money`:

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

`unitPrice` and `lineTotal` are null on an unavailable line, which is excluded from
the totals — as `cart/types.ts` already specifies. Every total comes from the
database. The app renders `subtotal` and never adds the lines up itself.

### `POST /api/cart/items`

Body `{ "variantId": "<uuid>", "quantity": 1 }` — `201` with the **whole new cart**,
same shape as `GET`. Returning the cart rather than `{ ok: true }` is what lets the
app update the Bag badge and the totals from one round trip — and keeps the server
the only thing that ever computed them.

`UNPROCESSABLE` with the service's own sentence when the variant is unbuyable
(inactive, unpriced, out of stock, not enough held). `CartOutcome` already carries
that message.

### `PATCH /api/cart/items/:itemId`

Body `{ "quantity": 3 }`, integer >= 0 — the whole new cart. Zero removes the line,
which is what `setQuantity()` already does, so the app needs no separate DELETE —
though `DELETE /api/cart/items/:itemId` as an alias would read better.

### Not requested: checkout

`placeOrder()` and `startPayment()` stay web-only for now. Razorpay's SDK is
native and the app is Expo Go, so the Bag's checkout button opens
`https://hugfab.com/cart` in a browser. See `docs/PLAN.md` Phase 2.

---

## 4. Addresses

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

## 5. Orders

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

## 6. `GET /api/account/summary` — exists, needs two things

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

## Suggested order

1. **§1 Bearer auth.** Nothing else is reachable without it, and it is one file.
2. **§6 summary fields** — smallest visible win; proves the bearer path end to end.
3. **§2 Wishlist** — three routes, no money arithmetic, no cart-identity question.
4. **§5 Orders** — read-only.
5. **§4 Addresses** — mechanical.
6. **§3 Cart** — last, because the cart-identity decision is real work.
7. **§7 Homepage** — whenever; the app degrades honestly without it.

The app ships against whatever exists. Screens behind a missing endpoint say
"not available in the app yet" and link to the web page — they do not show
invented rows, and they do not pretend a write succeeded.
