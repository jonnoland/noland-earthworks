# Noland Earthworks Whole-Site Audit Refresh

**Audit date:** August 19, 2026  
**Audited release:** Web application version 1.0.83  
**Audit method:** Read-only production-browser review, public crawl-asset inspection, authenticated operations observation without changing records, and production-log review.

## Executive Summary

The current production site has materially improved since the prior audit. Core service pages, a representative resource article, the FAQ page, a county page, and the canonical Fence Line Clearing add-on page all render unique customer-facing content with current site-visit and written-scope guidance. Production crawl controls are also in good shape: `robots.txt` permits public crawling while excluding `/api/`, and the sitemap currently lists 69 HTTPS canonical URLs.[1] [2]

The highest-priority remaining issues are not general website design problems. They are an active Google Business Profile review-sync failure despite a connected OAuth token, a customer-facing contradiction in the deposit-cancellation wording, and a Privacy Policy that openly remains a legal-review draft. One simple copy correction is also needed: the FAQ still uses the retired “Request a Free Estimate” language instead of the current **Request a Site Visit** workflow.[3] [4] [5]

## What Was Verified

| Area | Current result | Evidence |
|---|---|---|
| Core service content | **Passing** | Forestry Mulching has page-specific content, FAQs, scope boundaries, and a current call to action.[6] |
| Resource content | **Passing** | The audited proposal-cost article has a page-specific title, self-canonical URL, unique article body, and related-resource links.[7] |
| FAQ resource | **Passing, with one copy issue** | The FAQ has 25 visible questions in organized sections; its final CTA is outdated.[5] |
| County content | **Passing** | Davidson County renders county-specific hero content, service cards, FAQs, and current site-visit language.[8] |
| Add-on service content | **Passing** | The canonical Fence Line Clearing add-on route has page-specific content and related-service links.[9] |
| Crawl controls | **Passing** | Public crawling is allowed, `/api/` is disallowed, and the sitemap is declared and reachable.[1] [2] |
| Unknown-route handling | **Passing** | The current site has a visible 404 recovery path; no soft-404 issue was reproduced during this review. |

> **Method note:** Early non-browser extraction suggested several pages were serving a generic homepage. Browser validation disproved that result for the live canonical service, blog, FAQ, county, and add-on routes. Those unverified generic-page alerts are excluded from the findings below.

## Confirmed Findings

| Priority | Finding | Customer or business impact | Recommended next action |
|---|---|---|---|
| **P1** | Google Business Profile reviews are not syncing. The integration reports connected and the token refreshed, but no `locationName` is stored; Google account discovery returns `RATE_LIMIT_EXCEEDED`, and the Places fallback returns `NOT_FOUND`. | Verified reviews do not populate reliably in Operations, on quote materials, or on public trust surfaces. | After Google’s quota window resets, reconnect the account and select/store the correct Business Profile location. Confirm a manual refresh returns reviews before relying on automated review display. |
| **P1** | Deposit cancellation wording is inconsistent. The general deposit rule uses a 14-day threshold, while a later section applies that refund language only to projects over $5,000 without reconciling smaller projects. | A customer can reasonably read the same policy two ways, increasing dispute risk. | Have Tennessee-appropriate counsel set one governing cancellation/deposit rule and revise both sections together. |
| **P1** | The Privacy Policy remains visibly marked **Legal-review draft** and says it is not legal advice. | The site openly discloses that the policy is not final while it handles site-visit, message, upload, invoice, and payment-related information. | Retain the draft label until counsel approves the final text; then replace it with the approved effective date and final policy. |
| **P2** | The FAQ CTA still says **“Request a Free Estimate.”** | It conflicts with the current site-wide Site Visit workflow and can invite a price-first expectation the rest of the site avoids. | Replace it with **“Request a Site Visit”** and retain the explanation that written scope and price follow property review. |
| **P3** | Operations initially showed Google Business Profile as not connected while Settings later showed Connected. | The dashboard can confuse the owner during refresh or status resolution. | Monitor after the location and quota issue is resolved. If it persists, make dashboard status read from the same resolved state used in Integrations. |

## Current Strengths to Preserve

The public pricing and request experience is aligned with the business model: no automatic final price is promised, and the site explains that the property review and written scope determine the proposal. The current service pages consistently state vegetation-work boundaries and do not imply that grading, excavation, hauling, stump/root extraction, road construction, or final building-pad work are included unless written into the proposal.[6] [9]

The latest release also preserves valuable technical foundations. The audited article has a self-referencing canonical and page-specific social metadata, while the canonical sitemap is publicly declared from `robots.txt`.[1] [2] [7] These are the right conditions to maintain while continuing service-area and resource-page expansion.

## Recommended Work Order

| Order | Work item | Owner | Completion evidence |
|---|---|---|---|
| 1 | Resolve the Google location selection and retry review sync after quota recovery. | Jon / operations administrator | Reviews refresh succeeds and the correct profile reviews appear in Operations. |
| 2 | Reconcile deposit and cancellation policy with counsel. | Jon / counsel | One approved policy appears consistently in Terms, proposals, and deposits. |
| 3 | Finalize the Privacy Policy review. | Jon / counsel | Draft label is removed only after approved wording is published. |
| 4 | Replace the FAQ’s legacy CTA. | Website | FAQ uses the Site Visit workflow and the regression check passes. |
| 5 | Recheck the Operations Google status after the sync repair. | Website / Jon | Dashboard and Integrations report the same state. |

## Scope Limits

This audit did not submit a form, process a payment, create a lead, alter an operations record, or change any Google account settings. Insurance, licensing, service-area coverage, response-time, and equipment-performance claims were assessed only as published site claims; their real-world accuracy requires owner records and operational confirmation. Legal recommendations are implementation observations, not legal advice.

## References

[1]: https://nolandearthworks.com/robots.txt "Noland Earthworks robots.txt"
[2]: https://nolandearthworks.com/sitemap.xml "Noland Earthworks sitemap"
[3]: https://nolandearthworks.com/ops/settings?tab=integrations "Operations Integrations"
[4]: https://nolandearthworks.com/terms-of-service "Terms of Service"
[5]: https://nolandearthworks.com/faq "Forestry Mulching and Land Management FAQ"
[6]: https://nolandearthworks.com/services/forestry-mulching "Forestry Mulching in Tennessee"
[7]: https://nolandearthworks.com/blog/cost-of-land-management-tennessee "Land Management Proposal Factors in Tennessee"
[8]: https://nolandearthworks.com/service-areas/davidson-county "Land Management in Davidson County"
[9]: https://nolandearthworks.com/services/add-ons/fence-line-clearing "Fence Line Clearing in Tennessee"
