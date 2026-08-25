# Post-Recovery Website and Cloud-Service Audit

**Noland Earthworks, LLC**  
**Audit date:** August 25, 2026  
**Scope:** Production website, Operations application, live integrations, companion-app support, scheduling, source recovery, and runtime health after the environment move.

## Executive Assessment

The recovered website is **online, deployable, and largely intact at the source level**. The public homepage and Site Visit Request flow load correctly, the protected Operations route still requires sign-in, mapping loads, required secrets remain available, Google OAuth and X report connected, and the full automated test suite and production build both pass.

The recovery did expose four material operational gaps. **Jobber is present in source but not registered in the recovered server startup**, so its OAuth, status, and refresh functions are currently unavailable. **The Noland Field update checker is falling back to version 0.3.0 even though v0.4.12 exists**, because it calls GitHub’s unauthenticated API against a private repository. **Live Google reviews are unavailable because the configured Place ID has been retired.** Finally, the seven Operations agents are scheduled in process rather than through a restart-safe scheduler, which creates a reliability risk after deployments, cold starts, or environment recovery.

## What Was Verified Working

| Area | Evidence | Result |
|---|---|---|
| Public website | `https://nolandearthworks.com/` returned HTTP 200 and rendered normally. | Working |
| Site Visit Request | `/quote` loaded the complete four-step form, validation guidance, navigation, cookie controls, and chat trigger. | Working |
| Operations access control | An unauthenticated `/ops` visit redirected into the expected sign-in flow. | Working as intended |
| Google Maps | `/api/maps/js?libraries=places` returned the Google Maps JavaScript payload. | Working |
| Google OAuth | `/api/google/status` reported connected. | Connected; review data still needs repair |
| X integration | `/api/x/status` reported `nolandearthwrks` connected. | Working |
| Integration secrets | Required secrets for Resend, Stripe, Google, Facebook, Instagram, Jobber, field authentication, and Manus API were present in the recovered runtime. | Present |
| Database runtime | The application logs show repeated successful database initialization after restart. | Working in application runtime |
| Source recovery | Local source, deployment source, and GitHub remote matched checkpoint `b5bbde9` at the start of the audit. | Synchronized |
| Automated quality checks | `pnpm test` passed **335 tests**; the production build completed successfully. | Working |

## Confirmed Problems

| Priority | Area | Verified finding | Operational effect | Recommended repair |
|---|---|---|---|---|
| Critical | Jobber | `/api/jobber/status` returned the public website HTML instead of JSON. `server/jobberRoutes.ts` and `server/jobber.ts` still exist, but `server/_core/index.ts` neither registers the route module nor starts the refresh scheduler. | Jobber connection, callback, status, introspection, and token-refresh behavior are unavailable. Any Operations action that relies on Jobber will fail or appear missing. | Restore the Jobber route registration in server startup and replace its token refresh with a restart-safe scheduled callback. Then reconnect or verify the Jobber account. |
| Critical | Noland Field app updates | The public app endpoint returned fallback version **0.3.0** and the generic releases page. GitHub confirms that `mobile-v0.4.12-build1` is the latest release. GitHub’s unauthenticated releases API returns HTTP 404 because the repository is private. | The in-app update badge and Install Update flow cannot reliably identify or download the latest personal-use APK. | Stop depending on unauthenticated GitHub release discovery. Store the current version, release notes, and signed APK URL in the application’s protected settings or query GitHub with a server-side credential. |
| High | Live Google reviews | The public review endpoint returns `googleRating: null`, `googleReviewCount: null`, and no reviews. The current Places request returned HTTP 200 with `{}`, while the legacy fallback explicitly reports that the configured Place ID is no longer valid. | The public Reviews section correctly avoids fabricated ratings, but it cannot show verified Google review data. | Locate the current Google Business Place ID, replace the retired value, and improve the review fetcher so an empty current Places response does not suppress its fallback diagnostic. |
| High | Operations agents | Seven recurring agents are registered through in-process `node-cron` inside `server/_core/index.ts`. In-process schedules are not durable across autoscaling, restarts, deployments, or a recovery event. | Lead follow-up, visit reminders, review requests, stale-lead alerts, daily digest, pricing review, and retry work can be silently missed. | Move each recurring agent to the platform-managed scheduler and retain an explicit run log/status for Operations. |
| Medium | Instagram schedule health | The platform schedule remains enabled and recent execution history shows successful refreshes, but its recorded next execution time was already in the past during the audit. | The long-lived token refresh may be healthy, but the schedule metadata needs a current run/log review rather than assumption. | Inspect the next execution after the scheduler catches up. If it remains stale, recreate or update the schedule without changing the Instagram connection. |

## Important Clarifications

The website did not lose its codebase or required runtime secrets. The issues are **wiring and durable-runtime problems**, not a broad content or deployment loss. In particular, the Jobber issue is a server-bootstrap omission, the companion update issue is an authentication design mismatch for a private repository, and the review issue is an invalid external identifier.

The management database query tool returned a connection error during the audit, but the application itself repeatedly initialized the database without runtime errors. This is therefore logged as a management-access issue to recheck, not evidence that the production application database is offline.

## Authentication-Limited Checks

The sandbox browser does not have an active owner session. The protected Operations dashboard correctly redirected to sign-in, but the following should be checked after the owner session is available: creating a native quote, sending a portal link, inspecting the Jobber Settings card, checking the actual agent activity log, testing Stripe from the deployed domain, and opening the Noland Field app’s Update/Profile screen.

## Recommended Repair Order

| Order | Work | Reason |
|---|---|---|
| 1 | Restore and verify Jobber startup wiring. | It directly affects client, quote, and job workflows if Jobber remains in use. |
| 2 | Repair the Noland Field update endpoint for the private release source. | It restores the personal companion app’s update path and prevents the false 0.3.0 fallback. |
| 3 | Replace the retired Google Place ID and validate live review output. | It restores verified review visibility without inventing ratings or testimonials. |
| 4 | Convert Operations agents to restart-safe schedules. | It protects daily operational follow-up from another recovery, restart, or deployment gap. |
| 5 | Run the owner-session verification pass. | It confirms that the protected Operations features work end to end on the recovered production site. |

## Audit Evidence

The audit used live production endpoint checks, browser inspection of the public request flow, scheduler inventory and logs, recovery source-control verification, runtime log inspection, direct external read-only diagnostics for Google Places and GitHub Releases, the project’s secret-presence check, and the full test/build pipeline. No customer data, live quotes, payments, or external settings were changed during the audit.
