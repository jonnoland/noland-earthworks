# Google Ads API Readiness for Direct Publishing

**Review date:** August 14, 2026  
**Scope:** What is required to add an approved, draft-first Google Ads API workflow to `/ops/ads`.

## Confirmed Current State

The connected Google Ads account exposes **Noland Earthworks** (CID `995-981-2801`). The in-app `/ops/ads` page generates Google headline, description, and extended copy, schedules the related record, and tracks spend manually. It currently instructs the operator to copy the fields into Google Ads; there is no server-side Google Ads API publishing procedure.

## Required API Prerequisites

| Requirement | Purpose | Current state |
| --- | --- | --- |
| Google Ads developer token | Required on every Google Ads API call; its access level controls the environment and quota. | Not present in the app configuration. |
| Google Cloud OAuth or service-account credentials | Authenticates the server-side integration. | Not present in the app configuration. |
| Client customer ID | Identifies the Noland Earthworks client account without hyphens: `9959812801`. | Confirmed in the connected Ads UI. |
| Login customer ID, if manager access is used | Identifies the manager account through which the client account is accessed. | Needs confirmation from the account hierarchy. |
| Google Ads API enabled in Google Cloud | Required before an application can call the Ads API. | Needs confirmation in the chosen Cloud project. |

Google’s campaign guidance explicitly recommends creating a campaign in **PAUSED** status before ads and targeting are complete. A safe dashboard design should therefore create only paused, reviewable drafts, show budget/targeting/keywords before submission, preserve audit history, and require an explicit owner confirmation before any state is changed to enabled. [1] [2]

## External Blocker

The signed-in Google Ads browser session displayed an ad-blocker warning, so campaign cards and account metrics could not be reviewed. A read-only account review requires allowing `ads.google.com` in the browser or using a clean browser profile.

## References

[1]: https://developers.google.com/google-ads/api/docs/get-started/make-first-call "Google Ads API Quick Start"

[2]: https://developers.google.com/google-ads/api/docs/campaigns/create-campaigns "Google Ads API — Create Campaigns"

[3]: https://developers.google.com/google-ads/api/docs/api-policy/developer-token "Google Ads API — Developer Token"
