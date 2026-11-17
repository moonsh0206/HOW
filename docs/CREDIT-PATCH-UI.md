# Footer credit and patch badge polish

## Scope

Only three application files changed: `index.html`, `src/styles/layout.css`, `src/styles/detail.css`. No View logic, patch classification, locale catalog, API, Meta Score, HOT policy, snapshots or automation changed. Existing fan-project/copyright text, logo and footer slogan remain intact. No new font download or library was introduced.

## Design

- Credit: one line with 13px regular `Created by` (#AAB4C3), 9px gap, 20px / 800 italic `MSH` (#F1F4F8), -0.02em letter spacing, and a 26 × 2px underline using `--orange`. MSH uses installed Arial / Segoe UI sans-serif fonts for a natural bold italic rather than the site's upright-only Noto webfont. No plaque, border, background or shadow. PC remains right aligned; the existing mobile full-width credit row remains centered. `translate="no"` keeps the same wording in KO/EN/JA.
- Shared patch tags: inline-flex vertical centering, 11px / 700, 4px radius and thin border. The existing mobile 10px override was removed, retaining compact mobile padding. No added icons; existing translated type labels remain unchanged.
- BUFF: #7FF5B6 / #43D98A / #102B20 (text / border / background).
- NERF: #FF9DB0 / #F35D7B / #331A23.
- MIXED: #E7C77E / #CDA95B / #30291A.
- Adjustment/bugfix retain neutral blue-gray text and border, with a quiet #1C2635 background. No neon or shadow effect.

## Measured verification

`node scripts/qa-credit-patch.cjs before` and `after` capture the actual built site with stored official patch JSON and existing captured API responses. No live API requests or fabricated patch classifications were used. Each phase covers 320 / 390 / 768 / 1280 / 1440 px × KO/EN/JA: 15 configurations, with actual buff, nerf and mixed hero panels in each (45 panels per phase), plus footer captures.

All 15 final configurations pass. Footer contents fit and mobile credit centers correctly. MSH computes as italic / 800 and was visually inspected in Chrome. All badge labels fit without clipping; patch detail pages have zero horizontal overflow. Badge text/background contrast is at least **8.15:1**. Credit text contrast against #10151E is **8.73:1**, MSH **16.58:1**, exceeding 4.5:1 for small text.

Desktop footer height remains **127.58px** at both 1280 and 1440 widths. Mobile/tablet footer height increases by **14.5px** for the larger credit typography; no separate container or row was added. Example KO 390px: **218.86 → 233.36px**.

There is a pre-existing **8px page-wide overflow on the English 320px main tier page**, recorded before and after with no increase. The footer itself fits, and every tested hero patch page has zero overflow. This unrelated main-page issue was not changed in this limited design task. Physical mobile devices and Safari were not tested.

## Checks and artifacts

- Existing regression suite: **306 passed, 0 failed**.
- Production build passed; existing **660 localized HTML entry points** retained.
- Pages verification passed (`/HOW/`, 15 local assets).
- `git diff --check` passed; only LF/CRLF normalization warnings.
- Browser script: `scripts/qa-credit-patch.cjs`.
- Machine-readable before/after measurements: `docs/qa/credit-patch/before/results.json`, `docs/qa/credit-patch/after/results.json`.
- Screenshots: same directories, named `{width}-{language}-footer.png` and `{width}-{language}-{buff|nerf|mixed}.png`.
- Representative after screenshots: [PC footer](qa/credit-patch/after/1440-ko-footer.png), [mobile footer](qa/credit-patch/after/390-ko-footer.png), [PC nerf](qa/credit-patch/after/1440-en-nerf.png), [Japanese mobile mixed](qa/credit-patch/after/390-ja-mixed.png).

No commit, push, deployment or remote modification was performed.
