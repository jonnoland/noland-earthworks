# Noland Earthworks Operations Workspace Audit

**Prepared for:** Jon Noland, Noland Earthworks, LLC  
**Audit date:** August 26–27, 2026 CDT  
**Scope:** All `/ops` routes and primary components; navigation, live data relationships, operational flow, interface consistency, current runtime logs, and an unauthenticated protected-data check.

## Executive Summary

The Operations workspace has a capable core: native quotes, parcel-aware Website Requests, jobs, invoices, payments, scheduling, client records, field planning, marketing, and review tools are all present. The recently rebuilt **Field Command Center** is the right direction for a one-person field operation because it elevates daily work, schedule, cash, and pipeline decisions ahead of reporting. The current application also passed its complete regression suite, with **125 test files and 363 tests passing**.

The main risk is not a missing screen; it is **competing sources of truth**. Quotes and invoices are moving to native records, but legacy jobs and leads remain active in reports, schedule adapters, and older tools. The live database currently contains three native quotes and no native jobs, while legacy jobs still drive a displayed $9,010 revenue total. That makes dashboard and report figures capable of disagreeing even when each individual screen is working as coded. The first corrective effort should consolidate lifecycle reporting around native records and define one authoritative status model. The next should eliminate the legacy Operations shell, repair the client hub routes, replace in-process schedules, correct the business email and review connection state, and place pricing settings in server-backed configuration.

## What Was Examined

The audit inventoried **48 Operations page components**, the registered `/ops` routes, both shared navigation shells, critical quote/job/invoice/client data structures, current browser and server logs, and the current database record distribution. The review also captured representative live screens covering the core field-work, sales, reporting, client, pricing, equipment, and hub workflows. No test or database record was created, modified, or deleted during the audit.

| Audit area | What was verified | Result |
|---|---|---|
| Operations access | An unauthenticated request to protected native quote data | Correctly returned **HTTP 401** |
| Regression health | Full project suite | **125 files / 363 tests passed** |
| Type health | Current development TypeScript watcher | **0 errors** |
| Runtime requests | Recent audited browser network-log window | No 4xx/5xx application request failures observed |
| User interface | Primary routes plus high-risk hub routes | Several concrete route, layout, and accuracy inconsistencies found |
| Data alignment | Current record counts across legacy and native tables | Active lifecycle data is split across both models |

## Highest-Priority Findings

| Priority | Finding | Evidence and operational effect | Recommended correction |
|---|---|---|---|
| **P0** | **Lifecycle data is split between legacy and native records.** | The live database contains 3 native quotes, 0 native jobs, 1 native invoice, and 2 legacy jobs. The Jobs workspace uses native jobs, while the Reports screen calculates revenue from legacy jobs. This creates different answers to “what work exists?” and “how much revenue has been earned?” | Establish native clients, quotes, jobs, invoices, and payments as the sole operational record. Backfill or archive legacy rows, then refactor dashboards, schedule, reports, and scorecards to read one shared lifecycle model. |
| **P0** | **Report labels do not match report calculations.** | Reports displayed $9,010 Total Revenue while showing no completed jobs. Its source sums every legacy job price by update date, but the chart is labeled “From completed & invoiced jobs.” The number is not a cash-received, completed-work, or invoiced-total measure as labeled. | Define and display separate measures: **Quoted**, **Approved**, **Scheduled**, **Invoiced**, and **Paid/Collected**. Do not use “Revenue” unless the calculation is documented and based on the corresponding approved financial event. |
| **P0** | **Time-sensitive automations rely on in-process `node-cron`.** | Seven agents—including lead follow-up, visit reminders, review requests, daily digest, pricing updates, and notification retry—are registered at app startup. Runtime logs show missed executions. In-process schedules do not survive idle shutdowns or blocked app work. | Replace each operational schedule with the supported persistent scheduling model. Prioritize lead follow-up, site-visit reminders, daily digest, and payment/review workflows. Add run history, failure status, and a manual “run now” control where appropriate. |
| **P1** | **Two competing Operations layout systems cause wrong navigation and inconsistent framing.** | The primary `DashboardLayout` maps Jobs and Clients to their proper routes. The older `OpsDashboardLayout` still maps both to `/ops/quotes`; ten active pages use it. The browser console reports duplicate React keys for `/ops/quotes`, a direct consequence of that duplicated target. | Retire `OpsDashboardLayout`. Move all remaining pages to `DashboardLayout`, centralize the navigation array, and add route tests that guarantee every sidebar item is unique and resolves to its intended page. |
| **P1** | **Registered client sub-routes do not show their requested tab.** | Both `/ops/clients/invoices` and `/ops/clients/payments` displayed the Clients list. The hub reads only URL hashes, while the router advertises `:tab` paths. | Choose one route convention. Prefer direct canonical pages—`/ops/clients`, `/ops/invoices`, and `/ops/payments`—rather than a nested full-page hub. If tabs remain, bind the active tab to the URL path and preserve it on refresh. |
| **P1** | **The business profile still uses the outdated quote email.** | Settings and the default business settings schema show `jonnoland@nolandearthworks.com`, despite the approved quote address being `quotes@nolandearthworks.com`. | Change the saved business-settings record and default to `quotes@nolandearthworks.com`, then test quote, portal, invoice, and reply-to email templates against the corrected setting. |
| **P1** | **The live-review connection is not currently trustworthy.** | Recent logs show a Google API 429 response followed by a Places fallback of `NOT_FOUND`. The user interface needs to make stale/live status obvious so a failed refresh is never treated as a current review count. | Correct the Google account/place configuration and add a visible “last successfully refreshed” timestamp plus an integration-error banner. Keep manually logged review workflow separate from the live Google source. |
| **P1** | **Pricing configuration is device-local.** | The Pricing calculator reads and writes `noland_pricing_config` in browser local storage. A device change, browser reset, or second device can produce a different price basis. | Persist versioned pricing settings in the server/database, show an effective date and editor, and have quote calculations record the exact pricing version used. Keep local storage only as an offline draft cache. |

