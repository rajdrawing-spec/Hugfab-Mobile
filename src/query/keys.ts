/**
 * Every query key in one place, so an invalidation cannot miss a cache by
 * spelling its key differently.
 *
 * `as const` throughout: TanStack Query compares keys structurally, and a key
 * built from a widened type is a key that sometimes matches.
 */

import type { ProductFilters } from '@/api/products';

export const queryKeys = {
  products: (filters: ProductFilters) => ['products', filters] as const,
  product: (slug: string) => ['product', slug] as const,
  accountSummary: () => ['account', 'summary'] as const,
  wishlist: () => ['wishlist'] as const,
  cart: () => ['cart'] as const,
  orders: () => ['orders'] as const,
  order: (orderId: string) => ['order', orderId] as const,
  merchantAttention: () => ['console', 'merchant'] as const,
  adminAttention: () => ['console', 'admin'] as const,
} as const;
