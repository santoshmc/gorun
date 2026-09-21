# [STORY-19] Responsive Mobile Web Experience

Cross-cutting validation for Stories 04-20. Keep controls thumb-friendly, avoid horizontal overflow, stack panels below 768px, and preserve keyboard/focus behavior. Validate dashboard and each new screen at 375px, 768px, and desktop widths.

## Status

🟩 COMPLETED

**Delivered in:** `index.html`, `style.css`, `app.core.js`, `app.ui.core.js`, `app.ui.progress.js`, `app.ui.social.js`
**Verified by:** live-UI responsive pass at 375px, 768px and 1280px — no horizontal overflow and no sub-32px tap targets — plus service-worker and offline-boot checks
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. The responsive bento grid, focus handling and accessible modal dialogs are hand-written CSS and JS, and the app installs and boots offline as a PWA with the network disabled.
