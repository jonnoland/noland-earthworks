# Noland Earthworks Comprehensive AI, Website & Digital Operations Audit

**Audit date:** August 14, 2026  
**Business:** Noland Earthworks, LLC — veteran-owned, owner-operated forestry mulching and land management business serving Middle and West Tennessee.

## A. Executive Summary

Noland Earthworks has an unusually capable foundation for a solo field-service business: the public site is clear, service-specific, mobile-oriented, and anchored to a strong owner-operated position; the quote form captures far more useful scope data than a normal contact form; and the operations app already contains lead, quote, job, invoice, pricing, automation, payment, content, and AI features. The constraint is **not a shortage of AI features**. It is the lack of measured, closed-loop adoption between lead capture, site visit, quote sent, quote viewed, deposit, completed job, final payment, review request, and attributable revenue. The available 90-day records are too small to establish a true close rate, but they do show a workflow-adoption problem: one recorded web quote has no linked native quote, four native quotes remain mostly draft, the public chat has two sessions and no converted chat lead, and most scheduled agents run successfully but have little or no actionable input. The highest-leverage move is to simplify the daily operating system around one accountable next action per qualified lead, then use AI only to speed the human-reviewed steps that move that lead forward.

| Top priority action | Why it comes first | Owner-facing success signal | Priority |
| --- | --- | --- | --- |
| Install a **Today’s Next Actions** queue that joins leads, visits, quotes, follow-ups, deposits, jobs, invoices, and reviews | The existing stack produces drafts and alerts, but the evidence does not show consistent completion of the next commercial action | No qualified lead or sent quote can sit without a dated next action | Critical |
| Run and monitor one end-to-end live web-quote test after the latest intake release | The only stored web quote predates the newest handoff/confidence fields and has no native quote link | A test request appears in Website Requests, receives AI analysis, creates a native quote, and can be advanced through payment | Critical |
| Fix route-specific server-rendered titles and descriptions | Browser pages have local/service-specific titles, but bot-facing HTML returned homepage-level title and description on representative service and county routes | Google URL Inspection shows the intended title, description, canonical, and rendered content for each priority page | Critical |
| Remove or lock down any AI workflow that can produce testimonial-style invented outcomes; verify the stale 4.9 review snippet | Trust proof must be factual. The database has zero stored reviews, while public search snippets still expose a 4.9 rating and quote | No unsupported rating/testimonial appears in live markup, schema, snippets, AI tools, or generated copy | Critical |
| Convert final-payment invoicing to Stripe-hosted, customer-specific invoices and track payment events | Deposit Checkout exists, but final native invoices are emailed/marked paid outside a Stripe-hosted payment and reconciliation loop | Invoices show sent, viewed, paid, overdue, and balance status without manual reconciliation | High |

## B. Current-State Findings

### 1. AI Integration

| What is working | What is missing | What is not working or is unproven |
| --- | --- | --- |
| The public AI chat answers fit questions, preserves the required on-site assessment, captures a name and phone, and can create a lead. Website quote intake sends structured service measurements and calculation basis to AI qualification. AI proposal drafting, field-quote assistance, voice/transcription support, pricing research, ad/social drafting, photo captions, RFP extraction, and operational analyses are present. | A single adoption view that identifies which AI output became a call, scheduled visit, sent quote, won job, paid invoice, review, or posted content. | Public chat has only two recorded sessions and no converted chat lead in the last 90 days. The AI visibility score is based on Grok-only data in recent runs while other platform values are null; overall scores ranged from 55 to 96 and should not be treated as a business-performance metric. The AI automation suite has broad capability but little evidence of completed downstream action. |

The AI architecture is strongest where it preserves human control. The web quote system now stores the requested services, measurements, calculation basis, preliminary itemization, qualification summary, risk factors, and confidence guidance. That supports a credible “AI assists; Jon approves” model. The serious weakness is that numerous AI features can generate useful output without making the owner’s next decision easier. A solo operator does not need more isolated panels; he needs a morning queue that says exactly who to call, visit, quote, follow up with, invoice, or ask for a review.

