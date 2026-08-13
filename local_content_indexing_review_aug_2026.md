# Local Content & Indexing Review

**Review date:** August 13, 2026  
**Scope:** County service-area pages, duplicate county blog URLs, and local internal-link coverage.

## Inventory

The live sitemap contains **35** `/service-areas/{county}` landing pages, and the county-page data model contains the same 35 county entries. Each landing page uses a county-specific title, metadata description, city/town list, nearby-county links, localized FAQ prompt, and service links. This creates a clear canonical destination for local search rather than leaving separate county blog pages to compete for the same intent.

| Asset group | Count | Finding | Indexing action |
| --- | ---: | --- | --- |
| Canonical county service-area pages | 35 | Sitemap and local page-data coverage align. | Retain as the indexable local landing-page set. |
| Duplicate county blog paths | 35 | Each follows `/blog/land-management-{county}` and overlaps its matching service-area intent. | Consolidate with permanent redirects to `/service-areas/{county}`. |
| County-page internal service links | 4 per page | Forestry Mulching, Land Management, Vegetation Management, and Brush Hogging are linked from each county page. | Retain. |
| Nearby-county links | 4–5 per page | Adjacent service-area links provide internal local discovery paths. | Retain. |

## Finding and Remediation

The primary duplication risk came from the older county blog URL family: it duplicated the same county-and-service intent already held by the canonical service-area pages. The production redirect layer now maps each recognized `/blog/land-management-{county}` URL to the corresponding `/service-areas/{county}` page with a 301. This consolidates legacy signals without removing useful, distinct statewide and commercial-audience blog content.

The standardized right-of-way paragraph appears on 34 county pages. It should not be expanded further as repeated boilerplate. Future local content should add factual, job-specific material only when it is supported by an actual project, verified access constraint, landowner question, or local permitting consideration. Generic extra paragraphs would increase duplication risk rather than local relevance.

## Validation Plan

The redirect pattern has unit coverage and will be checked at the custom domain after deployment. Google Search Console will require a later refresh before it shows legacy county blog URLs leaving the indexed or excluded reports. Keep the service-area URLs in the sitemap and avoid submitting both URL families for indexing.
