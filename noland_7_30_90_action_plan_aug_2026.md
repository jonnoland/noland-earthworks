# Noland Earthworks: 7/30/90-Day Action Plan

**Prepared:** August 11, 2026  
**Method:** Reusable AI, Lead Generation, Customer Interaction & AEO Audit

## Executive Decision

**Do not add another broad AI feature first.** The immediate constraint is the handoff from inquiry to a sent, viewed, and followed-up quote. The system already generates estimates, proposals, quotes, invoices, captions, and agent outputs. The current evidence shows that those outputs are not consistently becoming customer-facing actions or measured decisions.

The priority for the next 30 days is to make the existing system operate as one pipeline: **lead → first response → site visit → quote sent → quote viewed → decision → deposit → job → final invoice → review**. The next highest priority is to repair the review experience and use real proof—reviews and completed-job media—to improve local visibility and trust.

| Finding | Evidence from this audit | What it means | Priority |
| --- | --- | --- | --- |
| Lead data is too thin to diagnose seasonality | Six recorded leads; all lack estimated value | Weather, demand, channel quality, and conversion cannot be separated yet | Critical |
| Quotes are stalling before customer review | Four native quotes: three Draft totaling **$19,378** and one Sent at **$6,750**; no portal views recorded | The first operational bottleneck is quote dispatch and follow-up | Critical |
| Review system is not trustworthy yet | Live logs repeatedly show Google Places `NOT_FOUND`; the public review page still contains static fallback reviews | Public proof must use verified reviews only | Critical |
| Existing AI is under-connected | Quote/proposal AI, follow-up agents, pricing, photo captioning, and visibility scoring exist, but do not share one next-action queue | Improve workflow completion before adding AI capability | High |
| AEO score is directional, not proof of demand | Latest AI audit: **85** overall, 9/15 mentions, 0 citations | Track external citations and real leads, not only simulated mentions | High |
| Public offer information needs alignment | Quote form says one-acre minimum but offers smaller-acreage choices; homepage mentions a 5% multi-service discount while Ops pricing contains different current discount controls | Remove avoidable confusion before asking customers to convert | High |

## What the Site Already Does Well

The public site makes the core offer clear: Jon is the owner/operator, forestry mulching is the primary service, and the business serves Middle and West Tennessee. The homepage provides direct phone access, visible quote calls to action, a pricing entry point, service navigation, service-area content, a gallery, FAQs, and chat. The quote form also does a strong job of qualifying work with service, county, client type, acreage, add-ons, address, and job-detail fields while explaining what happens after submission.

Technical crawlability is no longer the main problem. The homepage, Forestry Mulching page, and Dickson County page each returned HTTP 200 to a Googlebot user agent with substantial rendered HTML and unique titles. Keep monitoring indexing, but do not spend the next month rebuilding sitemap, robots, or schema foundations.

The internal AI foundation is substantial. It supports chat qualification, lead scoring, estimate creation, proposal drafts, quote creation, pricing intelligence, photo captions, social drafting, invoice support, review-request logic, and AI visibility audits. This is more than enough automation for the current business stage. The right move is to use it to eliminate response delay and follow-up gaps.

## Non-Negotiable Correction: Real Reviews Only

The public Reviews page should never show “representative,” placeholder, or static fallback customer reviews. Remove those cards and display only reviews retrieved from verified sources. Until the Google review connection works, show an honest empty state with a real Google review link, completed-project media, and an invitation to request a site visit.

Google says complete business information, review replies, photos/videos, and positive ratings can support local visibility; local results are driven primarily by relevance, distance, and prominence.[1] BrightLocal’s 2025 survey also reports that only 4% of consumers never read reviews, while 74% use at least two review sources before deciding.[2] The business does not need fake social proof. It needs a small, steady base of authentic, detailed customer reviews with real project context.

## First 7 Days: Repair Trust and Move Quotes

