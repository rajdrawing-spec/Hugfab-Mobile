# Device QA

The checks that cannot be done from CI, written down so they can be run the
moment an Android phone is in the room.

**Why this file exists.** Every gate this repository has — typecheck, lint,
format, 89 unit tests, an Android bundle — runs without the app ever having
spoken to HugFab. The container it was built in cannot reach `hugfab.com`
(the network policy answers 403 to CONNECT) and has no device or emulator. So
nothing below has been done, and none of it can be faked from here. This is the
list of things that are still unknown, not a list of things that passed.

Record results in this file as you go: `✅` with the date, or a note. An entry
with no mark has not been run.

---

## Before you start

| | |
|---|---|
| Phone | Android 10 or newer, Expo Go installed |
| Network | The phone and the dev machine on the same Wi-Fi |
| `.env.local` | `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Account | A real HugFab account, and ideally a second one with a shop |

Two things to confirm first, because everything below is meaningless otherwise:

1. **`main` is deployed.** `curl https://hugfab.com/api/health` and check `sha`
   against the commit you expect. Merging is not deploying.
2. **The anon key is the anon key.** `EXPO_PUBLIC_*` is inlined into the bundle
   and readable by anyone with the APK. If `SUPABASE_SERVICE_ROLE_KEY` is in
   `.env.local`, stop and remove it.

```
npx expo start          # then scan the QR code
```

---

## 1. The thing nothing here has ever done

**A successful API response.** Everything else on this page assumes it.

- [ ] Home loads a product grid from the live catalogue.
- [ ] The products are real — not `isMock: true`. The app renders a mock flag
      honestly, so if one appears, the deployment is seeded, not broken.
- [ ] A price reads as `₹1,899`, not `₹189900` and not `₹1899.00`. A wrong
      figure here means `amountMinor` is being read as a major unit somewhere,
      and it is the single highest-consequence bug the app could have.

## 2. Catalogue, signed out

- [ ] Home: category rail, product rails, search bar with camera affordance.
- [ ] Discover: collections load.
- [ ] Search: a query returns results; an impossible query shows the empty
      state, not an error.
- [ ] Filter and Sort sheets open, apply, and the grid changes.
- [ ] Product detail: gallery pages, every offer listed, best price marked.
- [ ] **Tags** render under Details as labels.
- [ ] `AffiliateNote` is visible on every surface with a Buy button (PRD §74).
- [ ] Buy opens the retailer via `/api/affiliate/click` — check the URL that
      opens is HugFab's redirect, never the retailer's tracked link directly.

## 3. Signing in

- [ ] Sign in with a real account.
- [ ] Wrong password: Supabase's own message, not a rewritten one.
- [ ] **Forgotten password**: the email arrives; the link opens the *website*'s
      `/reset-password`; the new password then works in the app.
- [ ] Forgotten password with an address that is **not** registered shows the
      same "check your email" screen. Any difference between the two is an
      account-enumeration leak and a release blocker.
- [ ] Kill the app and reopen: still signed in, and no flash of the signed-out
      state on launch.

## 4. Account

- [ ] Order count and wishlist count appear.
- [ ] Recent orders list; tapping one opens the order.
- [ ] Order detail: lines, shipment tracking, return status.
- [ ] Wishlist: add from a product card, remove from the list.
- [ ] Console entry point appears for a seller/admin account and is **absent**
      for a plain shopper (it answers 404 on purpose; a shopper must not be told
      their dashboard is "coming soon").

## 5. Addresses

New, and the least exercised code in the app.

- [ ] The list loads.
- [ ] Add an address; it appears, and the **first** one is automatically the
      default.
- [ ] Edit it; the change sticks.
- [ ] Add a second; make it the default; the badge moves.
- [ ] Delete the default; another one becomes the default without being asked.
- [ ] **A bad PIN code** (`012345`, or `12345`) shows the server's message
      *under the PIN field*, not as a banner and not as the string `A`. That
      last failure mode is what the field-error fix was for.
- [ ] A bad mobile number (`1234567890` — Indian mobiles start 6-9) likewise.
- [ ] An address saved here appears in checkout **on the website**. Same book.

## 6. Security

- [ ] "Sign out everywhere else" on the phone, with the website signed in on a
      laptop: the laptop is signed out, **the phone is not**.
- [ ] Plain "Sign out": the phone signs out and the laptop stays signed in.
      This is the regression that `scope: 'local'` fixed — if the laptop also
      drops, the global default is back.

## 7. The three states

For each of Home, Discover, Search, Wishlist, Orders, Addresses:

- [ ] **Skeleton** while loading — never a spinner.
- [ ] **Empty** says what to do next.
- [ ] **Error** says what happened and offers Retry where retrying could help.

Force the error state by turning off Wi-Fi and mobile data, then opening the
screen. Expect "Could not reach HugFab", not a blank page and not a crash.

## 8. Failure and recovery

- [ ] Airplane mode mid-scroll: an error state, and Retry works once
      reconnected.
- [ ] Slow connection (Android developer options → Network throttling): the
      skeletons stay up; nothing flashes empty-then-full.
- [ ] **Token expiry.** Leave the app backgrounded for over an hour, then
      foreground it and open Account. It should refresh silently. This is what
      `startSessionRefresh` and the single 401-replay exist for, and a timer in
      a backgrounded RN app is exactly where it goes wrong.
- [ ] A 500 shows the request id, so a bug report can quote it.

## 9. Navigation and chrome

- [ ] Five tabs, AI raised, labels not truncated — "Community" is the widest
      and was the one that broke before `c423152`.
- [ ] Android hardware back from every screen lands somewhere sensible, and
      from a tab root it leaves the app rather than looping.
- [ ] Deep-ish stacks (Home → product → offers) unwind correctly.
- [ ] Onboarding shows once on first launch, never again after.
- [ ] The splash does not flash a white frame before the pink.
- [ ] Rotate: no clipped layouts. (The app is portrait-first; this is a check
      that nothing crashes, not a landscape design review.)

## 10. Accessibility

- [ ] TalkBack: every control announces a name and a role. The tab bar, the
      wishlist heart and the Filter/Sort row are the ones to check.
- [ ] Font size at maximum (Settings → Display → Font size): no clipped labels
      or unreachable buttons.
- [ ] Tap targets are reachable one-handed on a 6"+ phone.

## 11. Appearance

- [ ] The launcher icon is the pink H, not the Expo chevron. (Placeholder
      artwork — see `docs/PRODUCTION-READINESS.md` §7.)
- [ ] The adaptive icon is not clipped by the launcher's mask.
- [ ] Nothing renders a hardcoded `₹`, hex or font size that disagrees with the
      rest of the app — a visual sweep for drift from `tokens.json`.

---

## What a failure here means

A failure in §1 or §5 is a contract mismatch between this app and HUGFAB-AI,
and the fix is usually in the mirrored types in `src/api/types.ts` — those are
hand-copied, which is exactly the kind of thing a real response catches and a
unit test cannot.

A failure in §6 is a security regression and blocks a release.

Everything else is ordinary. Log it, fix it, re-run the section.
