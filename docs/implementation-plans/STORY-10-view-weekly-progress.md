# [STORY-10] View Weekly Progress

## Dependency and scope
Depends on Story 09. Weekly progress is derived, never duplicated in storage.

## Implementation
- Add `src/lib/weeklyProgress.ts` to aggregate planned/actual daily rows and remaining distance.
- Add a responsive weekly progress card with achieved/missed state for completed weeks.
- Use run-only activity totals and current plan week boundaries.

## Tests and validation
Test week boundaries, remaining distance, and achieved/missed states. Validate dashboard rendering at mobile width.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.progress.js`
**Verified by:** tests.html (Weekly progress) + live-UI acceptance run and the 375/768/1280px responsive pass
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Weekly progress stays derived from plan weeks and run-only totals — nothing is duplicated in storage.
