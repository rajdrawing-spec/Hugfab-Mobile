/**
 * The domain types the API returns, mirrored from HUGFAB-AI `src/modules/<name>/types.ts`.
 *
 * Mirrored by hand rather than generated, because these are the *response* shapes
 * `docs/api.md` documents, not the module's internal types — the routes compose
 * `priceMinor` + `currency` into `Money` on the way out, and a generator pointed
 * at the module would reproduce the internal pair.
 *
 * Every field's meaning belongs to the web app. Where a comment here explains one,
 * it is quoting that repo, not deciding anything.
 */

import type { Money } from '@/lib/money';

export type Gender = 'women' | 'men' | 'unisex' | 'kids';

export type Availability =
  'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued' | 'unknown';

export type ReturnStatus =
  'requested' | 'approved' | 'rejected' | 'received' | 'refunded';

export type FulfilmentStatus =
  | 'awaiting'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'return_requested'
  | 'returned'
  | 'cancelled';

export interface BrandSummary {
  id: string;
  slug: string;
  name: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
}

export interface RetailerSummary {
  id: string;
  slug: string;
  name: string;
  /** Null is the ordinary case, not an error — most feeds name a retailer long
   *  before they supply artwork. Draw a monogram. */
  logoUrl: string | null;
}

export interface ProductOffer {
  retailer: RetailerSummary;
  price: Money;
  /** The retailer's list price, when the feed gives one. Never inferred. */
  originalPrice: Money | null;
  /** Whole percent, or null when there is no genuine reduction. */
  discountPercent: number | null;
  availability: Availability;
  /**
   * HugFab's own click-out route, never the retailer's tracked URL — the redirect
   * is where attribution is recorded. Open this, nothing else.
   */
  clickPath: string;
}

export interface ProductVariant {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  availability: Availability;
}

interface ProductBase {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  brand: BrandSummary | null;
  category: CategorySummary | null;
  gender: Gender;
  color: string | null;
  material?: string | null;
  imageUrls: string[];
  /**
   * A development seed row. Production responses never contain one, but the flag
   * travels so nothing can present invented data as real.
   */
  isMock: boolean;
  createdAt?: string;
  merchant?: { slug: string; name: string } | null;
}

/** A card in a grid. */
export interface ProductSummary extends ProductBase {
  bestOffer: ProductOffer | null;
  offerCount: number;
  isFeatured?: boolean;
  priceDrop?: { previousPrice: Money; changedAt: string } | null;
}

/** The product screen: every offer, in-stock first then cheapest. */
export interface ProductDetail extends ProductBase {
  offers: ProductOffer[];
  /** `offers[0]`, so the Best Price badge and the top row agree by construction. */
  bestOffer: ProductOffer | null;
  variants: ProductVariant[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** `GET /api/account/summary`. Null `data` means nobody is signed in — a 200. */
export interface AccountSummary {
  firstName: string | null;
  avatarUrl: string | null;
  unreadNotifications: number;
  orderCount: number;
  wishlistCount: number;
  /** A HugFab Plus member right now. */
  plus: boolean;
  /** Other consoles this account may open. Navigation only. */
  workspaces: { href: string; label: string }[];
}

/** docs/API-GAPS.md §2. */
export interface WishlistItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  price: Money | null;
  inStock: boolean;
  target: Money | null;
  savedAt: string;
}

/** docs/API-GAPS.md §3. */
export interface CartLine {
  itemId: string;
  variantId: string;
  productId: string;
  title: string;
  slug: string;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  quantity: number;
  /** Null when the line cannot be bought, and then it is out of the totals. */
  unitPrice: Money | null;
  lineTotal: Money | null;
  available: boolean;
  /** Null means stock is not tracked, not that none is held. */
  stock: number | null;
}

export interface Cart {
  lines: CartLine[];
  /** The database's figure. Never recomputed here. */
  subtotal: Money;
  mrpTotal?: Money | null;
  itemCount: number;
  lineCount: number;
  /** Non-zero blocks checkout rather than hiding the lines. */
  unavailable: number;
}

/** docs/API-GAPS.md §5. */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfilmentStatus: FulfilmentStatus;
  total: Money;
  refunded: Money;
  lineCount: number;
  /** The first line's image, which is what a card draws. */
  imageUrl: string | null;
}