One high-risk AI workflow deserves immediate attention. The AI Visibility tool can generate specific outcome copy and describes it as suitable for a testimonials section. Generic or imagined results must **never** be published as customer testimony or job history. The FTC’s rule applies to false or misleading testimonials disseminated by a business, including AI-generated ones presented as real experiences.[1] [2]

### 2. Online Quote Requests

| What is working | What is missing | What is not working or is unproven |
| --- | --- | --- |
| The public form is strong: multi-service selection, acreage and linear measurements, terrain difficulty, add-ons, address lookup, property mapping, clear response expectation, four-step process explanation, and an on-site estimate gate. It correctly avoids publishing final prices. | A mandatory source field, a preferred-contact/time field, a concise “site visit requested” action, and a measured form-abandonment view. | There is only one recorded web submission in 90 days. That record has AI qualification but no linked native quote, likely because it predates the current native handoff. The current release should be verified with a real controlled submission. |

The quote page is feature-rich rather than underbuilt. The risk is cognitive load on mobile: acreage, terrain, service selection, add-ons, address lookup, property mapping, optional photo/documents, and free text can overwhelm a visitor who only wants to start a conversation. Preserve the current detail but use progressive disclosure: collect contact, service, county/address, and project size first; then offer “improve your estimate” inputs such as map drawing, linear footage, photos, and terrain. The page should show a visible **Save and continue later** option only if it can be tracked without creating orphaned personal data.

The confirmation step is sound because it promises a review within 24 hours and a free on-site visit rather than an automatic final price. The operations step must now match that promise. Every qualified submission should automatically create: a Website Request, an AI summary, an owner task with a response deadline, and an assigned next action. The recent update polls Website Requests every 15 seconds; the remaining test is not visibility of the card but reliable completion of the follow-up chain.

### 3. CRM Functionality

| What is working | What is missing | What is not working or is unproven |
| --- | --- | --- |
| Native leads, clients, quotes, jobs, invoices, status stages, notes, scheduled visits, review requests, discounts, and quote portal states exist. Web requests can create `web_request` native quotes, and quote cards now show AI confidence and itemization. | A single record of truth across lead, quote, client, job, invoice, and review; mandated next-action dates; source-to-revenue attribution; site-visit outcome fields; and an owner-focused daily queue. | The current tables are operationally fragmented. In the small 90-day sample, one web request has no native quote link; three of four native quotes are draft; automated review and visit-reminder agents have zero actions; and the data cannot calculate response time, visit-to-quote, quote-to-win, or revenue by source. |

The present CRM is better described as a **capable operations database** than a fully adopted CRM. This is not a reason to replace it. Adding a second CRM now would duplicate the same data and create more owner work. First, make the existing pipeline operationally mandatory. The working lifecycle should be: **New → Contacted → Site Visit Requested → Visit Confirmed → Visit Complete → Quote Draft → Quote Sent → Follow-up Due → Approved/Declined → Deposit Paid → Scheduled → Complete → Final Invoice Sent → Paid → Review Requested**. Each active stage needs one owner, one next action, and one due date. A field cannot be merely “status”; it must drive the next screen the owner sees.

### 4. SEO

| What is working | What is missing | What is not working or is unproven |
| --- | --- | --- |
| The public homepage has clear calls to action, owner-operated positioning, service links, FAQ content, gallery/review links, service-area coverage, and phone visibility. The Forestry Mulching page has useful educational content, FAQs, related-service links, share controls, and quote calls to action. The Dickson County page has materially local copy, relevant local questions, neighboring-county links, and a prefilled quote route. Robots allows public crawling and references a large XML sitemap. | Current Search Console confirmation, Bing Webmaster data, current GBP performance, route-specific server-rendered metadata confirmation across priority URLs, a genuine-project content rhythm, and a citation/directory cleanup log. | A Googlebot-user-agent fetch returned the generic homepage title and description for representative service and county URLs, although the browser-rendered pages showed the intended specific titles. That mismatch is a technical SEO risk because crawlers can use the initial HTML/head before client-side title updates. A text-only extractor also initially returned global homepage content for route-specific URLs, reinforcing the need to validate the rendering path. |

