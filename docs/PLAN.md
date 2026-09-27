# HugFab Mobile — Phase 1 plan

Planning only. No app code yet.

Everything below was read from the web app (`rajdrawing-spec/HUGFAB-AI`, commit
on `main` as of 2026-09-27) and, where it concerns database access, **verified
against the live Supabase project** rather than inferred from the migration
files. That distinction matters: the migrations contain a blanket lock-down step
that revokes execute on most functions, so reading the `grant` statements alone
gives the wrong answer.

---

## 1. Design tokens

The web app has **no `tailwind.config.js`** — it is Tailwind v4. Tokens are CSS
custom properties in `src/styles/tokens.css`, mapped onto Tailwind's utility
namespaces by an `@theme inline` block in `src/styles/globals.css`.

For the app these become a single `theme.ts` consumed by the NativeWind config,
so the token names stay identical and a component still writes `bg-surface`.

### Colour

| Token | Value | Role |
|---|---|---|
| `background` | `#f8f9fb` | page ground |
| `surface` | `#ffffff` | cards, sheets |
| `surface-2` | `#f1f3f7` | secondary fill |
| `text` | `#111827` | primary ink |
| `muted` | `#687280` | secondary ink |
| `border` | `#e5e8ef` | hairlines |
| `border-strong` | `#cfd5e1` | outline controls |
| `dark` | `#0f172a` | dark panels, CTA over photography |
| `primary` | `#dc2626` | brand red, filled CTAs |
| `primary-hover` | `#b91c1c` | pressed state |
| `primary-foreground` | `#ffffff` | ink on primary |
| `primary-soft` | `#fee2e2` | tinted fill, selection |
| `secondary` | `#7c3aed` | violet accent |
| `secondary-hover` | `#6d28d9` | |
| `secondary-soft` | `#f1e9fe` | |
| `accent` | `#00c896` | teal accent, confirm |
| `accent-hover` | `#00b184` | |
| `accent-foreground` | `#04372a` | ink on accent |
| `accent-soft` | `#dcf7ee` | |
| `success` | `#00a87e` | "In Stock" |
| `success-soft` | `#dcf7ee` | |
| `warning` | `#b45309` | |
| `warning-soft` | `#fdf0dc` | |
| `error` | `#dc2626` | |
| `error-soft` | `#fde8e8` | |
| `ring` | `#dc2626` | focus indicator |
| `overlay` | `rgb(15 23 42 / 0.45)` | modal scrim |
| `footer` | `#3a3a3a` | footer band |
| `footer-foreground` | `#ffffff` | |
| `footer-muted` | `#c9c9c9` | footer links |
| `promo-from` → `promo-to` | `#dc2626` → `#f0653a` | promo strip gradient |
| `logo` | `#f5100f` | **mark only** — never UI |
| `logo-ink` | `#ffffff` | **mark only** — bear's features |

Two notes carried over from the web app's own comments, because they are easy to
get wrong:

- `primary` is `#dc2626`, deliberately duller than the logo red, because white
  on the brighter red fails WCAG AA (4.00:1). This value is 4.83:1 on white.
- `logo` / `logo-ink` belong to the bear mark and must never be reused as UI
  colours.

### Type

**Poppins** 400/500/600/700 and **Caveat** 500/600, both self-hosted. The web app
keeps `.woff2` in `src/app/fonts/` under the SIL Open Font License; the app will
need the `.ttf` equivalents loaded through `expo-font`. Caveat is an editorial
accent for marketing surfaces only — never a control, never product UI.

| Step | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| `display` | 56 | 1.05 | -0.03em | 700 |
| `h1` | 48 | 1.12 | -0.025em | 700 |
| `h2` | 32 | 1.2 | -0.02em | 600 |
| `h3` | 24 | 1.3 | -0.015em | 600 |
| `body` | 16 | 1.6 | — | 400 |
| `small` | 14 | 1.5 | — | 400 |
| `caption` | 12 | 1.45 | 0.01em | 400 |
| `button` | 15 | 1.2 | — | 600 |

`display`, `h1` and `h2` are desktop-scale and will need a mobile ramp — a
48px H1 on a 360dp phone is roughly a third of the viewport. Proposal: keep the
token names, override `display`/`h1`/`h2` to 40/32/24 for the app, and record
the override in `theme.ts` so it is visible rather than scattered.

