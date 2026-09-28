/**
 * The home screen's sections.
 *
 * The web homepage is CMS-driven: an admin orders sections at `/admin/homepage` and
 * `src/modules/merchandising/service.ts` resolves each one. There is no endpoint
 * for it — `docs/API-GAPS.md` §7 asks for `GET /api/homepage`.
 *
 * So these are defined here, and every one is a real query against the documented
 * `/api/products` parameters. None of them invents merchandising: "Just in" is the
 * `newest` sort, the price band is a genuine `maxPrice`. What they are not is the
 * arrangement an admin chose, and Home says so at the foot of the screen rather
 * than implying otherwise.
 *
 * When §7 ships, `useHomeSections()` maps the server's sections into this same
 * shape and this list is deleted. The `kind` field exists for that day: the screen
 * already skips a kind it does not recognise, so the CMS can add one without an
 * app release.
 */

import type { ProductFilters } from '@/api/products';
import { formatMoney, toMajorUnits, type Money } from '@/lib/money';

export type HomeSectionKind = 'product_rail' | 'product_grid';

export interface HomeSection {
  id: string;
  kind: HomeSectionKind;
  title: string;
  /** One line under the title, when the rule is worth stating. */
  subtitle?: string;
  filters: ProductFilters;
  /** Where "See all" goes, as search parameters. */
  seeAll?: ProductFilters;
}

/**
 * The price band, once. The filter wants major units (`999` means the rupee
 * amount a person types) and the title wants a formatted figure, so both are
 * derived from one `Money` — and the symbol comes from `Intl` rather than being
 * typed into a string, which is the rule `docs/design-system.md` sets and the
 * lint enforces.
 */
const PRICE_BAND: Money = { amountMinor: 99_900, currency: 'INR' };

/**
 * `perPage` is small deliberately. A rail shows about two and a half cards; asking
 * for 24 to draw 10 is three quarters of a response body thrown away on a connection
 * the person may be paying for by the megabyte.
 */
export const LOCAL_HOME_SECTIONS: readonly HomeSection[] = [
  {
    id: 'newest',
    kind: 'product_rail',
    title: 'Just in',
    subtitle: 'The most recent listings',
    filters: { sort: 'newest', perPage: 10, inStock: true },
    seeAll: { sort: 'newest', inStock: true },
  },
  {
    id: 'under-999',
    kind: 'product_rail',
    title: `Under ${formatMoney(PRICE_BAND)}`,
    filters: {
      maxPrice: toMajorUnits(PRICE_BAND),
      sort: 'price_asc',
      perPage: 10,
      inStock: true,
    },
    seeAll: { maxPrice: toMajorUnits(PRICE_BAND), sort: 'price_asc', inStock: true },
  },
  {
    id: 'women',
    kind: 'product_rail',
    title: 'For women',
    filters: { gender: 'women', sort: 'newest', perPage: 10, inStock: true },
    seeAll: { gender: 'women', inStock: true },
  },
  {
    id: 'men',
    kind: 'product_rail',
    title: 'For men',
    filters: { gender: 'men', sort: 'newest', perPage: 10, inStock: true },
    seeAll: { gender: 'men', inStock: true },
  },
];
