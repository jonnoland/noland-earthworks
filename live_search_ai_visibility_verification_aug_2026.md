# Live Search, Performance & AI Visibility Verification

**Review date:** August 13, 2026  
**Property:** `https://nolandearthworks.com/`

## Current Assessment

The public site is crawlable and continues to generate non-branded discovery impressions. The latest Search Console data does **not** show an observed indexing collapse, but its Page indexing report was last updated August 7—before the most recent production work—so it cannot yet prove that the August 13 changes had no later effect. Mobile page experience remains the main technical constraint, particularly on the forestry-mulching service page. Direct AI-search evidence is limited: Search Console records generative-AI impressions, and one completed ChatGPT query cited Noland Earthworks’ Tennessee cost article; Perplexity could not be tested without an account. [1] [2] [3]

| Area | Verified evidence | Assessment |
| --- | --- | --- |
| Mobile performance | Home: 56; forestry-mulching page: 35; quote page: 54 in the same mobile PageSpeed audit run | The forestry-mulching service page is the priority page-experience issue. |
| Search Console performance | 13 clicks, 1,170 impressions, 1.1% CTR, average position 12.1 for August 3–11 | Low-volume but active non-branded discovery; not enough time-series evidence to diagnose a post-change rank movement. |
| Indexing | 34 indexed and 84 excluded; report last updated August 7 | No visible sudden reduction, but verification needs a follow-up after Search Console refreshes. |
| Google generative AI | 160 impressions for August 3–11; the Tennessee land-management cost article led with 91 impressions | Direct evidence of Google generative-surface visibility, concentrated on practical cost and timing content. |
| ChatGPT | One cost query directly cited `https://nolandearthworks.com/blog/cost-of-land-management-tennessee?utm_source=chatgpt.com` | Positive but narrow evidence; this is not a measure of overall ChatGPT visibility. |
| Perplexity | All three planned checks were unavailable because the service required login or closed the connection | No conclusion about Perplexity visibility can be drawn from this environment. |

## Mobile Performance Snapshot

| Priority page | Performance | First Contentful Paint | Largest Contentful Paint | Reading |
| --- | ---: | ---: | ---: | --- |
| Homepage | 56 | 5.0 s | 9.9 s | The recent route, map, hero, and font work reduced unused JavaScript in earlier runs, but this remains a variable lab result. |
| Forestry mulching service | 35 | 3.5 s | 12.7 s | Highest-priority performance page because it is both commercial and visible in Google generative AI features. Follow-up optimization is recorded below. |
| Quote page | 54 | 3.8 s | 10.2 s | Functional, but still too slow for a key conversion path. |

## Google Search Console Review

The latest standard Search Console report recorded 13 clicks and 1,170 impressions. The visible query set includes local and non-branded demand such as `forestry mulching near me`, `land clearing`, and `vegetation management land services`. The current indexed-page count is 34. Exclusions consist of 69 discovered-but-not-indexed URLs, 7 crawled-but-not-indexed URLs, 5 canonical alternates, and 3 soft 404s.

Because the Page indexing report is dated August 7, it predates the August 13 releases. The right conclusion is **no observed regression in the available data**, not a guarantee that no regression occurred. Check the report again after its next refresh and compare the indexed-page count, soft 404 count, and the daily impressions line against this baseline. [1] [2]

**Performance follow-up:** The forestry-mulching page then received a responsive high-priority hero image. A subsequent mobile PageSpeed run measured 61 performance, 4.7 seconds FCP, and 12.3 seconds LCP. The mobile hero payload dropped from approximately 500 KB to 130 KB. Lab results vary, but the score improvement supports retaining this low-risk change.

## AI Search Visibility

Google’s Generative AI features report gives stronger evidence than a generic AI-visibility score: the property received 160 impressions in the observed window. The most visible pages were the Tennessee cost article (91 impressions), best-time-to-clear article (15), homepage (14), and forestry-mulching service page (13). The useful pattern is that practical, first-party Tennessee content is winning the majority of measured generative exposure. [3]

The service-level Perplexity checks could not run in the available session; therefore, they are **unknown**, not failures. ChatGPT could complete one of three planned checks and cited the Tennessee cost article for a cost query. Preserve that article’s factual local detail and keep internal links to the quote and forestry-mulching service pages prominent so the cited educational page can assist commercial discovery.

## Final Prioritization

1. **Problem:** The forestry-mulching service page’s LCP remains 12.3 seconds after its score improved from 35 to 61 in a follow-up lab run. **Fix:** Retain the responsive hero optimization and evaluate any next LCP change against the conversion-path tradeoff before publishing it.
2. **Problem:** Search Console’s current index report predates the latest deployment, so a post-change indexing conclusion is not yet available. **Fix:** Recheck indexed, soft-404, and discovered-not-indexed trends after the next Search Console refresh.
3. **Problem:** Google generative impressions are concentrated on educational cost/timing pages, while direct Perplexity evidence is unavailable. **Fix:** Continue building factual Tennessee-specific answers that link directly to service and quote pages; repeat Perplexity checks from an authenticated account before judging its visibility.

## References

[1]: https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fnolandearthworks.com%2F "Google Search Console Performance report (authenticated property)"

[2]: https://search.google.com/search-console/index?resource_id=https%3A%2F%2Fnolandearthworks.com%2F "Google Search Console Page indexing report (authenticated property)"

[3]: https://search.google.com/search-console/performance/search-analytics/ai?resource_id=https%3A%2F%2Fnolandearthworks.com%2F "Google Search Console Generative AI features report (authenticated property)"