## Component Consistency and Flow Review

The core work path should be **Website Request or Lead → Qualification → Site Visit → Native Quote → Phase 1 Acceptance → Native Job → Invoice → Payment → Review Request**. The strongest parts are native quote handling, Website Request linkage, parcel mapping, quote phases, portal acceptance, invoice management, and the new Field Command Center. These should remain the center of the system.

| Workspace family | Current assessment | Required direction |
|---|---|---|
| **Dashboard** | The Field Command Center now appropriately prioritizes work queue, schedule, cash, and pipeline. It still consumes mixed legacy/native data and should not be used as a financial source until the lifecycle is consolidated. | Keep the command-center format. Drive each card from the same native lifecycle queries used by the underlying workspaces. |
| **Leads and Website Requests** | Lead qualification, sort/filtering, schedule hand-off, Website Request visibility, and parcel-aware linkage are strong. Direct lead deletion lacks a confirmation step, which risks accidental loss. | Add a confirmation dialog and archive/recover flow. Keep no-match parcel handling manual, as currently designed. |
| **Quotes** | Native quoting is the most complete operational module, but it is a very large single component and still uses the older shared shell. The browser key error occurs in this workspace’s navigation frame. | Preserve the desktop-centered quote editor. First migrate its shell; then split only internal quote sections into smaller tested modules without changing the familiar editing workflow. |
| **Jobs, Invoices, and Payments** | Canonical Jobs and Invoices wrappers are structurally clean. Their current data does not reconcile with legacy-driven reporting. Payments use numeric job identifiers where titles would be faster to recognize. | Finish native job conversion from accepted quotes, show job number/title/client together in payments, and let the dashboard/report read those same records. |
| **Schedule and Crews** | The schedule handles mixed inputs and legacy fallback fields. Crews and timesheets have viable capabilities but hub tabs nest full page layouts and lose deep-link persistence. | Standardize schedule inputs on native jobs and visits. Use direct pages or URL-synchronized tabs; do not nest page shells. |
| **Pricing and Cost Estimation** | Internal decision-support is useful, but local-only pricing settings and separate estimation paths risk different answers for the same scope. AI and satellite inputs must remain advisory rather than authoritative. | Make one server-backed pricing basis feed every internal calculator. Require documented assumptions and human approval before a quote is sent. |
| **Field planning and equipment** | Route Planner correctly warns that it is not a legal clearance/weight evaluation. Equipment Diagnostics and Field Fix overlap in purpose but are both usable. | Keep the route warning. Treat it as planning support only until verified restriction data is integrated. Clarify whether Diagnostics is the quick triage tool and Field Fix is the repair log/work-order tool. |
| **Marketing, SEO, AI visibility, reviews, gallery** | Tools are capable but spread across local-state hubs. Some query failures would appear as empty content rather than a visible retry state. Review freshness is presently impaired by the Google connection error. | Keep these below field/cash workflows. Standardize a loading, empty, error, retry, and last-updated pattern across each screen. |
| **Reports, Scoreboard, Tasks, Chat, Settings, Resources** | These are appropriate supporting workspaces, not first-screen daily tools. Several rely on older shell styling, client-side parsing, hardcoded resources, placeholder settings, or lack a data-fetch error state. | Move them onto the shared shell and shared state pattern. Ensure placeholders are hidden until implemented and report cards state exactly what they measure. |

