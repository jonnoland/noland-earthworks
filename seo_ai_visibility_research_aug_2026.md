# SEO & AI Visibility Research Notes — August 2026

## Google Search Central

Google’s LocalBusiness structured-data documentation says that local-business markup should accurately describe the business, include the required address and name fields, and be validated with Rich Results Test and URL Inspection. Google also recommends submitting a sitemap and allowing time for recrawling after deployment. LocalBusiness aggregate rating and review properties are only recommended where a site captures reviews **about other local businesses**, not self-serving business ratings.  
Source: <https://developers.google.com/search/docs/appearance/structured-data/local-business>

Google’s general structured-data guidelines state that markup must be representative of the page, current, and visible to readers; Google warns against misleading structured data, fake reviews, and content hidden from users. Correct markup enables eligibility but does not guarantee a search appearance.  
Source: <https://developers.google.com/search/docs/appearance/structured-data/sd-policies>

Google’s 2026 documentation updates clarify that `llms.txt` is not needed for Google Search and does not positively or negatively affect Google visibility. They also record the removal of FAQ rich-result documentation in June 2026. Google added its generative-AI optimization guidance in May 2026, emphasizing original, non-commodity, locally useful content rather than shortcut markup.  
Source: <https://developers.google.com/search/updates>

## Bing Webmaster Tools AI Performance

Bing’s AI Performance preview reports real citation activity across supported Microsoft AI experiences: total citations, average cited pages, grounding queries, page-level citations, and trends. Bing frames these as citation data, not rankings or authority. It recommends using cited pages and grounding queries to deepen coverage, improve structure and clarity, support claims with evidence, keep content accurate, and maintain consistent local business information. Bing also recommends Bing Places and IndexNow for freshness.  
Source: <https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview>

## Live Site Observations

On 2026-08-13, `robots.txt` allowed all public crawlers and pointed to the XML sitemap. The live sitemap was reachable and included service, blog, and county URLs. The site served `llms.txt`; however, its contents included unsupported claims about a 4.9-star rating, customer sentiment, and “recommended” status. The homepage LocalBusiness JSON-LD also contained an unsupported `aggregateRating` with a 4.9 rating and 47 reviews. These claims should be removed unless verified by visible, current, first-party review data.

The internal AI Visibility diagnostic currently records controlled Grok-answer prompts rather than actual search-engine citations. Its latest 2026-08-13 audit was 85/100 with 9 mentions in 15 prompts, but it missed the three core Middle Tennessee local-service prompts, two of four use-case prompts, and one competitor prompt. The score previously over-weighted branded prompts, so recalibration should give local discovery and use-case coverage more weight and label domain-link detection as a controlled prompt signal rather than an external citation metric.
