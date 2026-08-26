# Request a Site Visit to Job Workflow Audit

**Noland Earthworks, LLC**  
**Audit date:** August 25, 2026  
**Scope:** Public Site Visit Request, Operations leads, site visits, native quotes, customer portal acceptance, deposit, job conversion, and follow-up automation.

## Executive Assessment

The workflow has a strong customer-facing beginning and a much more complete native Operations stack than it did before recovery. The public request flow is clearly positioned as a site visit rather than a price calculator; it gathers contact details before property and project information, states that final scope is confirmed on site, and promises a same-day or next-morning review. The largest remaining constraint is **operational handoff discipline and measurement**, not another public form field. The current sample is too small to judge conversion performance, but it already shows that the system is not consistently recording confirmed visits, signed quotes, deposits, or jobs.

The requested signed-quote automation is now in place. When a customer types a signature and accepts **Phase 1**, the linked native quote becomes approved and every lead linked to that quote is automatically moved to **Won**. Optional future phases remain outside the acceptance and deposit scope. This preserves the customer authorization trail while removing a manual status-update step.

| Area | Observed position | Audit assessment | Priority |
| --- | --- | --- | --- |
| Public request | Four-step Site Visit Request with contact, property, project, and review stages | Clear and appropriately qualified for a field-service site visit | Maintain |
| Lead capture | Six Operations leads in the current sample; no confirmed-visit timestamps | Pipeline data is incomplete, so visit conversion cannot yet be measured | Critical |
| Quotes | Three native quotes: two drafts and one sent/viewed; no signed quotes or deposits in the current sample | The portal trail works, but completion events are not yet present in live data | High |
| Acceptance | Phase 1 has typed signature, consent, scope, timestamp, and deposit gate | Strong control; signed acceptance now closes the linked lead automatically | Completed |
| Scheduling/job handoff | Native job conversion is available, but the current sample contains no completed native-quote conversions | Require a deliberate ready-to-schedule checkpoint after deposit | High |
| Automation | Six configured agents are enabled; follow-up has recorded actions while visit reminders and review requests have recorded none | Agent success alone is not proof of operational outcome; add queue-level measurement | High |

## What Is Working Well

The public Site Visit Request is a good fit for the business. It avoids unsupported public pricing, asks for the information needed to determine service-area and job fit, and explains the next step before the form begins. The form’s message is aligned with the actual operating model: Jon reviews the request, confirms the property and visit, then prepares a written quote after the site visit.

The quote and portal workflow is also materially stronger than a generic approval link. Phase 1 is separated from future optional work, future phases do not enter today’s deposit calculation, and the portal records typed signature, consent, timestamp, and accepted scope. The signed record prints in the customer PDF. These controls align with the general practice of treating quote amount, discounts, terms, acceptance method, electronic signature, and payment as separate approval considerations. [2]

The lead-to-quote link is now meaningful instead of only cosmetic. Sending a native portal moves a linked lead to `estimate_sent`; signing Phase 1 moves it to `won`. This removes two manual state changes and creates a more reliable path to the daily Operations queue.

## Observed Workflow and Gaps

| Funnel stage | Current workflow | Gap or risk | Recommended control |
| --- | --- | --- | --- |
| Request submitted | Website request is submitted and appears in Website Requests; the public form promises a same-day or next-morning review | No required owner response-time record is visible in the current audit sample | Record `firstContactedAt` and display an overdue badge after the promised response window. |
| Fit review | Operations supports stages, notes, AI fit data, and Web Request linkage | Fit decision and reason are not yet a required close-the-loop event | Add structured `pursue / site visit / pass / refer out` decision with a reason and next action. |
| Visit scheduling | Visit confirmation sends a confirmation message when a requested time exists | All six current leads have no confirmed-visit timestamp, so the visit stage is not usable as a measured funnel event | Make `visit scheduled` and `visit completed` separate actions; record both date/time and result. |
| Quote creation | Native quote builder supports phased scope, durations, discounts, portal delivery, and linked leads | Draft quotes can remain idle without an explicit send-by target | Show a mandatory `quote due by` and an overdue draft state. |
| Portal send/view | Portal send records `sent`; the current sample has one sent and viewed quote | No current signed quote, deposit, or conversion record means end-to-end completion cannot be assessed | Track sent, viewed, signed, deposit-paid, and scheduled-to-job events on the same lead timeline. |
| Signed acceptance | Phase 1 typed signature now captures consent, scope, time, and amount; linked lead becomes Won | `Won` means customer accepted Phase 1, not necessarily that payment or a calendar slot exists | Add a visible sub-status: `Won — Awaiting Deposit` and only mark `Ready to Schedule` after deposit. |
| Deposit and job | Deposit checkout is Phase-1-only and is gated by signed acceptance; native job conversion is available | Job conversion can be operationally premature if it is not explicitly tied to deposit and schedule readiness | Add a conversion checklist: signed Phase 1, required deposit received, weather/workload review, scheduled date, and property access confirmation. |

## Current Funnel Evidence

