# Priority Page Mobile LCP Follow-Up — August 14, 2026

## Measured Baseline

| URL | Mobile performance score | Lighthouse laboratory LCP | Measured LCP element | Immediate interpretation |
| --- | ---: | ---: | --- | --- |
| `/services/forestry-mulching` | 67/100 | 10.5 s | Mobile forestry-mulching hero image | The correct responsive image is used, but it is still discovered after the initial document is processed. |
| `/quote` | 66/100 | 10.0 s | Above-the-fold introductory paragraph | The shorter Site Visit Request flow is leaner, but initial page render/hydration remains the primary lab bottleneck. |

## Findings

The Forestry Mulching page already serves a mobile-specific image with `fetchpriority="high"`, but Lighthouse still identifies a **1.28-second resource discovery/load delay**. This points to the route’s first-document and JavaScript/hydration path, not image transfer time alone. The image took only about 0.15 seconds to load after it was requested.

The Site Visit Request page’s LCP element is text, not an image. Lighthouse attributes roughly **1.32 seconds of element-render delay**, which indicates that adding another preload would not be the correct first change. Keep the page focused on the short visit request and avoid reintroducing a calculator, map drawing tools, or public estimate animation above the form.

## Next Technical Work

1. Verify the production prerender response for both routes contains route-specific title, description, canonical data, and the initial meaningful page content before hydration.
2. Evaluate route-specific document-head preloads for the Forestry Mulching mobile hero only; do not globally preload a service hero on the homepage or quote page.
3. Profile the initial JavaScript needed by `/quote`; defer nonessential public widgets until idle while preserving address search only when the user opens that optional field.
4. Re-run mobile PageSpeed after each one-purpose change. Retain a change only if it improves the measured LCP without reducing quote-form completion, map usability, or SEO rendering.

## Excluded URL Review Rule

For every newly excluded URL in Search Console, record the exact URL, exclusion reason, intended destination, and decision. Keep only intentional redirects, intentional canonical exclusions, and URLs that should remain unavailable. Fix unintended `404`, `soft 404`, `blocked`, canonical, or crawl failures before publishing further county/service content. Do not create pages solely to clear an exclusion; each new page needs a unique, factual customer question or verified job evidence.