### Spacing, radius, elevation, motion

| Token | Value |
|---|---|
| spacing base | `4px` (`--spacing: 0.25rem`) |
| `radius-sm` | 8 — chips, tags |
| `radius-md` | 12 — buttons, inputs |
| `radius-lg` | 16 — cards |
| `radius-xl` | 24 — sheets, hero panels |
| `shadow-sm` | `0 1px 2px rgb(15 23 42 / 0.06)` |
| `shadow-md` | `0 1px 3px rgb(15 23 42 / .06), 0 8px 24px -14px rgb(15 23 42 / .22)` |
| `shadow-lg` | `0 2px 6px rgb(15 23 42 / .07), 0 20px 48px -22px rgb(15 23 42 / .3)` |
| easing | `cubic-bezier(0.22, 1, 0.36, 1)` |

Android does not render multi-layer CSS shadows. The three steps map to
`elevation` 1 / 3 / 8 plus a matching `shadowColor` on iOS if the app is ever
built for it.

Two web utilities have no direct RN equivalent and need deliberate replacements:
`page-container` (max-width 1720 with a gutter that steps 16 → 24 → 32 → 40) and
`bleed-x` (edge-to-edge horizontal rails with the first card aligned to the
gutter). On a phone the gutter is always the 16px step; `bleed-x` becomes a
`FlatList` with `contentContainerStyle: { paddingHorizontal: 16 }`.

---

## 2. Supabase — what the app may read and write

**Verified live.** Every table in `public` has RLS enabled — the query for tables
with `relrowsecurity = false` returned zero rows. There is no table with RLS off
to flag.

But RLS *enabled* is not the same as RLS *permitting*. Several tables have RLS on
and **no policy at all**, which is deny-all for `anon` and `authenticated`. Those
are the ones that shape the architecture.

### Tables Phase 1 touches

| Table | RLS | Forced | Policies | What the app can do with the anon key |
|---|---|---|---|---|
| `products` | on | no | 1 (select) | read active products |
| `product_variants` | on | no | 1 (select) | read |
| `prices` | on | no | 1 (select) | read |
| `price_history` | on | no | 1 (select) | read |
| `product_offer_summary` | on | no | 1 (select) | read |
| `product_identifiers` | on | no | 1 (select) | read |
| `brands` | on | no | 1 (select) | read |
| `categories` | on | no | 1 (select) | read |
| `retailers` | on | no | 1 (select) | read active only |
| `promotions` | on | no | 2 (select) | read |
| `profiles` | on | **yes** | 2 (select, update) | read/update own; `role` blocked by trigger |
| `wishlists` | on | **yes** | 4 (all) | full own-row access |
| `saved_searches` | on | **yes** | 3 (select, insert, delete) | own rows; **no update** |
| `user_addresses` | on | no | 2 (select, all) | full own-row access |
| `orders` | on | **yes** | 1 (**select only**) | read own orders; cannot create |
| `order_items` | on | **yes** | 1 (**select only**) | read own lines; cannot create |
| `affiliate_clicks` | on | **yes** | 2 (insert, select) | record a click, read own |
| `discover_posts` | on | no | 2 (select) | read |
| `discover_comments` | on | no | 2 (select) | read |
| `discover_reactions` | on | no | 3 (select, insert, delete) | react / un-react |
| **`carts`** | on | **yes** | **0 — deny-all** | **nothing** |
| **`cart_items`** | on | **yes** | **0 — deny-all** | **nothing** |
| **`follows`** | on | no | **0 — deny-all** | **nothing** |
| **`affiliate_offers`** | on | no | **0 — deny-all** | **nothing** |

### The RPC grant matrix

The web app does most of its work through Postgres functions rather than table
reads. Migration `20260924200000_lock_down_definer_functions.sql` revokes execute
on **every** `SECURITY DEFINER` function in `public` from `anon` and
`authenticated`, keeping only six by name. Later migrations re-grant a handful.
Verified state:

**Callable with the anon key** — these the app can use directly:

