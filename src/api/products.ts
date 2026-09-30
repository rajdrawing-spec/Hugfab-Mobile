/**
 * The catalogue. `GET /api/products`, `GET /api/products/:slug`, `GET /api/search`
 * — all three live today and all three are public, so these work signed out.
 */

import { apiFetch } from './client';
import type { Paginated, ProductDetail, ProductSummary } from './types';

/** Exactly the parameters `docs/api.md` documents. Nothing invented. */
export interface ProductFilters {
  q?: string;
  /** Slugs. Sent comma-joined, which is what the route parses. */
  brand?: readonly string[];
  /** One slug. Includes descendants: `topwear` returns hoodies. */
  category?: string;
  gender?: 'women' | 'men' | 'unisex' | 'kids';
  retailer?: readonly string[];
  /** **Major** units, as typed into a filter: 2000 means ₹2,000. */
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  /** 1–60, default 24. */
  perPage?: number;
}

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
] as const;

export function listProducts(
  filters: ProductFilters = {},
  signal?: AbortSignal,
): Promise<Paginated<ProductSummary>> {
  return apiFetch<Paginated<ProductSummary>>({
    path: '/api/products',
    query: {
      q: filters.q,
      brand: filters.brand,
      category: filters.category,
      gender: filters.gender,
      retailer: filters.retailer,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      inStock: filters.inStock,
      sort: filters.sort,
      page: filters.page,
      perPage: filters.perPage,
    },
    signal,
  });
}

/**
 * `q` is required here and the route answers 400 without it — so the search screen
 * calls `listProducts` while the box is empty and this once it is not. The URL is
 * the one to keep: Phase 2 puts vector similarity behind it.
 */
export function searchProducts(
  filters: ProductFilters & { q: string },
  signal?: AbortSignal,
): Promise<Paginated<ProductSummary>> {
  return apiFetch<Paginated<ProductSummary>>({
    path: '/api/search',
    query: { ...filters, brand: filters.brand, retailer: filters.retailer },
    signal,
  });
}

/** 404 for a slug that does not exist, is inactive, or is a seed row. */
export function getProduct(slug: string, signal?: AbortSignal): Promise<ProductDetail> {
  return apiFetch<ProductDetail>({
    path: `/api/products/${encodeURIComponent(slug)}`,
    signal,
  });
}
