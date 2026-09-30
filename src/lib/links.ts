/**
 * Leaving the app.
 *
 * Two kinds of outbound link, and they are not interchangeable.
 */

import * as WebBrowser from 'expo-web-browser';
import { buildUrl } from '@/api/client';
import { color } from '@/theme';

/**
 * A retailer click-out.
 *
 * `clickPath` is HugFab's own `/api/affiliate/click?...` route, which **302s** to
 * the retailer. It has to be opened in a browser, not fetched: the redirect is
 * where attribution is recorded, the destination sets cookies the retailer needs
 * to credit the sale, and a `fetch` would follow the redirect into a response
 * body nobody reads and no commission.
 *
 * The retailer's tracked URL is deliberately never exposed to this app, so
 * `clickPath` is the only thing to open. Never construct a destination here.
 */
export async function openClickOut(clickPath: string): Promise<void> {
  await WebBrowser.openBrowserAsync(buildUrl(clickPath), {
    // The in-app browser keeps the person a back-swipe from the app, which a
    // hand-off to Chrome does not.
    toolbarColor: color('surface'),
    controlsColor: color('primary'),
    enableBarCollapsing: true,
  });
}

/**
 * A HugFab page the app does not have yet — a web checkout, an order's return
 * form, a wishlist while `docs/API-GAPS.md` §2 is outstanding.
 *
 * Signing in again in that browser is the known cost: the session lives in this
 * app's storage, not in the browser's cookie jar. It is honest about the seam
 * rather than hiding it, and it is why these are listed as gaps to close rather
 * than as a design.
 */
export async function openWebPage(path: string): Promise<void> {
  await WebBrowser.openBrowserAsync(buildUrl(path), {
    toolbarColor: color('surface'),
    controlsColor: color('primary'),
  });
}

/**
 * Somebody else's URL — a courier's tracking page, say.
 *
 * Distinct from `openWebPage`, which takes a **path** and prefixes the HugFab
 * base. Handing this an absolute URL through that function would produce
 * `https://hugfab.com/https://courier.example/track/...` and a dead link.
 *
 * Only http(s) is opened. A `javascript:` or `intent:` URL arriving in a field
 * that is supposed to hold a courier's address is either a mistake upstream or
 * an attempt at something, and neither is worth handing to a browser.
 */
export async function openExternal(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return;

  await WebBrowser.openBrowserAsync(parsed.toString(), {
    toolbarColor: color('surface'),
    controlsColor: color('primary'),
  });
}