| Function | Powers |
|---|---|
| `search_products` | search results, listing pages |
| `search_facets` | filter rails |
| `navigation_tree` | category nav |
| `top_categories` | category tiles |
| `trending_products` | home rails |
| `find_similar_products` | "similar" rail |
| `category_descendants` | category browse |
| `discover_feed`, `discover_post`, `discover_sections`, `discover_my_reactions` | the Discover feed |
| `active_ads` | sponsored placements |

**Service-role only — the app cannot call these:**

| Function | What it blocks |
|---|---|
| `cart_contents`, `add_to_cart` | **the entire cart** |
| `create_order_from_cart` | **checkout** |
| `quote_promotion` | coupon / promo pricing |
| `product_price_series` | the price-history chart on the product page |
| `saved_search_record` | saving a search |
| `mint_referral_click` | attributed affiliate outbound |
| `plus_state` | Plus membership status |
| `discover_submit`, `discover_counts`, `discover_catalogue_facts` | posting to Discover |

**This is the central finding of the plan.** On the web, these are reached from
Next.js server code holding the service-role key. A React Native app has no
server and must never hold that key, so **cart, checkout, promo pricing, price
history, saved searches and attributed affiliate clicks are all unreachable in
Phase 1 without new Edge Functions.** The web app's `src/app/api/*` route
handlers cannot be reused — they are Next.js handlers, not HTTP endpoints the app
can call.

---

## 3. Phase 1 screens

Shopping MVP: browse, find, compare, save, buy. Live shopping, the AI stylist,
the trial room, merchant and seller flows are out of scope.

| # | Screen | Route | Web page | Data source | Blocked? |
|---|---|---|---|---|---|
| 1 | Home | `/(tabs)/index` | `(shop)/discover` | `discover_sections`, `trending_products`, `top_categories`, `active_ads` | no |
| 2 | Search | `/(tabs)/search` | `(shop)/search` | `search_products`, `search_facets` | no |
| 3 | Category browse | `/categories/[slug]` | `(shop)/categories` | `navigation_tree`, `category_descendants`, `search_products` | no |
| 4 | Product detail | `/product/[slug]` | `(shop)/products/[slug]` | `products`, `prices`, `product_variants`, `product_offer_summary` | price-history chart blocked |
| 5 | Price comparison | in-sheet on #4 | `(shop)/compare` | `product_offer_summary`, `retailers` | outbound click unattributed |
| 6 | Similar products | rail on #4 | `(shop)/similar/[slug]` | `find_similar_products` | no |
| 7 | Wishlist | `/(tabs)/wishlist` | `(shop)/wishlist` | `wishlists` table, direct | no |
| 8 | Cart | `/(tabs)/cart` | `(shop)/cart` | `cart_contents`, `add_to_cart` | **fully blocked** |
| 9 | Checkout | `/checkout` | `(shop)/checkout` | `create_order_from_cart`, Razorpay | **fully blocked** |
| 10 | Orders | `/account/orders` | `(shop)/account/orders` | `orders`, `order_items`, direct read | no |
| 11 | Order detail | `/account/orders/[id]` | `(shop)/account/orders/[orderId]` | as above + `order_events` | no |
| 12 | Addresses | `/account/addresses` | `(shop)/account/addresses` | `user_addresses`, direct | no |
| 13 | Sign in / Sign up | `/(auth)/sign-in`, `/(auth)/sign-up` | `(auth)/login`, `(auth)/signup` | Supabase Auth | no |
| 14 | Account | `/(tabs)/account` | `(account)/settings` | `profiles`, direct | no |
| 15 | Brands | `/brands` | `(shop)/brands` | `brands`, `search_products` | no |
| 16 | Deals | `/deals` | `(shop)/deals` | `search_products` filtered | promo pricing blocked |

Tab bar: **Home · Search · Wishlist · Cart · Account** — five, matching the web
header's primary actions.

Screens 1–7 and 10–15 can be built today against the anon key. **8 and 9 cannot
be built at all** until the Edge Functions below are approved, so Phase 1 splits
naturally into a browse-and-save release and a buy release.

### Auth

The web app shares a session across subdomains via a cookie domain
(`NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`). That mechanism is web-only. The app uses
`@supabase/supabase-js` with a storage adapter over `expo-secure-store`, so the
refresh token sits in the Android keystore rather than in `AsyncStorage`. Sessions
will not be shared between the website and the app; a user signs in once in each.

---

