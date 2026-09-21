# [STORY-13] Earn Badges

Depends on Stories 10-12. Define badge metadata, persisted earned badges, deterministic award/revoke checks, notification toast, and gallery. Test weekly/monthly/streak milestones and revocation after correction.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.social.js`
**Verified by:** tests.html (Badges) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Badge evaluation is deterministic and re-run inside the action layer, so badges are awarded and revoked automatically when an activity is corrected or deleted.
