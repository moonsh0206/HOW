# HOW HOT v2

## Policy and scope

`INSIGHT_POLICY` now defines `hotWinDelta = 0.5`, `hotPickDelta = 1`, `minPickRate = 1`, `maxHotHeroes = 3`, and `hotVersion = hot-v2`. Both percentage-point increases are required. Threshold comparisons tolerate only floating-point subtraction noise (1e-9 percentage points). Order: win-rate increase descending, pick-rate increase descending, then stable hero key. These are operational minimum changes, not statistical significance or sample-confidence estimates.

Existing provenance, original/derived policy, cohort, patch/window, composite timing tolerance, 1–7 day interval, review/missing and stale-data checks remain unchanged. A missing comparison stays unavailable; a valid comparison with zero candidates uses the requested KO/EN empty message. No new observations or historical replacements are created.

PC shows both deltas per hero. Mobile retains the compact first hero and its pick delta; opening the existing details exposes that hero's win delta, both deltas for the remaining heroes, collection times in KST, criteria and statistical-significance disclaimer. The existing design, DOM disclosure/focus handling and source-window warning remain intact.

## Actual archive comparison

Read-only command: `node scripts/report-hot-v2.js`. All existing snapshot/index file SHA-256 hashes are checked before/after. The report restores 50 actual original/derived observations and finds only two same-cohort 1–7 day historical comparison pairs. Output: [full before/after table](qa/hot-v2/COMPARISON.md), [values and hashes](qa/hot-v2/comparison.json).

| Asia / PC / competitive / all maps | Original observations (UTC) | HOT v1 top 3 | HOT v2 top 3 |
|---|---|---|---|
| All divisions | Nov 2 → Nov 6 | Kiriko, Junker Queen, Brigitte | Junker Queen, Illari, Mauga |
| Diamond | Nov 4 → Nov 6 | Kiriko, Junker Queen, Illari | Junker Queen, Lifeweaver, Illari |

For Diamond, Junker Queen increases W +13.8 pp / P +12.6 pp, Lifeweaver W +9.8 pp / P +1.9 pp, and Illari W +6.5 pp / P +6.7 pp. Kiriko's W +5.5 pp / P +15.6 pp qualifies but now ranks below those three. This demonstrates the requested win-first priority; it does not establish that these heroes are statistically stronger or that the policy is optimal. All-divisions and Diamond records are never mixed. There is no earlier complete same-batch cumulative-divisions history to manufacture a diamond_plus comparison.

Both available comparisons have unverified patch aggregation windows. Existing general-observation comparisons are preserved with the warning; no patch effect or causal claim is made. Only two pairs are insufficient to tune a new combined score. Retain the requested ordering initially. A possible later experiment is a narrow win-change tie band followed by pick-change ordering, if larger same-window history shows disproportionate sensitivity to tiny win differences; it is not implemented here.

## Validation and changed files

- 270 tests pass: 265 existing plus 5 new HOT v2 tests. Coverage includes flat/declining win, exact/near thresholds, 0–2 candidates, missing/review data, cohort/patch/window safety, ordering/cap, input immutability and KO/EN responsive View rendering.
- Build passes (440 localized public HTML entries), Pages verification passes, `git diff --check` passes (line-ending warnings only).
- Chrome 320/375/390/430/1440 px × KO/EN: 10 checks passed. Actual saved Diamond observations render three correctly ordered heroes; the existing disclosure exposes both changes, criteria and KST observations. No horizontal overflow or page errors. Empty-state checks use a test-only equal-values condition, never saved as operating statistics.
- Screenshots and machine-readable results: `docs/qa/hot-v2/`. Physical mobile devices/Safari were not tested. No live collection was needed.

Changed for this task: `src/domain/insights.js`, `src/views/insightView.js`, `src/i18n/ko.js`, `src/i18n/en.js`, `tests/hotV2.test.js`, `scripts/report-hot-v2.js`, `scripts/qa-hot-v2.cjs`, this document and QA output. Earlier uncommitted work is preserved. Meta Score, tier policies, snapshot originals, player search, automation and SEO are unchanged. No commit, push or deployment was performed.
