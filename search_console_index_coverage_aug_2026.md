# Search Console Index Coverage Review — August 13, 2026

**Property:** `https://nolandearthworks.com/`  
**Search Console report timestamp:** August 7, 2026

## Current Coverage Baseline

| Category | URLs | Initial assessment |
| --- | ---: | --- |
| Indexed | 34 | Current discoverable baseline. |
| Discovered - currently not indexed | 69 | Google-system exclusion; likely crawl-priority or content-quality review candidates, not a direct technical error. |
| Crawled - currently not indexed | 7 | Highest-priority URLs to inspect for value, uniqueness, canonical alignment, and internal links. |
| Soft 404 | 3 | Website-generated response to inspect; should be a true 404/410 if obsolete or strengthened if it is a valuable page. |
| Alternate page with proper canonical | 5 | Usually expected consolidation when canonicals point to the preferred page. |

## Safety Rule

No blanket request-indexing action or canonical change will be made. The report predates the August 13 releases, so the next Search Console refresh is required before treating the count as a post-change regression.

## Crawled-Not-Indexed Examples

| URL | Last crawled | Initial action |
| --- | --- | --- |
| `/services/mulch-redistribution` | July 23 | Verify whether the service is intentionally available and linked from the main service taxonomy; strengthen the canonical service relationship if it is. |
| `/blog/land-management-cheatham-county` | July 1 | Review uniqueness, internal links, and county-page overlap before deciding whether to strengthen or consolidate it. |
| `/services/add-ons/post-clear-seeding` | July 1 | Confirm this is not positioned as a primary service and that the page has clear scope and internal links. |
| `/services/selective-clearing` | June 25 | Review the page’s unique commercial purpose against forestry-mulching content. |
| `/blog/forestry-mulching-vs-bush-hogging` | June 16 | Preserve as an educational comparison, then check title, canonical, and links from relevant service pages. |
| `/quote?county=davidson&city=Nashville&state=TN` | April 13 | Expected query-parameter variant; it should not be indexed separately. |
| `/blog` | April 10 | Verify the live archive has a self-canonical, sufficient content, and indexable rendered response. |

## Soft-404 Examples

| URL | Last crawled | Initial action |
| --- | --- | --- |
| `/blog/cost-of-land-clearing-tennessee` | July 17 | Expected legacy terminology path; confirm it redirects to the current Tennessee land-management cost article rather than serving thin fallback content. |
| `/services` | June 14 | High-value hub; verify its rendered response, canonical, meaningful body content, and inclusion in the sitemap. |
| `/privacy` | June 6 | Legal page; verify a normal 200 response and self-canonical. It does not need to compete as an organic landing page. |
