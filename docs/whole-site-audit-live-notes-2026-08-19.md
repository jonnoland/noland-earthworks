# Whole-Site Audit Live Notes — August 19, 2026

## Browser-Validated Public Routes

The live browser rendered `https://nolandearthworks.com/services/forestry-mulching` as a page-specific Forestry Mulching service page with its own hero, FAQs, benefit list, scope boundaries, and site-visit-based call to action. The parallel text extraction that reported generic homepage content for this route is therefore not treated as a confirmed finding.

The live browser rendered `https://nolandearthworks.com/blog/cost-of-land-management-tennessee` as a page-specific resource article titled **“What Affects a Land Management Proposal in Tennessee? (2026 Guide)”** with article navigation, related-article links, scoped exclusions, and site-visit workflow guidance. The parallel text extraction that reported a generic homepage fallback for this route is therefore not treated as a confirmed finding.

The browser title on both routes remains the generic site title, which is a separate metadata item to validate through DOM/head inspection rather than page-body extraction.

## Metadata Validation

The live article route `https://nolandearthworks.com/blog/cost-of-land-management-tennessee` has the page-specific title **“Land Management Proposal Factors in Tennessee | Noland Earthworks”**, a matching self-referencing canonical URL, page-specific description, and matching Open Graph title and URL.

The live Forestry Mulching route has the page-specific browser title **“Forestry Mulching in Tennessee | Noland Earthworks”** and visibly renders service-specific content. The initial generic title reported by a text extraction was not reproduced in the browser after the current deployment finished loading.

## FAQ and Terms Validation

The live FAQ route renders its advertised FAQ page with 25 customer questions organized by topic. It is not a generic homepage fallback. The page still contains a legacy **“Request a Free Estimate”** call to action, which conflicts with the current site-wide **Request a Site Visit** workflow and should be treated as a confirmed copy inconsistency.

The Terms of Service visibly state that deposit requirements are communicated at booking, deposits are refundable with cancellation 14 or more days before the scheduled start date, and deposits are non-refundable within 14 days. The page requires a focused text comparison against later payment provisions before a contradiction is treated as confirmed.

The full terms text later narrows the refundable deposit statement to projects over $5,000 without reconciling it with the earlier general rule. This is a confirmed customer-facing cancellation-term ambiguity that should be reviewed with counsel before any public wording is finalized.

## Crawl Controls

`robots.txt` permits public crawling, disallows `/api/`, and declares the production XML sitemap. The live sitemap contains 69 canonical HTTPS URLs and includes core services, selected add-ons, public resources, county pages, privacy policy, and terms. The production `llms.txt` is current with the site-visit workflow and canonical public paths.

## Operations Review

An authenticated operations session shows the current dashboard on version 1.0.83 with zero active jobs, open leads, open quotes, and open invoices. The dashboard exposes the expected sales, field-work, reporting, pricing, reviews, and settings areas. It currently reports Google Business Profile as not connected.

The direct Operations settings URL was opened to validate that status, but its integrations content was still loading at capture time. The dashboard status is treated as a confirmed operational alert; the underlying connection state requires the completed settings or server response before it is classified as a configuration defect.

The completed Integrations view reports Google Business Profile as connected, and the production token-refresh scheduler successfully refreshed the access token with a new same-day expiry. Production logs show the live review sync is nevertheless failing because no `locationName` is stored, the account-discovery call is receiving a Google `RATE_LIMIT_EXCEEDED` response, and the Places fallback returns `NOT_FOUND`. This is a confirmed integration-data and quota problem; it is not resolved merely by the connected status indicator.

## Route-Level Validation

The live Davidson County page renders county-specific content with consistent **Request a Site Visit** wording. The previously reported plural CTA error was not reproduced in the current browser and is not treated as a confirmed finding.

The canonical add-on URL `https://nolandearthworks.com/services/add-ons/fence-line-clearing` renders a page-specific Fence Line Clearing service page, FAQ set, related-service links, and written-scope boundaries. The prior report checked a non-canonical `/services/fence-line-clearing` path, so its generic-page finding is not treated as a current defect.
