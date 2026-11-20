# Sparse facet hologram polish — 2026-11-20

## Scope

Only dashboard background light texture was changed. Existing uncommitted perk panels and other work are preserved. No statistics, API policy, Meta Score, card dimensions, cycle logic, routing or deployment settings were changed. No commit, push or deployment was performed.

## Implementation

- `src/styles/panelEffects.css`: replaced broad cloud lights with sparse angular light planes. Two large planes use a static SVG alpha mask; two additional planes use CSS polygons and soft gradient masks. There are no tiled textures, repeating gradients or outline patterns. TOP cards retain cool cyan/steel/violet light; spotlight retains restrained amber light.
- `src/assets/hologram/facets-{tank,damage,support,spotlight,heading}.svg`: five distinct masks, each with two differently sized/angled polygons. A static 0.7-unit SVG blur softens edges. External Vite assets (`?no-inline`) keep fragment references inside SVG files and avoid nested data-URI URL parsing issues in the existing Pages verifier.
- `src/views/metaDashboardView.js`: shared layer creation, different timing/phase per role, and a quieter heading/search background. Existing visibility observer now tracks heading and cards independently and disconnects on destruction.
- `tests/hologramFacets.test.js`, `tests/metaDashboard.test.js`: sparse/distinct asset structure, timing, visibility and cleanup coverage.
- `scripts/qa-facet-hologram.cjs`: real Chrome motion/responsive checks. Existing organic/perk QA selectors were scoped to cards so the additional heading layer does not change their card counts.

| Layer duration | Tank | Damage | Support | Spotlight | Heading |
|---|---:|---:|---:|---:|---:|
| A | 18s | 20s | 17s | 19s | 16s |
| B | 24s | 27s | 23s | 26s | 28s |
| C | 14s | 17s | 13s | 16s | 18s |

Layers use different negative phase offsets. A/B move less than 20px between extrema, with small scale changes; C changes opacity only. Reduced Motion shows static planes immediately. Offscreen/background effects pause. No new JavaScript animation timer was added.

## Browser evidence

Chrome headless, production build at `/HOW/`, using captured real API responses replayed for repeatability; this is not a new live API validation. External portraits remain normal image requests. The auto-cycle was paused for the timed texture captures, then resumed for three real transitions.

| View | Before | 5 seconds | 10 seconds | 20 seconds |
|---|---|---|---|---|
| 390px | [before](qa/facet-hologram/before/390.png) | [5s](qa/facet-hologram/motion/390-05000.png) | [10s](qa/facet-hologram/motion/390-10000.png) | [20s](qa/facet-hologram/motion/390-20000.png) |
| 1440px | [before](qa/facet-hologram/before/1440.png) | [5s](qa/facet-hologram/motion/1440-05000.png) | [10s](qa/facet-hologram/motion/1440-10000.png) | [20s](qa/facet-hologram/motion/1440-20000.png) |

The texture now has broad asymmetric diagonal faces rather than only mist. Geometry remained identical before/after: 390px TOP card height 156px and spotlight 126px; 1440px all four card heights 128px. Heading heights remain 126.25px / 44px respectively. All five timed frames preserve those dimensions.

Real auto-cycle verification: 5.5s initial dwell, subsequent intervals approximately 6.06–6.11s including the existing 520ms transition. Intermediate transform/opacity states were observed, all three roles remained synchronized, and card geometry did not change.

Motion results: [machine-readable evidence](qa/facet-hologram/motion/results.json). Heading/card offscreen pausing and Reduced Motion passed independently. A controlled 2-second CDP trace of the new layers recorded 0 layouts and 0 Paint events on both viewports. Existing magma/aura effects were paused only during that isolated measurement; this is not an OS CPU/FPS benchmark or a claim about all existing effects.

## Validation

- `npm test`: 373 passed, 0 failed, 0 skipped.
- `npm run build`: passed; 663 localized public entry points. Existing bundle-size warning remains.
- `npm run verify:pages`: passed, `/HOW/`, 23 local assets.
- Responsive QA: 320/390/430/1440/1920px, Korean/English/Japanese, Reduced Motion, no horizontal overflow, and dashboard search navigation. Results: [responsive JSON](qa/facet-hologram/responsive/results.json).
- `git diff --check`: passed.

Remaining limits: screenshots and sampled computed styles document motion, rather than a video recording; no physical low-end mobile device or OS-level GPU/CPU benchmark was used. The intentionally faint planes may appear differently with display brightness/contrast settings.
