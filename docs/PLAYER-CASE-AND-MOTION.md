# Player search casing and UI motion

## Provider evidence and limits

On 2026-11-12, three read-only calls to `/players?name=…&limit=20&offset=0` returned HTTP 200: `TeKrop` = 1 result; `tekrop` = 0; `TEKROP` = 0. Raw evidence is in `docs/qa/micro-interactions/live-case-search.json`. The provider's [public OpenAPI schema](https://overfast-api.tekrop.fr/openapi.json) exposes name/order_by/offset/limit, no case-insensitive parameter. This verifies these examples, not every possible account.

HOW now remembers verified successful search spellings in Provider memory, and seeds known display names from saved player favorites. Always run the exact query first. Only when it returns zero, and exactly one known spelling exists for the folded query, try that spelling through the existing URL-keyed cache/pending/error machinery. No case permutation enumeration, fuzzy ID matching, nickname merging or hardcoded TeKrop alias. Exact results win; ambiguous spellings remain unresolved. Original IDs, BattleTags and names are preserved.

The fallback costs at most one additional search request if the known spelling is not cached; no extra summary/career call is introduced. A normal unknown query still costs one request. Existing cooldowns, timeouts and pending Promise identity are retained. Casing knowledge from successful searches lasts for the Provider session; saved favorites seed it after reload. First-time unknown mixed-case accounts still require exact spelling. A localized guide explains this limitation.

Actual HOW Provider verification then searched TeKrop → tekrop → TEKROP. All returned the same original public account, with three network calls total: the two fallback lookups reused the cached exact response. See `live-how-search.json`. This does not establish universal case-insensitive discovery.

## Motion

- Existing route/ARIA-driven menu highlights retain their 2px orange underline; opacity/scaleX and color transition in 180ms. No route code or menu geometry changes.
- Button transitions: 140–160ms; enabled action presses scale to .98. Combobox options and stars are excluded from press scaling. Existing focus outlines remain.
- Hover-capable fine pointers: player/hero cards move up 2px over 200ms, with a restrained background/border change. Table rows change background only. No size changes or heavy shadow/blur.
- Favorites remain transparent on registration, hover, focus and press; only star color/glyph changes. Card link and favorite button remain separate controls.
- Existing combobox style/keyboard behavior retained; popup entry lasts 160ms. Closing remains immediate to preserve hidden/focus behavior.
- Player result sets reveal over 180ms only when their ordered player IDs change. Rank updates and favorite state updates of the same IDs do not replay. No whole-page or asynchronous partial-profile fade is added; scroll restoration remains untouched.
- `prefers-reduced-motion: reduce` disables all new CSS motion and result-reveal animation. No timers or extra API requests drive effects.

## Changed files

`src/services/overfastPlayerProvider.js`, `src/controllers/playerSearchController.js`, `src/views/playerSearchView.js`, `src/views/contentMotion.js`, `src/styles/interactions.css`, `src/main.js`, `src/i18n/ko.js`, `src/i18n/en.js`, `tests/playerCaseMotion.test.js`, `scripts/qa-micro-interactions.cjs`, this report and `docs/qa/micro-interactions/` evidence.

Earlier uncommitted daily-rank work remains intact. Meta algorithms, raw snapshots, SEO and URL structures were not changed by this task. No library, collection schedule, remote write or deployment was added.

## Validation

265 tests pass (261 existing + 4 new). Build passes and still generates 440 localized HTML entries. Pages verification and `git diff --check` pass (line-ending warnings only).

Chrome checks use captured real API responses and actual stored hero statistics, separate from the live read-only Provider checks above. Widths: 320/375/390/430/1440. Checks cover route/back/forward/refresh, KO/EN, active menus, unchanged favorite IDs and transparent backgrounds, reduced-motion popup/transition suppression, no horizontal overflow and no page errors. Screenshots and browser results are saved under `docs/qa/micro-interactions/`. Physical touch devices and Safari were not tested.
