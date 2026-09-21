# [STORY-18] Earn Reward Points

Depends on Stories 05 and 07. Add a published points-per-kilometre rule, transaction ledger, balance/recalculation logic, and rewards panel. Only canonical runs earn points. Test add, correction, deletion, and duplicate protection.

## Status

🟩 COMPLETED

**Delivered in:** `app.domain.js`, `app.store.js`, `app.ui.social.js`
**Verified by:** tests.html (Points ledger) + live-UI acceptance run
**Note:** Re-implemented in the dependency-free vanilla build per Agents.md; the React implementation under `src/` is retained for reference only. The ledger recalculates from canonical run activities so corrections and deletions adjust the balance and duplicates cannot double-earn; reward redemption is a demo only and never debits the balance.