## Security and Data-Control Assessment

The protected native quote endpoint returned 401 without an authenticated session, which is a positive control result. The browser-level `OwnerRoute` also checks for an admin role before rendering Operations pages. However, UI gating is not sufficient evidence that every data mutation is protected. Authorization must be enforced at the server procedure level and tested across create, edit, delete, file, portal, payment, and operational actions.

> “Permission should be validated correctly on every request,” not solely from the browser or client interface. [1]

The current use of direct deletion, split data models, browser-only pricing storage, and step-based financial workflows makes procedure-level checks and audit history particularly important. The Operations workspace contains customer identity, addresses, quote amounts, property information, payment states, and internal cost data. These records should be available only through explicit, server-enforced owner permissions and auditable state transitions. [1] [2]

| Control | Current evidence | Next verification |
|---|---|---|
| Owner route gate | Present in browser | Confirm all protected tRPC procedures are owner/admin guarded, not just the screen. |
| Protected quote data | Unauthenticated query returned 401 | Add automated unauthorized tests for clients, jobs, invoices, payments, attachments, and portal-sensitive mutations. |
| Quote and payment sequence | Portal acceptance and payment gates exist | Add tests for invalid/out-of-order stage changes and record an immutable stage-transition history. |
| Data deletion | Direct lead deletion is present | Require confirmation and support archive/restore for business records. |
| Price-basis integrity | Pricing is local to the browser | Use versioned server settings and retain the applied version with each generated quote. |

## Recommended Corrective Sequence

The first six items are not cosmetic. They remove conflicting operational signals, prevent lost or misleading follow-up, and make the dashboard safe to use for daily business decisions. The remaining work can be handled in short, lower-risk batches after the data model and navigation shell are stable.

| Order | Work package | Business result |
|---|---|---|
| **1** | Consolidate legacy and native jobs/quotes/invoices/payments under a documented lifecycle model. | One trusted pipeline and financial view. |
| **2** | Correct report definitions and rebuild dashboard/report metrics from the native model. | Cash, revenue, and pipeline cards mean what they say. |
| **3** | Move scheduled agents from `node-cron` to persistent scheduling with run history. | Follow-up, reminders, reviews, and daily routines continue reliably. |
| **4** | Remove the legacy Operations layout and hub nesting; repair client tab routes. | One sidebar, accurate destinations, clean deep links, no duplicate-key errors. |
| **5** | Correct the business email and repair/label Google Reviews integration state. | Fewer missed contacts and no false impression of live review data. |
| **6** | Centralize pricing configuration and record the pricing version used by each quote. | Consistent internal quote basis across devices. |
| **7** | Standardize error/retry/last-updated states and confirmation/archive behavior. | Clearer recovery from real-world API failures and less accidental loss. |
| **8** | Refactor the oversized quote workspace internally, preserving the current desktop editor. | Lower regression risk without another layout disruption. |

## Validation Boundary

This review is a code, current-data, logged-runtime, and live-interface audit. It is not a production penetration test, legal road-restriction verification, payroll audit, accounting reconciliation, or external-service credential audit. Before accepting any revenue, margin, invoice, or payment figure as a business record, reconcile it against the relevant quote, invoice, Stripe payment, and accounting system entry.

## References

[1] [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)  
[2] [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