| Work | Exact action | Owner | Success measure |
| --- | --- | --- | --- |
| 1. Remove unsupported review fallbacks | Remove all static review cards. Upgrade `reviewsRouter` to the current Google Places API endpoint, or show a verified-review empty state when no live data is available. | Jon / development | Zero unsupported testimonials; page shows only verified reviews or an honest empty state |
| 2. Make quote sending a required sales step | Add a prominent “Review & Send Quote” action for every Draft quote. Do not treat an AI-generated quote as complete until it is sent through the portal or email. | Jon | All viable quotes leave Draft within one business day of site visit |
| 3. Add a quote follow-up cadence | At send: confirmation. At 2 business days: concise check-in. At 7 days: close-the-loop message. Stop on reply, decline, approval, or manual pause. | System with Jon approval | Sent, viewed, replied, approved, and declined counts are captured |
| 4. Build one daily next-actions queue | Surface uncontacted leads, unscheduled visits, Draft quotes, sent-but-unviewed quotes, viewed-no-response quotes, unpaid deposits, completed jobs without final invoice, and paid jobs eligible for review. | Development | Jon can work the day’s revenue actions from one screen |
| 5. Align public promise and settings | Clarify the one-acre minimum beside sub-acreage choices. Update/remove the homepage multi-service discount unless it is an active pricing policy. Keep Military/Veteran and First-Time offers consistent everywhere. | Jon / development | No conflicting discount or minimum-job language |
| 6. Start review capture manually | For every recent successful paid job, send a personal, one-sentence request with the real Google review link. Use the automated trigger only after confirming it works. | Jon | First verified reviews and live review-link clicks |

### 7-Day Customer Message Standards

The messages should be direct and plain-spoken. They should not pressure the customer or make pricing promises.

> **Quote follow-up:** “Hi [Name], Jon with Noland Earthworks. I wanted to make sure you received the quote for [property/service]. If you have any questions about the scope or timing, send them over and I’ll get you a straight answer.”

> **Review request after a good completed job:** “Hi [Name], Jon with Noland Earthworks. I appreciate the chance to work on your property. If you are satisfied with the work, an honest Google review helps a small local business more than you know: [review link].”

## Days 8–30: Make Acquisition and Sales Measurable

### 1. Install Source-to-Revenue Attribution

Every lead needs a source, service type, county, estimated value, first-response timestamp, and next action. Every quote needs a sent timestamp, viewed timestamp, status, reason won/lost, and associated lead source. Every job needs a quote link, deposit status, final invoice status, review-request status, and final outcome.

| Funnel stage | Required fields / events | Decision it enables |
| --- | --- | --- |
| Discovery | Source, campaign, landing page, Google Business Profile / Facebook / referral identifier | Which channel creates inquiries |
| Intent | Phone click, text click, form start, form completion, calculator use, chat start | Which page or CTA creates real interest |
| Lead | Service, county, acreage, client type, estimated value, fit status | Which inquiries are worth a site visit |
| Sales | First response, visit scheduled/completed, quote created/sent/viewed | Where leads stall |
| Close | Approved/declined, reason, deposit, job scheduled | Quote conversion by service and source |
| Retention | Final invoice paid, review requested/received, referral | Reputation and repeat/referral value |

The first dashboard should report median first-response time, quote-sent rate, quote-view rate, approval rate, days from visit to quote, average job value, and won revenue by source. Do not make decisions about weather, seasonality, or ad budget until at least 60–90 days of properly attributed data exists.

### 2. Turn Completed Work into Real Proof

For every completed job, collect a minimum proof package: a wide before photo, a 15–45 second equipment-at-work clip, a finished-after photo, county, approximate acreage, original problem, and outcome. The existing AI caption tool can draft descriptions, but Jon verifies the facts before publishing.

Use each verified package in four places: gallery entry, county-page “recent work nearby” module, social post draft, and a short project story. This is the correct use of AI: reduce writing time while keeping all proof real.

BrightLocal reports that more than three-quarters of surveyed consumers use video while researching local businesses and that business-posted video is a leading format for that research.[2] Google also recommends content that demonstrates first-hand experience, clear authorship, and useful original detail rather than mass-produced pages.[3]

### 3. Tighten the Public Quote Funnel Without Reducing Qualification

Keep the useful qualification fields. Instead of immediately removing them, instrument where visitors abandon the form. If early drop-off is high, divide the form into two short steps: contact + service/county first; property detail and optional job preparation second. Maintain the message that final pricing requires a site visit.

Add a single small reassurance near the submit button: “You will hear from Jon within 24 hours. No automated sales team, no pressure.” That matches the actual business model and differentiates the company from broad lead aggregators.

### 4. Establish Local Presence Beyond the Website

Claim, verify, and keep current the Google Business Profile, Bing Places, Apple Business Connect, and any directory that is genuinely relevant to the business. Use the same name, telephone, service area, service categories, and website. Do not list organizations as affiliations unless the business is actually a member.

Google explicitly recommends complete and accurate Business Profile information, review responses, photos/video, and verification.[1] Bing’s AI Performance documentation recommends Bing Places for accurate local business details in AI-powered location queries.[4]

## Days 31–90: Build Durable Local Authority and AEO Evidence

### 1. Replace Internal AEO Scores with External-Evidence Reporting

The current AI Visibility Score is useful for comparing prompt outcomes, but it is not traffic or revenue. It currently reports an 85 overall score with 9 mentions across 15 prompts and zero cited responses. Use it as a diagnostic, then add external evidence:

