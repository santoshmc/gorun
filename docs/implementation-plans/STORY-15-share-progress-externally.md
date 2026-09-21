# [STORY-15] Share Progress Externally

Depends on Stories 12-13. Build a previewable share card and Web Share API/copy fallback. Sharing is explicit and contains run, streak, or badge data. Test text generation and unsupported-browser fallback.

## Status

🟩 COMPLETED

**Delivered in:** `app.core.js`, `app.domain.js`, `app.ui.social.js`
**Verified by:** tests.html (Share message generation) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. Sharing uses the Web Share API with a clipboard fallback plus X and LinkedIn intent links; LinkedIn's `share-offsite` endpoint accepts only a URL, so the app URL is shared and the generated message is copied for pasting.
