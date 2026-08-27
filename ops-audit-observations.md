# Operations Audit — Observations

Audit date: 2026-08-26/27 CDT

## Verified interface and routing observations

- The direct routes `/ops/clients/invoices` and `/ops/clients/payments` both displayed the Clients list. `ClientsHub.tsx` only derives its active tab from URL hashes and ignores the registered `:tab` route parameter.
- Clients, Crews, Reports, Equipment, and Pricing hubs render a local tab bar outside the child page shell. The corresponding child pages render their own page layouts, producing a visibly separate top strip and inconsistent navigation frame.
- Two shared navigation shells remain. The legacy `OpsDashboardLayout` maps Jobs and Clients to `/ops/quotes`, while the primary `DashboardLayout` correctly maps them to `/ops/jobs` and `/ops/clients`.
- The browser console recorded multiple duplicate React child-key errors for `/ops/quotes`. The legacy navigation array contains two `href: "/ops/quotes"` entries, one for Jobs and one for Quotes, and navigation entries use the path as the React key.
- The Reports screen displayed Total Revenue of $9,010 with no completed jobs and an empty-looking monthly revenue chart. Source review confirms that its revenue calculation sums every legacy `jobs.totalPrice` record, while its label says it represents completed and invoiced jobs.
- The Settings profile and `business_settings` schema still use `jonnoland@nolandearthworks.com`, although the approved quote address is `quotes@nolandearthworks.com`.

## Verified data and workflow observations

- Current data is split across legacy and native tables: 6 `ops_leads`, 3 website submissions, 3 `native_quotes`, 0 `native_jobs`, 1 `native_invoices`, 2 legacy `jobs`, 1 schedule entry, and 1 payment. The Jobs workspace uses native jobs, while Reports calculates revenue from legacy jobs.
- The Pricing calculator stores its editable configuration in browser local storage under `noland_pricing_config`; therefore, the working pricing basis is not reliably shared across devices or protected by normal server-side ownership controls.
- Server startup registers seven in-process `node-cron` agents. Recent logs report missed executions. This conflicts with the project’s supported persistent scheduling model and makes time-sensitive follow-up, review, digest, pricing, and notification work unreliable after idle shutdowns or blocking work.
- Recent Google Review refresh logs show a 429 API response and a Places API `NOT_FOUND` fallback. The review interface should distinguish live data from retained cached or manually logged review records until the connection is corrected.
- A direct unauthenticated request to the protected `nativeQuotes.list` operation returned HTTP 401. This is positive evidence for that data endpoint. It does not replace procedure-by-procedure authorization coverage.
- The full current regression suite passed: 125 files and 363 tests. The audit found no failed network requests in the inspected browser log window.

## Scope note

The observations are a source and runtime audit, not a full production penetration test or accounting reconciliation. Financial figures must be reconciled against the accounting/Stripe record before business decisions are based on dashboard totals.