- Bing AI Performance citations, cited URLs, and grounding queries.
- Google Search Console impressions, clicks, indexed pages, and query themes.
- Google Business Profile calls, website clicks, and direction requests.
- Leads, site visits, quotes, and approved work that originate from organic/AI-search pages.

Bing’s AI Performance dashboard is designed to show citations, cited pages, grounding queries, and trends. Bing recommends using those signals to improve clarity, depth, accuracy, and local business information.[4]

### 2. Publish Fewer, Stronger First-Party Pages

Build content only from real field knowledge and real jobs. Strong topics include cedar thicket reclamation, clearing wet or sloped ground, fence-line access, trail cutting, preparing an acreage for pasture, and what a landowner should do before a site visit. Each page should use direct question headings, short self-contained answers, a small comparison table where useful, clear exclusions, real local context, and a clear CTA.

Microsoft’s current AI-search guidance says strong eligibility comes from fresh, authoritative, structured, semantically clear content: aligned title/H1/description, direct Q&A, lists/tables, evidence, and concise self-contained statements.[5] This does not guarantee AI citation; it makes content easier to understand and reuse accurately.

### 3. Build Local References the Right Way

Seek legitimate mentions through veteran-business groups, local chambers the company actually joins, conservation or landowner events, community work, local news, and partner referrals. Create links and mentions by being useful, not by buying generic directories. BrightLocal reports that 48% of surveyed U.S. adults use local news outlets for local business information and reviews, so community participation can carry more trust than another generic listing.[2]

### 4. Review the Economics, Not Just the Activity

At day 90, review lead source, site-visit rate, quote approval, average job value, days-to-close, and gross margin proxy by source and service. Keep marketing channels that create qualified site visits and approved work. Reduce or pause channels that produce low-fit, under-minimum, or price-shopping inquiries.

## AI Workflow Plan

| Existing capability | Keep / change | Human control | Measurement |
| --- | --- | --- | --- |
| AI chat | Keep; narrow its job to fit qualification, contact capture, and site-visit handoff | Jon confirms final scope and price | Chat starts → captured leads → site visits |
| AI estimate and proposal | Keep; automatically create draft quote/proposal but require review/send action | Jon approves scope, price, discounts, and customer message | Draft → sent time; send → approval rate |
| Lead follow-up agent | Change; drive only a visible next-action queue and pause on reply | Jon can pause/edit every sequence | Leads contacted within target window |
| Photo captioning | Keep; use verified job fields and actual media only | Jon approves before publishing | Jobs with proof package; gallery/social output |
| Review request agent | Keep; run after final payment, sentiment guard, manual override | Jon confirms sensitive cases | Eligible paid jobs → requests → received reviews |
| AI visibility audit | Change; add external citation and lead evidence | Jon chooses content priorities | Citations, cited pages, organic leads, not score alone |

## Operating Cadence

| Cadence | Action | Purpose |
| --- | --- | --- |
| Every morning | Work the next-actions queue for 15 minutes before field work | Prevent leads and quotes from going stale |
| After each site visit | Finalize/send quote by next business day | Make response speed a sales advantage |
| After each completed job | Capture proof package and send final invoice | Create trust assets and cash-flow follow-through |
| 48 hours after paid | Send honest review request unless flagged | Build verified local prominence |
| Every Friday | Review source, pipeline, sent/viewed quotes, and next week’s open capacity | Make capacity-driven marketing decisions |
| Monthly | Compare channels by site visits, approvals, value, and margin proxy | Stop guessing about lead quality and seasonality |
| Quarterly | Audit AEO citations, real project stories, service-area proof, and directory accuracy | Build durable discoverability |

## Expected Result and Guardrails

This plan is designed to create a reliable sales and visibility system, not a guaranteed lead number. The measures that matter are faster first response, more quotes sent, more quotes viewed, more approved work, more verified reviews, and better source attribution. Pricing, job scope, discounts, schedule commitments, and client-facing content remain subject to Jon’s approval.

## References

[1]: https://support.google.com/business/answer/7091?hl=en "Google Business Profile Help: Tips to improve your local ranking on Google"
[2]: https://www.brightlocal.com/research/local-consumer-review-survey-2025/ "BrightLocal: Local Consumer Review Survey 2025"
[3]: https://developers.google.com/search/docs/fundamentals/creating-helpful-content "Google Search Central: Creating helpful, reliable, people-first content"
[4]: https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview "Bing Webmaster Blog: Introducing AI Performance in Bing Webmaster Tools"
[5]: https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers "Microsoft Advertising: Optimizing your content for inclusion in AI search answers"
