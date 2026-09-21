# [STORY-11] View Monthly Goal Progress

## Dependency and scope
Depends on Story 09 and the existing goal store. Current-month progress is run-only and includes all activities in the goal month.

## Implementation
- Add `src/lib/monthlyProgress.ts` for total, percentage, remaining distance, and catch-up average.
- Add a monthly progress card and month history-friendly derived selectors.
- Preserve goal units in presentation while aggregating canonical kilometres.

## Tests and validation
Cover zero goal, over-target, month boundaries, and unit conversion. Run focused monthly progress tests.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.progress.js`
**Verified by:** tests.html (Monthly progress, Distance/units) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Totals, percentage, remaining distance and catch-up average aggregate canonical kilometres while presentation keeps the goal's unit.
