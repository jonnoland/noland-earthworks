# Mobile PageSpeed Measurement — August 13, 2026

**Audited URL:** https://nolandearthworks.com/

**Measurement source:** Google PageSpeed Insights API v5, mobile strategy.

| Metric | Measured result |
|---|---:|
| Lighthouse Performance score | 59 / 100 |
| Largest Contentful Paint | 10.9 seconds |
| First Contentful Paint | 6.2 seconds |
| Speed Index | 6.2 seconds |
| Total Blocking Time | 68.5 milliseconds |
| Cumulative Layout Shift | 0.00018 |
| Estimated unused JavaScript | 750 KiB |

The first successful measured request returned HTTP 200 after the PageSpeed Insights API was enabled and added to the existing Maps Platform API key restrictions. The result shows that JavaScript execution and layout stability are already good; the primary measured opportunity is the slow critical rendering path, especially the LCP element and initial resource delivery.

The previous internal Performance Category result of 64 was not a measured PageSpeed score. Its PageSpeed request had returned a quota or key-restriction error, and the audit had also falsely treated a module script as parser-blocking. The audit logic was corrected before this measurement.

Source URL: https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Fnolandearthworks.com%2F&strategy=mobile
