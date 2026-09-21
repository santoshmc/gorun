# User Story: 4 - Connect My Health or Fitness Account

**As a** runner,
**I want** to connect the app to Apple Health, Google Health/Fit, Fitbit, Garmin or Strava,
**so that** my runs are captured automatically without manual entry.

## Acceptance Criteria

*   A "Connected sources" screen lists the supported providers and their connection state.
*   Connecting a provider uses that provider's authorisation flow and requests only the activity/health scopes required.
*   Access tokens are stored securely and the runner can disconnect a provider at any time.
*   Disconnecting stops future syncing and gives the runner the option to delete data previously imported from that source.
*   A clear error message is shown when authorisation fails or is revoked by the provider.

## Notes

*   MVP is responsive mobile web, so data arrives via provider integrations rather than on-device sensors.
*   Consent and privacy wording must be shown before the authorisation flow starts.