The Operations database contains **six leads** and **three native quotes**, which is a directional sample only. Two leads are currently lost, one is won, and the remaining leads are distributed across new, contacted, and negotiating stages. Four leads are linked to native quotes, but none has a recorded confirmed site visit. Among the native quotes, two are drafts and one is sent and viewed; none is signed, deposit-paid, or converted to a native job. This does not prove poor performance, but it does prove that the current data cannot answer the most important operational questions: how quickly requests receive a response, how many visits are completed, and where accepted work stops before scheduling.

The configured lead-followup agent has recorded 12 actions across 128 successful runs. The visit-reminder and review-request agents have successful-run records but no recorded actions in the same audit window. Treat this as a measurement prompt rather than an automation failure: a successful run only means the routine executed, not that it found an eligible record or advanced a customer.

> “Lead management” should cover the path from initial interest through a paying customer, with qualification, nurturing, and conversion tracked as distinct stages. [1]

## Implemented Change: Signed Quote to Won Lead

When the customer signs and accepts Phase 1 in the portal, the native quote now records the approved amount, acceptance time, typed signature, electronic-signature consent time, and `phase_1` acceptance scope. The server then finds Operations leads linked through `nativeQuoteId` and updates their stage to **Won**. The owner notification also notes that the linked lead changed to Won. Optional future phases remain unapproved and do not enter the accepted amount or deposit calculation.

This is appropriate because the business defines a signed Phase 1 as an approved commitment. The next operational checkpoint should be **Won — Awaiting Deposit**, followed by **Ready to Schedule** only after the deposit and scheduling prerequisites are complete.

## Measurement Plan

| Funnel stage | Required event | Decision enabled |
| --- | --- | --- |
| Request received | Timestamp, source, county, requested service, fit score | Which sources produce qualified site visits? |
| First response | First call/email/manual contact time and outcome | Are same-day or next-morning commitments being met? |
| Fit decision | Pursue, site visit, pass, or refer out; reason | Where is capacity being spent on poor-fit work? |
| Visit | Scheduled, confirmed, completed, no-show, declined | What percentage of qualified requests become completed visits? |
| Proposal | Draft created, portal sent, portal viewed | Are completed visits receiving timely written quotes? |
| Acceptance | Phase 1 signed, signature time, accepted amount | Which services and sources convert to approved work? |
| Deposit | Requested, paid, failed, waived; amount | What is blocking ready-to-schedule work? |
| Job | Converted, scheduled, completed, invoiced, paid | Does accepted work reliably enter the field schedule and closeout process? |

## 7-, 30-, and 90-Day Priority Plan

| Timing | Work | Expected operational outcome | Measurement |
| --- | --- | --- |
| First 7 days | Use the current Operations lead stages every day; require a fit decision and next action for each new request. Keep sending native quote portals instead of one-off documents. | Fewer orphaned requests and drafts. | New requests with next action; drafts older than 48 hours. |
| First 7 days | Use the new signed-Phase-1 automation and review the Won queue before scheduling. | Signed work becomes visible without manual stage updates. | Signed Phase 1 quotes matched to Won leads. |
| First 30 days | Add `firstContactedAt`, `visit completed`, and `quote due by` events to the Operations workflow. | Reliable response and site-visit conversion measurement. | Median first response; request-to-visit and visit-to-quote conversion. |
| First 30 days | Add `Won — Awaiting Deposit` and `Ready to Schedule` operating sub-statuses or equivalent next-action filters. | Clear separation between customer approval and field-ready work. | Signed-without-deposit count; deposit-to-schedule time. |
| First 30 days | Add an automated but reviewable reminder for viewed-but-unsigned portals and a stop condition after customer decline. | Consistent follow-up without repeated unwanted contact. | Viewed portal follow-up completion; signed after follow-up. |
| First 90 days | Build one source-to-job dashboard: source → fit → visit → quote sent → signed → deposit → job → paid. | Marketing and operating decisions based on completed work rather than inquiries alone. | Conversion by source, county, service, and job-size band. |
| First 90 days | Turn completed jobs into structured closeout records that feed invoice, review eligibility, gallery consent, and future service-area proof. | One job record supports operations, reputation, and marketing. | Completed jobs with closeout, review request, and media-consent status. |

## Recommended Builds

The next highest-value build is a **Today’s Next Actions** refinement that sorts: new requests without first contact, fit decisions due, visits awaiting confirmation, visit-complete quotes due, viewed portals awaiting response, signed Phase 1 quotes awaiting deposit, and deposit-paid jobs awaiting schedule placement. This should be a daily working queue, not another dashboard metric.

The second is a **two-stage job readiness gate**. Keep the new automatic Won event when Phase 1 is signed, then require deposit and scheduling prerequisites before job conversion. This preserves the commercial truth of the signature without placing unscheduled or unpaid work on the job board.

The third is **funnel instrumentation**, especially first-contact time and visit-completion time. The current small sample has no confirmed visits, so it cannot distinguish a demand problem from a data-entry problem. Salesforce’s small-business guidance likewise emphasizes centralizing lead interactions and tracking conversion metrics rather than treating lead count as the result. [1]

## References

[1]: https://www.salesforce.com/blog/small-business/lead-management-for-startups/ "Salesforce — Lead Management For Small Businesses and Startups: Quick Guide"

[2]: https://knowledge.hubspot.com/quotes/quote-approval-use-cases-and-commonly-used-properties "HubSpot — Quote approval use cases and commonly used properties"
