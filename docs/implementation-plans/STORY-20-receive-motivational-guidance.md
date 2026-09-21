# [STORY-20] Receive Motivational Guidance

Depends on Stories 09-12. Add pure context-aware message generation for completed, missed, and catch-up states, a dashboard message panel, and local reminder preference. Browser notifications are opt-in only; default to in-app guidance. Test message selection and reduced-motion/audio-safe rendering.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.progress.js`, `script.js`
**Verified by:** tests.html (Coaching messages) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Reminders are opt-in browser notifications where permitted and in-app only otherwise; with no push server they cannot fire while the app is closed.
