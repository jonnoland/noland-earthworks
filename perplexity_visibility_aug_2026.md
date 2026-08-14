# Authenticated Perplexity Visibility Check

**Review date:** August 13–14, 2026  
**Method:** Signed-in Perplexity web search; results are point-in-time observations, not a persistent rank measurement.

## Query 1 — Middle Tennessee Provider Discovery

> **Query:** “Which forestry mulching companies serve Middle Tennessee? Include local providers and cite their websites.”

Perplexity listed **Noland Earthworks, LLC first** in its provider table. It identified Vanleer as the base, stated that the company serves 35 counties in Middle and West Tennessee, and cited the canonical forestry-mulching service page: `https://nolandearthworks.com/services/forestry-mulching`. The response included 14 sources and placed Noland Earthworks alongside local competitors including Wolf Creek Land Company and Middle Tennessee Land Clearing LLC.

This is direct, favorable evidence for the core regional provider query. It validates the current service-page and local service-area entity signals; it does not establish visibility for every county, service, or search session.

## Query 2 — Steep, Cedar-Heavy Site Fit

> **Query:** “Who can handle steep, cedar-heavy forestry mulching in Middle Tennessee? Cite local providers and explain what property owners should look for.”

Perplexity again listed **Noland Earthworks first**. It cited the quote page and described the tracked machine capability, steep-slope and wet-ground suitability, cedar-thicket clearing, Vanleer base, 35-county coverage, and phone number. The response placed Noland Earthworks ahead of ARG Outdoor Services, VolLand Solutions, All Terrain Land Clearing, and Midstate Land Clearing.

The answer also surfaced specific property-fit concepts that the site already describes: tracked equipment, site review before pricing, cedar density, slope, rocky access, erosion protection, and mulching in place. This is strong direct evidence that the site’s terrain-and-vegetation language is being retrieved for a commercially relevant use case.

## Google Ads Readiness Note

The Google Ads connector was enabled and the signed-in account exposed a **Noland Earthworks** Google Ads account (CID `995-981-2801`). Google Ads loaded the account shell but displayed an ad-blocker warning, which prevented campaign cards and account metrics from rendering in this browser session. No campaign, budget, conversion, or account setting was changed. A follow-up read-only review requires temporarily disabling the ad blocker for `ads.google.com` or using a separate browser profile without blocking extensions.

## In-App Google Ads Readiness

The `/ops/ads` workspace already creates platform-specific Google Ads headlines, descriptions, extended copy, stores drafts, schedules the related record, and supports manual spend tracking. The current Google workflow is explicitly copy-and-paste: it does **not** contain a Google Ads API campaign or ad publishing procedure. The connected Google Ads account confirms that an account is available, but the in-app direct-posting requirement would need a separately authorized Google Ads API/OAuth implementation. That work should be scoped separately because creating or editing campaigns is an external advertising action requiring explicit review and confirmation.
