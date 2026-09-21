# [STORY-17] Join Community Challenge

Static client-only challenge directory with persisted participation, contribution from run-only activities, leave action, countdown, standings, and completion badge hook. Test join/leave and contribution boundaries.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.social.js`
**Verified by:** tests.html (Challenges) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. The challenge directory and standings are seeded local fixtures plus localStorage rather than a real community service; contributions are computed from the user's own run-only activities within the challenge window.
