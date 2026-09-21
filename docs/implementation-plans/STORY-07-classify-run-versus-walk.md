# [STORY-07] Classify Run Versus Walk

## Dependency and scope
Depends on Stories 05/06 and the shared activity store. Client-only MVP uses provider type plus pace heuristics; classification is persisted and only `run` contributes to progress.

## Implementation
- Extend `src/types/activity.ts` with `ActivityType`, `classifiedType`, `autoDetectedType`, and correction metadata.
- Add pure `src/lib/activityClassification.ts` with provider-type normalization and a conservative pace threshold.
- Add activity filters/totals and render type badges in the activity section on `DashboardPage`.
- Keep walks and other activities visible, but exclude them from goal totals.

## Tests and validation
Test provider labels, pace fallback, unknown activities, and run-only totals. Verify imported/manual rows show their classification and that `tests.html` passes.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.core.js`
**Verified by:** tests.html (Activity classification) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Provider type normalisation plus the conservative pace heuristic live in `app.domain.js`, walks stay visible but excluded from goal totals, and the suite now runs in `tests.html` rather than via `npm test`.
