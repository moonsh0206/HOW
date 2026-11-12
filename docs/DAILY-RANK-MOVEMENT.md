# Daily role ranking observations

## Implemented locally

- Reporting day: 10:00 Asia/Seoul to the next 10:00 (01:00 UTC).
- Representative: earliest stored, policy-stamped observation in each reporting day. No interpolation, no older-date substitution, no live API value treated as a stored observation.
- Compare identical platform/mode/region/division/map, policy ID, patch/window and role roster. Both role cohorts must be complete and classified. Composite history uses existing same-batch complete-original validation.
- Compute both rankings with the unchanged production Meta Score and recommendation ordering. Delta = previous ordinal minus current ordinal. Search/favorite filtering does not renumber.
- Show only for a specific role in HOW tier order. If live list order differs from the stored current order, suppress the entire role comparison. Other pages do not render the marker.
- Invalid/missing/quality-review records, missing day, changed policy/roster, history read failure: no marker. History loading is optional and generation-guarded; language transfer reloads the same history.
- New batches include `rankPolicyId` and `rankRoster`; original and composite restoration retain them. Old files remain untouched and unstamped observations are deliberately not assigned a historical policy. Policy ID must be bumped on future eligibility/scoring/tie changes.

## Collection is NOT activated

Existing daily/patch snapshot workflows are manual-only. The daily diamond collector does not currently guarantee nine divisions, three regions or permanent daily publication.

`docs/proposals/daily-rank-snapshots.yml.example` is an inert replacement template with exactly one `0 1 * * *` cron. It runs the existing grouped collector sequentially for Asia/Europe/Americas: at most 27 original requests, with existing quality checks, locks, per-region/day guard, duplicate-response rejection and atomic index persistence. No automatic commits or push. Existing daily workflow comment points to this replacement; do not activate both.

Before operational activation: approve replacing the manual daily workflow, provide persisted archive continuity between runners, review partial-batch recovery and authorize a separate publication mechanism. Artifacts alone are not published Pages data and clean runners do not automatically restore yesterday's artifact. Actions cron can start late; actual collection timestamps, not scheduled times, determine the reporting day. API Age remains separate from collection time; unknown source aggregation time remains unknown.

Identical cached/content batches are still rejected by existing persistence. A skipped observation is not fabricated into today's point, including an unchanged-rank `=`. Missing dates therefore remain legitimately unavailable. Existing v1 JSON, HOT comparison, retention, actual snapshots and Meta policies were not edited.

## Verification

Fixture tests cover +2/-2/unchanged, 10:00 boundary, earliest observation, missing/old/wrong-cohort/policy/role/quality records, role and sorting eligibility, search ordinal preservation, PC/mobile DOM equality, KO/EN tooltips and inactive workflow configuration. Fixtures are tests only, never copied into public snapshots.

Final results: 261 tests passed (255 existing + 6 new), build passed with 440 localized HTML entry points, Pages verification passed, `git diff --check` passed (line-ending warnings only). Chrome fixture rendering passed at 320/375/390/430/1440 px with no horizontal overflow; `docs/qa/daily-rank/browser.json` explicitly labels these fixture-only. Existing actual-data Phase 5 browser regression also passed all five widths; its captures are under `docs/qa/daily-rank/regression/`. Fixture screenshots do not demonstrate newly collected production observations. No live collection, snapshot mutation, schedule activation or remote write was performed.

Changed source files: `src/models/dailyRankModel.js`, `src/models/heroModel.js`, `src/models/compositeHistoryModel.js`, `src/models/snapshotV2Model.js`, `src/controllers/heroController.js`, `src/views/heroView.js`, `src/styles/main.css`, `src/styles/navigation.css`, `src/i18n/ko.js`, `src/i18n/en.js`, `scripts/lib/divisionBatch.js`. Tests/QA: `tests/dailyRank.test.js`, `scripts/qa-daily-rank.cjs`. Scheduling: only explanatory comments in `.github/workflows/daily-snapshots.yml` and the inactive replacement template listed above.
