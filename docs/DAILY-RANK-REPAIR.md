# Daily rank visibility repair and UI consistency

## Confirmed operating evidence (2026-11-17)

Read-only public checks are saved in `docs/qa/rank-repair/`. The final operating snapshot at **10:51:30 KST** found:

| Hypothesis | Evidence and classification |
|---|---|
| Workflow itself disabled | Public GitHub API reports `daily-ranks.yml` **active**. The remote workflow file also contains `0 1 * * *`, manual dispatch and the main/variable job gate. It was created Nov 16 at 13:04 KST. Do not call it disabled. |
| Incorrect `HOW_RANKS_ENABLED` / `HOW_RANKS_URL` | **Unknown**: repository-variable REST access returned HTTP 401. No secrets/settings were read or changed. The code requires `HOW_RANKS_ENABLED=true` and an HTTPS published baseline URL. |
| Scheduled run or failure | The public workflow-specific runs endpoint reports **total_count: 0**. No daily run/job log exists to inspect. It is unproven whether this is scheduler delay, configuration or another GitHub-side condition. |
| Collection successful but unpublished | No evidence of a daily collection or publication. Other Pages/patch runs exist, but they do not establish a successful daily rank run. |
| Pages overwritten by later deploy | No earlier nonempty publication was found, so overwriting is **not established**. Local normal/patch/graph builders already share `pages` concurrency and gated restore-only rank steps. No workflow change was required here. |
| Today/yesterday valid ranks | Public Pages returns HTTP 200 and `{schemaVersion:1, generatedAt:null, cohorts:[]}`. The remote Git default file and local default file are also empty, but were checked **separately**. Thus there is no public baseline, comparison or delta to display. This is the direct observed reason for present operating absence. |
| Cache/window/quality rejection | Cannot evaluate against real rank rows because none are published. Existing cache/day/cohort/window/quality and partial-failure tests remain in place. No unproven policy relaxation was applied. |
| UI hides otherwise valid comparison | Confirmed by source and fixture: the old whole-role exact-live-order check erased every valid daily delta when a later API update reordered the role. The secondary Model ordinal check erased it again. This is a separate reproduced display limitation, **not a claim that it caused the currently empty public JSON**. |
| Language/filter refresh loses ranks | New valid-record browser tests cover KO→EN→JA→KO and Asia→Europe / diamond_plus→master_plus→diamond_plus. Key-based comparisons remain stable. Existing late-response guards, snapshot/cache and language transfer are unchanged. |

