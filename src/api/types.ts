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
  /** Both pending — see docs/API-GAPS.md §6. Absent until that ships. */
  orderCount?: number;
  wishlistCount?: number;
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
}

export interface OrderLine {
  orderItemId: string;
  productId: string | null;
  title: string;
  variantLabel: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  fulfilmentStatus: FulfilmentStatus;
  trackingReference: string | null;
  carrier: string | null;
  /** Server-computed. A client that guesses offers a button the database refuses. */
  canReturn: boolean;
}

export interface OrderDetail extends OrderSummary {
  lines: OrderLine[];
}
