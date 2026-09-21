# User Story: 8 - Correct a Misclassified Activity

**As a** runner,
**I want** to change an activity from walk to run (or the reverse),
**so that** an incorrect auto-detection does not distort my progress.

## Acceptance Criteria

*   Any activity's type can be changed by the runner from its detail view.
*   Changing the type immediately recalculates daily, weekly and monthly progress, streaks and any affected completion marks.
*   Activities whose type was changed by the runner are flagged as manually corrected and are not overwritten by a later re-sync.
*   The original auto-detected type remains viewable.

## Notes

*   Transcript: "It can be auto-detected, but the user can also correct it if it is wrongly taken."