Sources: [public ranks](https://moonsh0206.github.io/HOW/data/ranks/current.json), [workflow metadata](https://api.github.com/repos/moonsh0206/HOW/actions/workflows/daily-ranks.yml), [daily run history](https://api.github.com/repos/moonsh0206/HOW/actions/workflows/daily-ranks.yml/runs?per_page=8), [remote workflow](https://github.com/moonsh0206/HOW/blob/main/.github/workflows/daily-ranks.yml). Saved initial/final responses include UTC observation times and HTTP status. Settings and nonexistent job logs are explicitly unverified.

## Fix and meaning

Options considered:

1. Keep hiding mismatched live order: safe but throws away an otherwise valid daily comparison.
2. Replace the live list with morning rankings: changes the existing live-statistics/list semantics and was rejected.
3. **Chosen:** preserve both meanings. The large ordinal is still the current live list ordinal. The small `▲/▼/=` is explicitly the two stored 10:00-KST-reference observations. A visible localized note explains that the current displayed order may differ. Tooltip/accessibility text names the two stored positions and actual observed timestamps in KST.

For example, stored yesterday rank 3 → stored today rank 1 remains `▲2`, even if the later live list shows rank 3. It is never recalculated as yesterday minus live. Stored comparisons and raw archive format are unchanged. The returned View data now distinguishes `currentRank` (stored), `previousRank` (stored), and `liveRank`, with `basis: daily-observation`. Diagnostics retain the distinction through `ready-stored-order`.

Full role membership, current classified data, current reporting date, no future time, exact cohort/policy/roster and a valid consecutive-day baseline are still required. All-role and non-tier sorts remain excluded. Search/favorites preserve the full-role ordinal and daily delta. Legacy snapshot markers retain their original guard.

A validation gap was also closed: individually small integer deltas could previously reconstruct duplicate/out-of-range previous positions. The validator now requires reconstructed previous positions to be exactly the role permutation 1…N. Corrupt deltas do not render.

The visible note gives concise loading/missing-day/first-day information without exposing diagnostic codes or error payloads. No fake baseline, trial API collection, date backfill, new rank field storage, Meta/tier policy change or graph/HOT data mutation was performed.

## UI scope from attached request

The four screens were reviewed with the existing HOW controls. The confirmed visual inconsistency was underlined hero-detail tabs versus filled rounded role filters. Detail tabs now reuse the role-filter visual language: dark inset group, thin existing line color, 8px group / 6px button radius, orange selected background, muted inactive text, 44px minimum target, 180ms transition, distinct blue keyboard focus and reduced-motion suppression. Routes, contents, passive/perk grouping, counters and synergies stay unchanged. Other cards/forms already use the existing design system and were not redesigned.

The prior 320px English main overflow was measured at **8px** and traced to the header language control ending at x≈328. The ≤360px header gap was reduced to 5px, including the more-specific compact-list selector. Logo size, language control, menu positions, touch sizes and header height were retained. All 18 final rank-browser combinations have **zero** horizontal overflow.

Existing uncommitted footer-credit and patch-badge changes (`index.html`, parts of `layout.css` / `detail.css`, credit QA files) were preserved; they are not new work in this repair.

## Verification and boundaries

- Existing regression suite plus 3 new tests: **309 pass**. Existing guard assertions were updated to assert the new explicit stored-vs-live semantics, with missing-membership/policy/date/quality protection retained and strengthened.
- Production build: **660 localized public HTML entries**. Pages verification passes; `git diff --check` passes (line-ending warnings only).
- `scripts/qa-rank-repair.cjs`: two-day in-memory collector → comparison → static HTTP JSON → production build → browser render. **18 KO/EN/JA × 320/390/768/1024/1280/1440 cases pass**, including search/sort/all-role exclusion, plus active language/region/composite-filter switches at 390px. These use explicitly synthetic test fixtures, never `public/data/ranks/current.json` and never a claimed successful GitHub run. Data has 9 test heroes; it is not a real 54-hero collection.
- `scripts/qa-rank-repair-ui.cjs`: existing captured-real-data Japanese UI regression expanded to six widths, with KO/EN main, hero detail, search and player-profile captures and tab checks. Language priority, no reload, no extra statistics fetch on language switch, back/forward, favorites, graph metric switches and actual stored perk rates remain passing. Six viewport scenarios and six locale-priority cases pass. Existing Japanese before screenshots provide the PC/mobile tab comparison; KO/EN additional four-screen captures are final-state coverage.
- Existing tests cover first/second day, 10:00 day rollover, missing days, 429/503/timeouts, partial cohorts, policy/hero-role changes, cache expiration, duplicate day, failed restore/atomic replacement, normal/patch/graph rank preservation and publication verification.
- This is **local simulated publication** and actual Chrome rendering, not an actual remote collection/deployment test. Physical devices/Safari were not tested.

Evidence: `docs/qa/rank-repair/render/results.json`, `before-ui/`, `after-ui/`, and public HTTP responses. Examples: [mobile daily delta](qa/rank-repair/render/390-ko-stored-vs-live.png), [PC daily delta](qa/rank-repair/render/1440-en-stored-vs-live.png), [tabs before](qa/rank-repair/before-ui/390-abilities.png), [tabs after](qa/rank-repair/after-ui/390-abilities.png).

## Actual operating next steps — user approval required

1. In repository Settings → Secrets and variables → Actions → Variables, verify `HOW_RANKS_ENABLED` is exactly `true` and `HOW_RANKS_URL` is exactly `https://moonsh0206.github.io/HOW/data/ranks/current.json`. The URL already responds; no guessed replacement endpoint is needed.
2. In Actions → Lightweight daily role ranks, inspect whether manual dispatch is available and run it on **main** only after approval. If no scheduled run appears, inspect GitHub Actions availability/settings and schedule delivery; zero run history is not proof that a variable is false. Do not change the 10:00 KST cron to invent an explanation.
3. Confirm restore, 27-original-cohort collection, tests/build/Pages deployment and the `confirmed-rank-publication` receipt. The first actual day should publish ranks with no comparison; `▲/▼/=` must wait for a valid consecutive reporting day.
4. Check the public JSON after daily publication and after ordinary/patch/graph deployment. Confirm nonempty correct-date cohorts and appropriate comparison/deltas; keep previous successful data on failures.
5. Deploy this local display fix only after review/approval. It cannot create missing operating history by itself.

No repository variable, workflow activation, commit, push, remote branch, Pages deployment or operating JSON was modified.

## Files changed for this repair

`src/models/rankArchiveModel.js`, `src/models/heroModel.js`, `src/views/heroView.js`, `src/i18n/{ko,en,ja}.js`, `src/styles/{main,detail,navigation}.css`, `tests/rankRepair.test.js`, the new-policy assertions in `tests/{lightweightRanks,insightDiagnostics}.test.js`, `scripts/qa-rank-repair{,-ui}.cjs`, and a tooltip-prefix compatibility check in `scripts/qa-lightweight-ranks.cjs`. This document and QA evidence are added. No backend collection/restore/workflow changes were justified by the available evidence.
