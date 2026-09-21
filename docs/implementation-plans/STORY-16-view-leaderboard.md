# [STORY-16] View Leaderboard

Depends on Story 14. Add local friend fixtures, privacy opt-out, week/month ranking pure functions, and a responsive leaderboard view. Test ties, self-position visibility, and opted-out users.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.social.js`
**Verified by:** tests.html (Leaderboard ranking) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Rankings, ties, self-position and privacy opt-out are computed from seeded local fixtures plus localStorage — there is no real social graph behind the board.