The site has the right content architecture: core service pages, county pages, pricing education, FAQs, gallery, and a dynamic sitemap. Google states that crawlable content, internal links, useful unique content, and sitemaps help discovery and understanding; they do not guarantee ranking.[3] [4] The immediate technical task is to ensure that the server-rendered or prerendered **head** for `/services/forestry-mulching`, priority county pages, articles, gallery pages, and reviews carries the same unique title, description, canonical, Open Graph data, and structured data that the browser shows after hydration.

Local SEO should stay grounded in Google’s actual local factors: relevance, distance, and prominence. Complete Business Profile information, genuine reviews and responses, and regular real job photos support those factors.[5] The page content should prioritize real before/after projects, job facts, property type, verified county/location, scope, and constraints—not additional generic city pages.

### 5. AI Visibility

| What is working | What is missing | What is not working or is unproven |
| --- | --- | --- |
| The application has an AI Visibility audit, prompt history, recommendations, editable fixes, service/county FAQ structure, organization/service/person/schema markup, and a documented focus on forestry-mulching discovery. Prior testing recorded useful Perplexity outcomes for selected queries. | Independent multi-platform measurement, Bing Webmaster Tools AI Performance, grounding queries, cited-page reports, current Search Console comparison, and conversion attribution from AI search to a quote. | Recent internal audit records contain Grok results only; the platform values for Gemini, Perplexity, and ChatGPT are null. Overall visibility scores are therefore overconfident when presented as a multi-engine score. A score of 96 with a Grok score of 63 is not a reliable external visibility conclusion. |

The AI Visibility dashboard should be renamed in owner decision-making terms: **“AI citation test coverage”** rather than a generalized “AI visibility score” until it collects evidence from more than one platform. Microsoft’s current Bing Webmaster Tools AI Performance reporting is useful because it measures cited pages, grounding queries, topics, intent, citation share, and time trends; it explicitly describes these as observational signals, not rankings.[6] [7] Bing also recommends keeping sitemap freshness accurate and using IndexNow for updated URLs.[8]

The best AI-search strategy is therefore not more score chasing. It is authoritative, modular, first-party evidence: job-specific case stories with confirmed facts, owner expertise, clear service boundaries, county context, concise FAQ answers, high-quality labeled photos, updated service pages, consistent business details, and internal links from an answer to an appropriate quote path. Treat every external citation, quote request, or referral source as an event to record.

### 6. Payment via Stripe

| What is working | What is missing | What is not working or is unproven |
| --- | --- | --- |
| Stripe is configured, deposit Checkout sessions exist for quotes, and native invoices can be generated and emailed after job completion. One native invoice is recorded as paid. | Stripe-backed final invoices, a hosted balance-due page, payment-event reconciliation, invoice reminders, deposit-to-invoice reconciliation, and a payment-status queue. | No native quote records a collected deposit, and the native invoice flow stores a generated invoice/email status but not a Stripe invoice or hosted-payment URL. Final payment can therefore require manual marking and reconciliation. |

For custom land-management work, **customer-specific Stripe Invoices** should be the default final-payment instrument, not a generic Payment Link. Stripe distinguishes invoices for a specific customer from reusable Payment Links, and invoices support unique hosted payment pages, reconciliation, payment plans, reminders, and conversion from estimates once finalized.[9] [10] Use reusable Payment Links only for standardized, repeatable offerings such as a fixed inspection fee if one is ever introduced; do not use one generic link for custom project balances.

## C. Gap Analysis & Opportunities

### AI Integration: Close the output-to-action gap

The immediate opportunity is not a new model. Build an AI-assisted **Next Action engine** that reads current stage, elapsed time, client preferred contact method, quote status, and last touch. It should generate a short draft only after it identifies the approved action: call, text, email, schedule visit, send quote, payment reminder, or review request. Jon must approve messages, price, scope, scheduling, discounts, and proposals before any client-facing commitment. This aligns AI to the constrained resource in the business: owner time.

Retire or hide unused AI tools from the first-level dashboard. Keep advanced analyses available under an “AI tools” drawer, but put only the tools that move today’s pipeline on the main screen: draft reply, draft site-visit confirmation, build quote, send quote, schedule follow-up, collect deposit, send final invoice, request review. Add a simple completion measure to every tool: **created → reviewed → sent → customer action**.

### Online Quote Requests: Preserve qualification, reduce initial friction