## 4. Proposals — need your approval before anything is built

Nothing here has been done. Each item is a request.

### A. Edge Function `cart` — required for screen 8

Wraps `cart_contents` and `add_to_cart`. Verifies the caller's JWT, resolves
`auth.uid()`, calls the function with the service role, returns the cart. The
service-role key lives in the function's environment, never in the app.

### B. Edge Function `checkout` — required for screen 9

Wraps `create_order_from_cart` and the Razorpay order handshake
(`attach_payment_order`). The Razorpay key secret must stay server-side, so this
is not optional. Payment verification continues to run through the existing
`/api/payments/razorpay/webhook` on the web deployment — the app does not need
its own webhook.

### C. Edge Function `affiliate-click` — recommended

Wraps `mint_referral_click` so outbound retailer taps are attributed. Without it
the app can still open the retailer, but the click is not tracked and the
commission is lost. `affiliate_clicks` does accept a direct insert, so a reduced
version is possible without any new function — worth deciding which you want.

### D. Edge Function `price-series` — optional, Phase 1.5

Wraps `product_price_series` for the price-history chart. Cosmetic; the product
page works without it.

### E. Not proposed, but flagged

`follows` and `affiliate_offers` have RLS on with zero policies. Neither is
needed for Phase 1 and **I am not proposing a change to either** — recording
them only so that a later "follow a brand" feature is known to need a decision,
not an accident.

**No database change is proposed.** No new table, no new column, no altered
policy, no widened grant. Every gap above is closed by a new Edge Function
sitting beside the existing schema, which is the least invasive option and the
only one that keeps the service-role key out of the binary. If you would rather
grant `execute` to `authenticated` on some of these functions instead, that is a
smaller change but a larger security surface — say which you prefer.

---

## 5. Libraries

### Works in Expo Go

| Library | Purpose |
|---|---|
| `expo-router` | file-based navigation |
| `nativewind` v4 | Tailwind for RN; consumes the shared theme |
| `@supabase/supabase-js` | data + auth |
| `expo-secure-store` | session storage in the Android keystore |
| `@react-native-async-storage/async-storage` | non-sensitive cache |
| `@tanstack/react-query` | fetching, caching, pagination |
| `expo-image` | product imagery, disk cache, blurhash |
| `expo-font` | Poppins + Caveat |
| `react-native-reanimated`, `react-native-gesture-handler` | motion, gestures |
| `@gorhom/bottom-sheet` | the comparison and filter sheets |
| `expo-web-browser` | affiliate outbound in a Custom Tab |
| `react-native-svg` | the Fab mascot |
| `zod` | shared validation; the web app already uses v4 |
| `expo-linking`, `expo-constants`, `expo-status-bar` | plumbing |

### Needs a custom dev build

| Library | Purpose | Why |
|---|---|---|
| `react-native-razorpay` | checkout | native SDK, no Expo Go support |
| `@sentry/react-native` | crash reporting | native layer; web app already uses Sentry |
| `expo-notifications` (remote push) | price alerts | remote push was removed from Expo Go in SDK 53 |
| `posthog-react-native` | analytics | autocapture needs native; web app already uses PostHog |

**Recommendation:** build screens 1–7 and 10–15 in Expo Go, which keeps iteration
fast and needs nothing installed on your side. Move to an EAS development build
at the point checkout lands, since Razorpay forces it anyway. Nothing in the
browse-and-save release requires it.

### Deliberately not carried over

`hls.js` (live video), `@anthropic-ai/sdk` (stylist), `@upstash/*` (rate
limiting), `@supabase/ssr` — all web-side or out of Phase 1 scope.

---

## 6. Open questions

1. **Cart and checkout**: approve Edge Functions A and B, or grant `execute` to
   `authenticated` on the cart RPCs instead? The second is fewer moving parts but
   exposes the functions directly.
2. **Affiliate attribution** (proposal C): full Edge Function, or the reduced
   direct-insert version into `affiliate_clicks`?
3. **Ship in two releases** (browse-and-save first, buy second), or hold the
   whole of Phase 1 until checkout is ready?
4. **Mobile type ramp**: confirm the 40/32/24 override for `display`/`h1`/`h2`,
   or keep desktop sizes?
5. **Android package name and app name** for `app.json`.
