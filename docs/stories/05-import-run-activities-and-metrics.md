# User Story: 5 - Import My Run Activities and Metrics

**As a** runner,
**I want** my activities and their metrics imported from my connected source,
**so that** my progress reflects what I actually ran without me typing anything in.

## Acceptance Criteria

*   Activities are imported from each connected provider, including historical activities for the current goal month.
*   For each imported activity the app stores distance, duration, pace, average speed, stride length, elevation gain and date/time where the provider supplies them.
*   Metrics not supplied by the provider are shown as unavailable rather than as zero.
*   The same activity recorded by two connected providers is de-duplicated into a single entry.
*   Imported activities appear in the activity list and update goal progress.
*   The runner can trigger a manual refresh and see when the last successful sync happened.

## Notes

*   Transcript lists stride length, running speed, distance, time, pace and height as required metrics.