Use a two-tier form. Tier one should take less than a minute: name, phone, service, county/address, approximate scope, and free-text goal. Tier two should be framed as “Help Jon prepare for your visit” and include terrain, map, linear footage, photos, add-ons, and detailed notes. Keep the current calculator and map tools, but do not force advanced scope capture before a visitor can request contact.

Add UTM/source capture, a page-entry identifier, lead timestamp, response-due timestamp, preferred contact method, preferred time, and a “best next step” choice. The last can be simple: “Call me,” “Text me,” or “Schedule a site visit.” Send the acknowledgement immediately, but schedule owner notification and escalation based on a response SLA. If no owner contact is logged by the next business morning, place the lead at the top of Today’s Next Actions.

### CRM: Make pipeline states executable

The present pipeline should gain a small number of compulsory operational fields: `nextActionType`, `nextActionDueAt`, `lastContactAt`, `contactMethod`, `visitOutcome`, `quoteSentAt`, `reasonLost`, and `leadSourceDetail`. No lead should appear as “active” without a next action. Use the AI confidence score to prioritize review order, not to reject leads automatically; low confidence usually means “needs a better site visit,” not “bad customer.”

Build a reconciliation check every morning: web quote submissions without native quote, native quotes without lead/client, approved quotes without deposit decision, completed jobs without final invoice, paid jobs without review-request decision, and inactive leads lacking a next action. This one queue will surface the actual broken handoffs faster than any dashboard score.

### SEO: Repair technical metadata, then publish factual proof

Fix bot-facing route metadata before adding more pages. Prerendered content needs the route-specific title and description emitted in the HTML response rather than only altered in the hydrated browser. Validate with URL Inspection after deployment. Then audit structured data against visible content: do not include an aggregate rating, review schema, offer, or credential that is not currently substantiated on the page.

For content, publish only real job stories and decision aids. A useful project story should include: county or region only with customer permission, property type, starting condition, exact requested scope, access/terrain condition, what was excluded, approved photos, and the practical result. This creates material for a gallery, county page, service page, social post, and answer-engine citation without inventing reviews.

### AI Visibility: Replace a score with evidence

Connect Bing Webmaster Tools, submit the sitemap, and enable IndexNow for published/updated pages. Review Bing AI Performance monthly by cited URL, grounding query, intent, and topic. Compare those signals with Search Console query/page data and with quote source data. A visibility result is useful only when it can be connected to a qualified visit, call, form, or booked job.

Keep the internal prompt suite, but label it as an internal retrieval test. Require at least two independently measured platforms before showing an aggregate score. Use a fixed audit prompt set: “forestry mulching near [county],” “clear cedar thickets,” “right-of-way clearing,” “land management owner-operated,” and comparative readiness questions. Retain the answer, cited URLs, date, platform, source type, and whether the result drove a visitor.

### Stripe: Connect estimates to payments and accounting

On approval, give Jon an explicit choice: **request deposit**, **schedule without deposit**, or **hold**. If deposit is selected, create a Stripe Checkout session tied to the native quote and send the link only after review. When a job is complete, create a Stripe Invoice tied to the client, quote, job, and prior deposit. Send the hosted invoice link by email and SMS, listen for payment webhooks, and update the job/invoice status automatically. Keep manual payment marking only for check/cash/off-platform payments, with required payment method and reference note.

For payment plans, do not introduce recurring contracts broadly. Use invoice payment plans only for an approved larger project where the payment schedule is in the signed proposal and matches actual project milestones. Stripe supports invoice payment plans and hosted invoice pages, but payment terms and local construction-contract requirements should be reviewed with counsel/accounting support before use.[9] [10]

## D. Recommended Tech Stack & Implementation Roadmap

### Recommended operating stack

