# Post-Recovery Audit Notes — 2026-08-25

## Verified Working

- The production homepage returns HTTP 200 and renders normally.
- The public Site Visit Request page loads its four-step form, validation hints, navigation, cookie notice, and chat trigger.
- The Operations path sends an unauthenticated visitor to the protected Manus sign-in flow; this is expected access control behavior.
- Google Maps JavaScript loads successfully from `/api/maps/js?libraries=places`.
- Google OAuth status reports `connected: true` and X status reports `connected: true` for `nolandearthwrks`.
- The project source and both configured remotes agree on the latest published checkpoint `b5bbde9` before this audit began.
- Platform-managed scheduled jobs remain present and enabled, including lead-generation milestones, morning brief, chat-to-lead, quote follow-up, ad publishing, Instagram refresh, and chat cleanup.

## Verified Recovery Regressions or Gaps

- `/api/jobber/status` returns the public SPA HTML instead of JSON. The Jobber route module still exists, but the recovered server bootstrap does not import or call `registerJobberRoutes`, so Jobber connect, callback, introspection, status, and token-refresh behavior are unavailable.
- The public live-review query returns no Google rating, count, or reviews even though the Google OAuth status is connected. This indicates the Google Business OAuth connection alone is not supplying usable public-review data; the Google Places/Place ID review path needs diagnosis.
- Seven Operations agents are registered with in-process `node-cron`. Those schedules disappear whenever an autoscaled instance is stopped or restarted, so they are not durable after a recovery or deployment. Platform-managed schedules should own recurring production work instead.

## Items Requiring Authenticated or Database-Level Verification

- Full Operations dashboard behavior cannot be inspected in the sandbox browser without the owner sign-in session.
- A read-only database query through the management connection failed with a connection error, so live agent configuration and recent agent-run state need verification through the application or restored database access.
- The Instagram token-refresh schedule is enabled and recent logs show successful refreshes, but its platform-reported next execution timestamp was already past at audit time and needs a current schedule health check.