export interface OrderLine {
  id: string;
  productId: string | null;
  title: string;
  variantLabel: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  fulfilmentStatus: FulfilmentStatus;
  /** The most recent return on this line, if any. */
  returnStatus: ReturnStatus | null;
  /** Server-computed. A client that guesses offers a button the database refuses. */
  canReturn: boolean;
}

/**
 * A parcel.
 *
 * **Tracking is per shipment, not per line** — an earlier version of this file
 * had `trackingReference` and `carrier` on `OrderLine`, and that was simply
 * wrong: one order can ship in several parcels from several merchants, so a
 * courier and an AWB belong to a shipment and `itemIds` says which lines were in
 * it. Flattened onto lines it would have been wrong the first time an order
 * shipped in two boxes.
 */
export interface OrderShipment {
  id: string;
  courierName: string;
  awb: string;
  trackingUrl: string | null;
  status: string;
  estimatedDeliveryDate: string | null;
  shippedAt: string;
  deliveredAt: string | null;
  /** Which `OrderLine.id`s travelled in this parcel. */
  itemIds: string[];
}

export interface OrderDetail extends OrderSummary {
  lines: OrderLine[];
  shipments: OrderShipment[];
}

// ---------------------------------------------------------------------------
// The consoles
//
// Mirrored from HUGFAB-AI `src/modules/merchants/dashboard.service.ts` and
// `src/modules/admin/dashboard.types.ts`. Both endpoints exist and are live, so
// unlike the cart and the wishlist these need no new backend work — only the
// bearer-token change in `docs/API-GAPS.md` §1.
//
// Both `href` fields are paths on the HugFab website, not routes in this app.
// The app shows what needs doing; acting on it opens the console in a browser.
// ---------------------------------------------------------------------------

/** One thing waiting on a seller. `tone` is the web app's word, not a colour. */
export interface AttentionAlert {
  key: string;
  /** 'action': an order or a return waiting on them. 'warning': stock. */
  tone: 'action' | 'warning';
  count: number;
  title: string;
  href: string;
}

/**
 * `GET /api/merchant/attention`.
 *
 * Counts are already limited to what this person's role may see — a seller
 * without `orders.read` gets zeros rather than a forbidden error, so a zero here
 * means "none, or not yours to see" and the screen must not read it as "none".
 */
export interface MerchantAttention {
  newOrders: number;
  toPack: number;
  toShip: number;
  openReturns: number;
  lowStock: number;
  outOfStock: number;
  untracked: number;
  listings: number;
  latestOrder: { id: string; number: string } | null;
  alerts: AttentionAlert[];
}

export type Severity = 'critical' | 'action' | 'info' | 'done';

/** One queue waiting on an admin. `title` is a whole sentence already. */
export interface AttentionItem {
  id: string;
  severity: Severity;
  count: number;
  title: string;
  href: string;
  cta: string;
  /** The sidebar entry whose badge this adds to, on the web. */
  area: string;
}

/** `GET /api/admin/attention`. */
export interface AdminAttention {
  items: AttentionItem[];
  /** Critical and action-required items: what the console's bell counts. */
  needsAction: number;
  badges: Record<string, number>;
  asOf: string;
}

// ---------------------------------------------------------------------------
// The AI stylist
//
// `POST /api/stylist` is live. Mirrored from HUGFAB-AI `src/modules/ai/types.ts`.
// ---------------------------------------------------------------------------

export interface StylistTurn {
  role: 'user' | 'assistant';
  /** 1–4000 characters; the route rejects an empty one. */
  text: string;
}

export interface StylistReply {
  /** Prose only — the service guarantees it never contains a price or a link. */
  text: string;
  /**
   * What it recommended, as catalogue rows. Never parsed out of `text`: the
   * model picks ids from what the search tool returned and anything it invents
   * is dropped server-side, so a card here is always a product that exists at
   * the price shown.
   */
  products: ProductSummary[];
  /** The model named something that does not exist, and it was dropped. */
  droppedInvented: boolean;
}