| Layer | Recommended role | Keep, change, or add | Complexity | Cost level |
| --- | --- | --- | --- | --- |
| Public site and quote form | Discovery, education, initial qualification, source capture | Keep; simplify first-step form and add conversion instrumentation | Medium | Low |
| Existing Operations dashboard | System of record for lead-to-cash workflow | Keep; add Today’s Next Actions and reconciliation checks before evaluating an external CRM | Medium | Low–Medium |
| AI services | Drafting, qualification, structured extraction, prioritization | Keep human review and add outcome tracking; hide nonessential tools from the daily view | Medium | Low–Medium |
| Google Business Profile, Search Console, Bing Webmaster Tools | Local presence, indexing, citations, and search measurement | Add disciplined monthly review and verified data export | Low | Low |
| Stripe | Deposits and final balance collection | Keep Checkout deposits; add Stripe Invoices, hosted invoice pages, webhooks, and reconciliation | Medium | Low–Medium transaction costs |
| Resend and Twilio | Approved transactional email/SMS | Keep; trigger from next-action and invoice states, with stop conditions | Medium | Low usage costs |
| Real job-media workflow | Proof for gallery, content, SEO, social, and AI citation | Add photo consent and job-fact capture at completion | Medium | Low |

### Short-term: 0–30 days

| Work | Impact | Effort | Dependency | Measurement |
| --- | --- | --- | --- | --- |
| Verify and remove any unsupported 4.9 rating, review quote, aggregate-rating schema, or testimonial-style AI output; submit affected URLs for recrawl after correction | Critical | Low | Access to live page and Search Console | Zero unsupported trust claims in rendered page, schema, and URL Inspection |
| Fix route-specific prerendered title, meta description, Open Graph, canonical, and schema output for homepage, forestry mulching, land management, five priority counties, reviews, and quote page | Critical | Medium | Technical deployment | Bot HTML matches intended route metadata and rendered page |
| Add a Today’s Next Actions queue and daily reconciliation list | Critical | Medium | Existing lead/quote/job tables | 100% of open leads and sent quotes have a dated next action |
| Run one controlled end-to-end quote test and document every event | Critical | Low | Owner test contact | Request → Website Request → AI analysis → native quote → sent → payment option works without manual database repair |
| Add source, response-time, preferred-contact, next-action, and lost-reason fields; review data weekly | High | Medium | Form and CRM updates | First-response median, site-visit rate, quote-send rate, close rate measurable |
| Establish a factual project-story template and photo consent check | High | Low | Field habit | One publishable, verified project story per completed qualifying job |

### Medium-term: 30–90 days

| Work | Impact | Effort | Dependency | Measurement |
| --- | --- | --- | --- | --- |
| Create a reviewed follow-up cadence for uncontacted leads, visit confirmations, sent quotes, and stale quotes; include automatic stop conditions when a customer responds, declines, or books | High | Medium | Next-action fields and communication consent | Response, appointment, and quote-view rates by cadence step |
| Add Stripe-hosted invoices, payment webhooks, deposit reconciliation, SMS/email delivery log, and overdue queue | High | Medium | Stripe implementation and test mode validation | Invoice-sent-to-paid time; % auto-reconciled payments |
| Connect Bing Webmaster Tools AI Performance, sitemap submission, and IndexNow; establish a monthly evidence review | Medium | Low | Account verification | Cited pages, grounding queries, AI citations, and organic/AI-assisted leads tracked |
| Publish 6–10 verified local project stories and decision guides instead of generic location expansions | Medium | Medium | Photos, job facts, consent | Assisted organic leads, indexed pages, cited-page performance |
| Consolidate AI tool access into a daily surface plus an advanced-tools area | Medium | Medium | UI design | Owner uses daily queue; outputs tied to completed actions |

### Longer-term: 90+ days

| Work | Impact | Effort | Dependency | Measurement |
| --- | --- | --- | --- | --- |
| Build a margin-learning loop using actual field hours, fuel/maintenance, terrain, density, and quote outcomes | High | High | Reliable time/job-cost data | Estimate error and contribution margin trend by service type |
| Add customer portal options for approved scope, deposit status, schedule window, job photos, and final invoice | Medium | High | Stable Stripe and workflow records | Fewer status calls, faster deposits, client completion rate |
| Evaluate external CRM/accounting integration only after the native lifecycle and data ownership are stable | Medium | High | Clean stage and financial data | No duplicate records; finance reporting reconciliation |

## E. Risk & Compliance Notes

> **Immediate trust and compliance priority:** Do not publish AI-generated job outcomes as customer testimonials, do not retain any unsupported star rating or review schema, and do not condition review incentives on a positive rating. The FTC’s rule addresses fake or false reviews/testimonials and reviews tied to required sentiment.[1] [2]

