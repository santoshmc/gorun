# [STORY-12] Maintain Streaks

## Dependency and scope
Depends on Story 09. A streak counts consecutive planned run days completed; rest days do not break it and missed run days reset it.

## Implementation
- Add `src/types/streak.ts`, pure `src/lib/streakCalculation.ts`, and persisted `src/store/streakStore.ts`.
- Add a compact dashboard streak counter derived from completion rows.
- Recalculate after activity add, delete, or correction rather than incrementing blindly.

## Tests and validation
Test consecutive days, rest days, misses, longest streak, and recalculation after correction.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.progress.js`
**Verified by:** tests.html (Streaks) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. The streak is recalculated from completion rows after every add, delete or classification correction rather than incremented, so rest days never break it and misses reset it correctly.
