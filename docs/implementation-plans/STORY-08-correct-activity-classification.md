# [STORY-08] Correct Activity Classification

## Dependency and scope
Depends on Story 07. A correction changes the canonical classification, sets `isManuallyCorrected`, and survives later sync merges.

## Implementation
- Add `updateActivityType(id, type)` to `activityStore`.
- Add an activity detail/edit control with an accessible type selector.
- Reuse the run-only aggregation so daily, weekly, and monthly totals update from store state.
- Import merging must preserve corrected records by stable activity identity.

## Tests and validation
Test correction persistence, recalculated totals, and merge protection. Validate with focused store and classification tests.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.core.js`
**Verified by:** tests.html (Activity classification, De-duplication) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. A correction sets the canonical type and the manual-correction flag, and the de-duplication merge preserves corrected records by stable activity identity across later syncs.