Client contact details, property addresses, maps, photos, and project notes are personal/business data. Keep only what is necessary to quote and serve the job; limit ops access; document photo consent; avoid including addresses or customer names in public AI prompts; and do not upload government or customer documents to AI services without a documented operational reason. Client-facing AI must not promise price, scope, site availability, discount approval, final schedule, or insurance/legal conclusions. Human review remains required for each of those decisions.

Veteran-owned messaging should be used only where accurate and should not imply government endorsement, preference eligibility, or credential beyond what can be substantiated. Discount language should state eligibility, the one-discount rule, site-assessment confirmation, and owner approval. For invoices, deposits, payment plans, cancellation terms, and construction-related requirements, use written proposal terms reviewed by Tennessee-appropriate legal and accounting advisors; this audit is operational guidance, not legal or tax advice.

## F. Success Metrics

| Funnel stage | Required event | Primary KPI | Decision enabled |
| --- | --- | --- | --- |
| Discovery | Session source, landing page, campaign/UTM, call click, chat open | Qualified visitor rate by source | What to fund or stop |
| Lead intake | Quote started, quote submitted, lead created, response due | Form completion rate; median first response time | Whether form or response process is the bottleneck |
| Qualification | Site visit requested, confirmed, completed | Visit-booked rate; no-show rate | Which lead types justify travel |
| Sales | Quote drafted, sent, viewed, approved/declined, lost reason | Quote send rate; approval rate; days from visit to quote | Whether pricing, scope, or follow-up needs work |
| Payments | Deposit requested/paid, final invoice sent/viewed/paid | Deposit conversion; days to final payment; overdue balance | Whether Stripe flow reduces cash friction |
| Delivery and proof | Job complete, consented photos, project story complete | Share of completed jobs with usable proof | How much factual content can be published |
| Reputation | Review eligible, request sent, review received | Review-request completion and review count; never rating target | Whether closing workflow creates authentic trust |
| AI | AI draft created, reviewed, sent, customer outcome | AI-to-completed-action rate | Which AI tools earn dashboard space |
| SEO/AEO | Indexed URL, organic query/page, Bing citation, source-attributed lead | Qualified organic/AI-assisted leads, not internal scores | Which pages and topics merit further investment |

## Next Steps

- [ ] Verify the live reviews page, schema, and search snippets; remove or correct any unsupported rating/testimonial claim before publishing new marketing copy.
- [ ] Complete one live, controlled quote-flow test using an owner-controlled contact and record every expected handoff.
- [ ] Build the Today’s Next Actions and reconciliation queue before adding another independent AI feature.
- [ ] Repair bot-facing metadata on the five highest-value service/county URLs, then validate through Google URL Inspection.
- [ ] Connect Bing Webmaster Tools AI Performance and create a monthly external visibility review; retain the in-app score only as an internal test metric.
- [ ] Convert final payment collection from email-only native invoices to customer-specific Stripe-hosted invoices with payment-event reconciliation.
- [ ] Create the first verified, consented project-story record from an actual completed job and use it across the gallery, service/county content, and social drafting workflow.

## References

[1]: https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers "FTC: The Consumer Reviews and Testimonials Rule — Questions and Answers"

[2]: https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials "FTC: Final Rule Banning Fake Reviews and Testimonials"

[3]: https://developers.google.com/search/docs/fundamentals/seo-starter-guide "Google Search Central: SEO Starter Guide"

[4]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview "Google Search Central: Learn About Sitemaps"

[5]: https://support.google.com/business/answer/7091?hl=en "Google Business Profile Help: Tips to Improve Your Local Ranking"

[6]: https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview "Bing Webmaster Blog: Introducing AI Performance"

[7]: https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare "Bing Search Blog: New AI Visibility Insights"

[8]: https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search "Bing Webmaster Blog: Sitemaps in AI-Powered Search"

[9]: https://docs.stripe.com/payment-links "Stripe Documentation: Payment Links"

[10]: https://docs.stripe.com/invoicing/hosted-invoice-page "Stripe Documentation: Hosted Invoice Page"
