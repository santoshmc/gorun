# [STORY-14] Invite Friends

Client-only MVP uses shareable invite links and email copy. Add friend/invite types, persisted invite store, consent-aware share action, and status display. Test link generation and duplicate invite handling.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.social.js`
**Verified by:** tests.html (Friends and invites) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Friends use seeded local fixtures plus localStorage — there is no real social graph; an invite generates a shareable link and is marked accepted manually, which the UI labels clearly as simulated.
