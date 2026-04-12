- [x] Replace footer text "NOLAND EARTHWORKS" + tagline with logo image
- [x] Add Related Services section to all four service detail pages
- [x] Add unique SEO page titles to all pages
- [x] Add floating scroll-to-top button
- [x] Hide "Made with Manus" badge
- [x] Add Jobber OAuth credentials as secrets
- [x] Build Jobber OAuth callback route to exchange code for tokens
- [x] Store Jobber access/refresh tokens in database
- [x] Add Jobber token auto-refresh logic
- [x] On quote form submit: create Jobber client + request via GraphQL API
- [x] Add admin page to trigger Jobber OAuth authorization flow
- [x] Fix "Invalid time value" error in Jobber token storage (expiresAt date handling)
- [x] Fix Jobber GraphQL API version (2025-01-20) and RequestCreateInput field mapping (assessment.instructions)
- [x] Fix phone number validation on quote form (too_small error with min:7 rejecting valid numbers)
- [x] Jobber: Search for existing client by email/phone before creating a duplicate
- [x] Jobber: Map quote service types to Jobber line items on request creation
- [x] Jobber: Notify owner via email when Jobber request creation fails silently
- [x] Jobber: Add phone-based duplicate client detection as fallback when email is missing or not matched
- [x] Add address fields (street, city, state, zip) to quote form UI, schema, email, and Jobber request
- [x] Show submitted address in quote form confirmation message
- [x] Draw county boundary outlines on the service areas map for each served county
- [x] Redesign quote request notification email with professional branded HTML template
- [x] Send automated branded confirmation email to customer after quote form submission
- [x] Fix quote confirmation screen: proper capitalization, spacing, human-readable values (service, county, acreage, address formatting)
- [x] Add requestor name as first row in quote confirmation summary card
- [x] Fix missing acreage label for "half-to-one" value in confirmation screen
- [x] Permanently remove Made with Manus badge (re-verify VITE_HIDE_MANUS_BADGE secret is active)
- [x] Rewrite Privacy Policy in the style of brushworksco.com
- [x] Rewrite Terms of Service in the style of brushworksco.com
- [x] Update /privacy-policy and /terms-of-service pages on the website with new content
- [x] Replace hero section static image background with user-provided video background (looping, muted, full-screen)
- [x] Replace hero image with a forestry mulching golden hour photo that better represents the brand
- [x] Add JSON-LD LocalBusiness schema markup to site head (name, phone, address, service area, services)
- [x] Add dynamic XML sitemap endpoint at /sitemap.xml with all pages
- [x] Add/update robots.txt to reference sitemap URL
- [x] Add Google Search Console verification meta tag to index.html
- [x] Add Google Analytics GA4 (G-JG160VB05E) tracking script to index.html
- [x] Create service page: /services/forestry-mulching
- [x] Create service page: /services/land-clearing
- [x] Create service page: /services/vegetation-management
- [x] Create service page: /services/site-preparation
- [x] Create county landing pages for all 12 Middle TN counties
- [x] Register all new routes in App.tsx
- [x] Update sitemap.xml to include all new pages
- [x] Update navbar Services dropdown with links to individual service pages
- [x] Add county landing pages for Wayne, Cannon, Bedford, Montgomery counties
- [x] Remove incorrect county pages: Smith, Trousdale, Macon
- [x] Update ServiceAreasSection county list to match validated 20-county list
- [x] Update JSON-LD schema service area to match validated 20-county list
- [x] Update sitemap.xml to reflect correct county pages
- [x] Update App.tsx routes to add new counties and remove incorrect ones
- [x] Create county landing pages for Lewis, Perry, Benton, Hickman, Houston, Humphreys, Stewart counties
- [x] Register 7 new county routes in App.tsx
- [x] Update ServiceAreasSection to link all 7 new county pages
- [x] Update sitemap.xml with 7 new county pages
- [x] Add dark-themed county boundary map to each county landing page
- [x] Fix Google Maps error on county pages (duplicate script / API key issue)
- [x] Update main page service area map to highlight all 20 counties
- [x] Add address search bar to main page map with geocoding and service area check
- [x] Add Google Places autocomplete suggestions to address search bar on main page map
- [x] Add missing counties from map image: Marshall, Giles, Lincoln, Moore, Lawrence, DeKalb, Smith, Trousdale, Macon, Jackson, Clay, Putnam
- [x] Update GeoJSON, sitemap, JSON-LD schema, and ServiceAreasSection for all new counties
- [x] Create landing pages for all newly added counties
- [x] Update service area to 35 counties within 85-mile radius of Vanleer TN (add: Carroll, Chester, Decatur, Gibson, Hardin, Henderson, Henry, Madison, Weakley; remove: Clay, DeKalb, Jackson, Macon, Putnam, Smith)
- [x] Fix Google Maps error on county pages - replace direct API script with Manus proxy MapView
- [x] Update all "20 counties" references to "35 counties" across the site
- [x] Update hero headline to "Professional Land Services For Middle & West Tennessee"
- [x] Update page title tag to include 'Middle & West Tennessee' for SEO
- [x] Change 'Serving Middle TN' badge to 'Serving Middle & West TN'
- [x] Update About page subheading to reflect expanded service area
- [x] Update meta keywords tag to include West Tennessee terms
- [x] Change footer tagline to mention both Middle and West Tennessee
- [x] Update all individual service page titles to include Middle & West Tennessee
- [x] Update Land Clearing page tagline to say "Middle & West Tennessee"
- [x] Add West Tennessee expansion mention to About section
- [x] Add dedicated counties section to homepage listing all 35 served counties
- [x] Change contact email from quotes@nolandearthworks.com to info@nolandearthworks.com
- [x] Merge ServiceAreasSection county grid with CountiesSection into one unified section
- [x] Revert quote-related emails to quotes@nolandearthworks.com (Quote page, quoteRouter email sends/templates); keep info@ for general contact (Footer, ContactSection)
- [x] Add county name hover tooltip to the main page ServiceAreasSection map
- [x] Make service area map interactive: clicking a county polygon navigates to its /service-areas/[slug] page
- [x] Remove click-to-navigate interactivity from service area map county polygons
- [x] Reframe hero headline to outcome-focused copy
- [x] Build ProblemSolutionSection component and add to homepage
- [x] Build HowItWorksSection (3-step process) component and add to homepage
- [x] Add Google review count (4.9 from 55+ Google Reviews) to Testimonials section header
- [x] Build FAQSection component with 5 common questions and add to homepage
- [x] Remove Google review count badge from Testimonials section header
- [x] Build /pricing Pricing Guide page with Tennessee market rates and integrate into site nav
- [x] Replace all remaining "Middle Tennessee" (standalone) with "Middle & West Tennessee" across About page, CountiesSection, email templates, and index.html
- [x] Add expanded Cost Factors section to Pricing page with detailed explanations and visual cards
- [x] Add interactive cost calculator widget to Pricing page (service type, acreage, density, terrain, access inputs → rough estimate range)
- [x] Move Estimate Tool calculator section to top of Pricing page (just below hero)
- [x] Remove Get a Free Estimate and Call buttons from Pricing page hero section
- [x] Add "Get a rough number in 30 seconds →" teaser link on homepage hero pointing to /pricing
- [x] Pre-fill quote form from Pricing calculator selections via URL query params (service, acreage, density, terrain, access)
- [x] Research Jobber API capabilities (GraphQL, OAuth, available endpoints)
- [x] Set up Jobber OAuth 2.0 token exchange on server (connect/callback/refresh)
- [x] Store Jobber access/refresh tokens securely in DB
- [x] Build server-side Jobber API helper (GraphQL queries for all sections)
- [x] Build /admin route gated to owner account only (role check)
- [x] Build admin sidebar layout matching OwnrOps structure (14 nav items)
- [x] Admin Home — this week's jobs, revenue summary, action items
- [x] Admin Leads — lead pipeline with status tracking
- [x] Admin Quotes — quote requests list with status (open/sent/accepted/declined)
- [x] Admin Jobs — active and completed jobs list
- [x] Admin Clients — client list with contact info
- [x] Admin Invoices — invoice tracker (sent/paid/overdue)
- [x] Admin Schedule — weekly job calendar
- [x] Admin Crews — crew/employee tracker
- [x] Admin Timesheets — hours tracking per crew member
- [x] Admin Reviews — customer review tracker
- [x] Admin Conversations — notes/messages log
- [x] Admin Scoreboard — KPI metrics and performance charts
- [x] Admin Reports — revenue and job reports with charts
- [x] Admin Settings — admin configuration panel
- [x] Enhance Admin Scoreboard with quote-to-job conversion rate tracking (funnel, rate metrics, monthly trend)
- [x] Auto-connect Jobber when admin console is opened (redirect to OAuth if not connected)
- [x] Add leadSourceTags table to schema (jobberRequestId, source, notes, createdAt) and push migration
- [x] Create tRPC procedures: setLeadSource, getLeadSources, getLeadSourceBreakdown
- [x] Update AdminLeads page with source tag dropdown on each lead row
- [x] Build Lead Sources breakdown section (chart + table) in AdminLeads or new AdminSources page
- [x] Auto-connect Jobber on Admin Settings page load (redirect to OAuth if not connected)
- [x] Diagnose and fix Jobber OAuth connection issue (removed admin/jobber entirely)
- [x] Create /maintenance page with NolandFix AI link button and register route in App.tsx
- [x] Enhance AI Diagnostics card on /maintenance page with image upload button and LLM-powered analysis result
- [x] Replace all "FieldFix AI" references with "NolandFix AI" across the site
- [x] Remove /maintenance page, route, and any nav links
- [x] Remove /admin pages, routes, and any nav links
- [x] Add jobs, leads, scheduleEntries tables to drizzle schema and push migration
- [x] Add DB helpers for jobs, leads, schedule to server/db.ts
- [x] Add opsRouter (jobs, leads, schedule tRPC procedures) to server
- [x] Copy DashboardLayout component from ownrops dashboard (as OpsDashboardLayout)
- [x] Copy all 7 dashboard pages (Dashboard, Jobs, Leads, Pricing, Schedule, Reports, Settings) under /ops routes
- [x] Wire /ops/* routes in App.tsx with owner-only guard
- [x] Verify no TypeScript errors after integration
- [x] Auto-create ops lead when contact form is submitted (contactRouter)
- [x] Auto-create ops lead when quote form is submitted (quoteRouter)
- [x] Write tests for lead auto-creation on form submission
- [x] Add status filter bar (All / New / Contacted / Closed) to /ops/leads table
- [x] Update /ops/pricing Benchmarks region from "Central Texas" to "Middle and West Tennessee" with correct local rates
- [x] Fix quote form submissions not appearing in /ops/leads (leads capture bug — getOwnerUser now auto-seeds owner row)
- [x] Definitively fix leads not appearing in /ops/leads on production (root cause: dev and production use separate DBs; code is correct, publish required to activate on production)
- [x] Clear all hardcoded sample data from /ops/dashboard (Recent Jobs, Lead Pipeline, Active Job Sites, Week Scoreboard)
- [x] Replace all "Central Texas" references in /ops pages with "Middle and West Tennessee"
- [x] Add "Convert to Job" button in /ops/leads table that pre-fills a new job with lead's name, address, and service type
- [x] Fix leads capture on production (root cause: OWNER_OPEN_ID not injected in production; fixed ownerProcedure to use role=admin fallback)
- [x] Add Status column to /ops/leads table with New / Contacted / Converted inline selector
- [x] Add status filter tabs (All/New/Contacted/Converted/Closed) and column sort controls (Name, Value, Date) to /ops/leads table
- [x] Remove note lines (item 2) from under each service pricing list on /pricing page
- [x] Remove "Year in Business" stat from StatsBar on homepage
- [x] Send owner notification email to quotes@nolandearthworks.com on every new quote submission
- [x] Auto-set lead status to "Converted" when Convert to Job is clicked in /ops/leads
- [x] Delete test leads from production database (Email Test April 8, Test Lead April 6)
- [x] Auto-set lead status to "Won" when a job is marked as "Paid" in /ops/jobs (match by client name)
- [x] HeroSection: add sr-only h1 for SEO, convert visible h1 to h2 preserving styling
- [x] Update Wilson County page with expanded SEO title and content
- [x] Update Montgomery County page with expanded SEO title and content
- [x] Update Maury County page with expanded SEO title and content
- [x] Update Dickson County page with expanded SEO title and content
- [x] Update Rutherford County page with expanded SEO title and content
- [x] Add 2-3 county-specific FAQs to Wilson County page
- [x] Add 2-3 county-specific FAQs to Montgomery County page
- [x] Add 2-3 county-specific FAQs to Maury County page
- [x] Add 2-3 county-specific FAQs to Dickson County page
- [x] Add 2-3 county-specific FAQs to Rutherford County page
- [x] Create blog index page at /blog listing all 3 articles
- [x] Create blog post page: /blog/cost-of-land-clearing-tennessee
- [x] Create blog post page: /blog/forestry-mulching-vs-bulldozing
- [x] Create blog post page: /blog/signs-you-need-vegetation-management
- [x] Add Blog link to main navigation (Navbar)
- [x] Register all blog routes in App.tsx
- [x] Auto-populate county AND city/state on quote form when navigating from a county page via URL params
- [x] Change "Get a rough number in 30 seconds" text color to burnt orange (#E07B2A) in HeroSection
- [x] Add Google review CTA to homepage (after testimonials section)
- [x] Add Google review CTA to quote form confirmation screen
- [x] Add Google review link to website footer (visible on every page)
- [x] Add unique 150-char meta descriptions to all 12 county pages and 3 blog pages
- [x] Add stale lead indicator (amber badge) to /ops/leads for leads not updated in 7+ days
- [x] Add FAQ JSON-LD schema to all county pages (via CountyPageLayout)
- [x] Add Article JSON-LD schema to all 3 blog post pages (via BlogPostLayout)
- [x] Add unique meta descriptions to core pages: Homepage, Pricing, Services index, About, Quote
- [x] Add individual meta descriptions to each of the 4 service detail pages
- [x] Add "Nearby Service Areas" internal linking section to all county pages
- [x] Add canonical <link> tags to all pages via usePageTitle hook
- [x] Improve Core Web Vitals: hero image preload, Open Graph tags, Twitter Card tags
- [x] Write and publish 4th blog article: "Best Time of Year to Clear Land in Middle Tennessee"
- [x] Add "From Our Blog" section to homepage (3-card row above footer)
- [x] Fix nearbyCounties data: remove Smith County and DeKalb County (not in service area)
- [x] Add sticky mobile CTA bar (Call + Get Quote) visible on all public pages
- [x] Add customer names and locations to testimonials (e.g. "— John D., Lebanon TN")
- [x] Add author byline to all 4 blog posts ("By the Noland Earthworks Team")
- [x] Replace "100% Customer Focused" stat with "4.9★ Google Rating" in StatsBar
- [x] Create /gallery before/after gallery page with job photos

## SEO Improvements — April 2026

- [x] Add dedicated Right-of-Way Clearing service page at /services/right-of-way-clearing
- [x] Add Service JSON-LD schema (FAQ + Service type) to all 4 existing service pages via ServicePageLayout
- [x] Create sitemap.xml in client/public with all 50+ URLs
- [x] Create robots.txt in client/public pointing to sitemap
- [x] Add 5th blog article: "Site Preparation 101: What to Do Before You Build in Tennessee"
- [x] Add ?service= URL param pre-fill CTAs on each service page so quote form auto-selects the service

## Google Indexing Fixes — April 2026

- [x] Fix duplicate canonical tag: remove static canonical from index.html (conflicts with dynamic usePageTitle hook)
- [x] Fix www vs non-www canonical conflict on service/county pages (non-www canonical injected by Cloudflare or server)
- [x] Add www redirect enforcement in Express server for non-www requests (Cloudflare handles this; canonicals now match non-www)
- [x] Add missing pages to server-side sitemapRoutes.ts: right-of-way-clearing, blog posts, pricing, gallery
- [x] Remove static client/public/sitemap.xml and robots.txt (server route handles both dynamically)

## Right-of-Way Clearing Pricing — April 2026

- [x] Add Right-of-Way Clearing as a full service card (with 3 pricing tiers) to the Pricing page services array
- [x] Add ROW-specific FAQ entry to the Pricing page FAQ section
- [x] Add right-of-way-clearing pricing model to CostCalculator BASE_RATES
- [x] Add right-of-way-clearing to CostCalculator service dropdown options

## ROW County Page Paragraphs — April 2026

- [x] Add ROW-specific paragraph + internal link to Dickson County page
- [x] Add ROW-specific paragraph + internal link to Humphreys County page
- [x] Add ROW-specific paragraph + internal link to Stewart County page
- [x] Add ROW-specific paragraph + internal link to Perry County page

## ROW Paragraphs — All Remaining Counties — April 2026

- [x] Add ROW paragraph to all 35 active county pages (Davidson, Williamson, Rutherford, Wilson, Sumner, Robertson, Cheatham, Maury, Wayne, Cannon, Bedford, Montgomery, Lewis, Perry, Benton, Hickman, Houston, Humphreys, Stewart, Marshall, Giles, Lincoln, Moore, Lawrence, Carroll, Chester, Decatur, Gibson, Hardin, Henderson, Henry, Madison, Weakley, Trousdale, Dickson)

## Prerendering / Bot Detection — April 2026

- [x] Add server-side bot detection middleware (detect Googlebot, Bingbot, etc. by User-Agent)
- [x] Implement prerendering using Puppeteer/headless Chrome on the server for bot requests
- [x] Fix recursive prerender loop (X-Prerender-Internal header)
- [x] Fix canonical tag missing from prerendered HTML (inject in middleware as fallback)
- [x] Add canonicalPath to usePageTitle in all 5 service pages
- [x] Verify prerendered HTML contains title, canonical, h1, and page content for key pages

## LocalBusiness Schema Update — April 2026
- [x] Replace LocalBusiness JSON-LD schema in index.html with updated data (name, address, telephone, description, geo, serviceArea, openingHours)

## NAP Block (Visible Address) — April 2026
- [x] Add full NAP block (name, street address, city/state/zip, phone) to site footer as plain crawlable HTML text
- [x] Add full NAP block plus service area note to the Contact/About page
- [x] Fix Jobber integration: register jobberRoutes (OAuth callback) in server/_core/index.ts
- [x] Fix Jobber integration: add jobberRouter to appRouter in server/routers.ts
- [x] Fix Jobber integration: expired token — re-authorize Jobber OAuth after fixes are deployed (requires user to visit /api/jobber/authorize)

## Quote Submission Log — Admin Page
- [x] Add quote_submissions table to drizzle schema (id, name, phone, email, service, county, acreage, address, message, jobberRequestId, jobberRequestUrl, jobberStatus, createdAt)
- [x] Run pnpm db:push to migrate schema
- [x] Update quoteRouter to persist each submission to quote_submissions table with Jobber sync result
- [x] Add ops.quotes.list tRPC procedure to fetch recent quote submissions (owner-only)
- [x] Add "Quote Log" tab to admin Settings page showing recent submissions with Jobber status badges

## Auth & Jobber Fixes — April 2026
- [x] Fix /ops login redirect: pass returnPath to getLoginUrl so OAuth callback redirects back to /ops after auth
- [x] Fix OAuth callback to read returnPath from state and redirect there instead of hardcoded "/"
- [x] Verify Jobber token is valid and connected (confirmed: Noland Earthworks account active)

## Live Dashboard Polling — April 2026
- [x] Add refetchInterval (30s) to ops.leads.list and ops.jobs.list queries on the Dashboard
- [x] Add refetchInterval (30s) to ops.leads.list on the Leads page
- [x] Show a "New Lead" toast notification on the Dashboard when lead count increases during polling
- [x] Add a subtle "Live" pulse indicator on the Dashboard KPI cards

## Enhancements — April 2026 (batch 2)
- [x] Install twilio npm package
- [x] Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, OWNER_PHONE secrets
- [x] Create server/sms.ts helper to send SMS via Twilio
- [x] Wire SMS notification in quoteRouter.submit — send text to owner when new quote arrives
- [x] Auto-create ops lead record in quoteRouter.submit when quote is submitted
- [x] Reduce Leads page poll interval from 30s to 15s
- [x] Reduce Dashboard leads/jobs poll interval from 30s to 15s

## SEO / Google Indexing Fixes — April 2026 (batch 2)

- [x] Fix duplicate site name in page titles: pages pass "| Noland Earthworks" in title string but usePageTitle appends "| Noland Earthworks, LLC" — results in "... | Noland Earthworks | Noland Earthworks, LLC"
- [x] Fix missing canonicalPath on About, Blog, Quote, Pricing, Gallery, Home pages
- [x] Fix title format on PrivacyPolicy and TermsOfService — they include "| Noland Earthworks, LLC" in the string causing duplication
- [x] Add page-specific Open Graph og:title, og:description, og:url meta tags per page (now injected dynamically by usePageTitle hook)
- [x] Cloudflare email obfuscation: footer already uses plain mailto: link; obfuscation is applied by Cloudflare CDN layer — disable in Cloudflare dashboard under Scrape Shield > Email Address Obfuscation

## Blog "Last Updated" Timestamp — April 2026

- [x] Add lastUpdated and lastUpdatedISO props to BlogPostLayout interface
- [x] Display "Last updated: Month YYYY" badge in the hero meta row when lastUpdated differs from date
- [x] Inject article:modified_time Open Graph meta tag via usePageTitle or directly in BlogPostLayout
- [x] Update dateModified in Article JSON-LD schema to use lastUpdatedISO instead of dateISO
- [x] Add lastUpdated/lastUpdatedISO to all 5 blog post files (set to April 12, 2026)
- [x] Add lastUpdated date to Blog index page post cards

## Blog Post: Land Clearing in Williamson County — April 2026

- [x] Research Williamson County local context, neighborhoods, and land clearing search terms
- [x] Write full blog post content (1,200+ words) targeting local SEO keywords
- [x] Create /client/src/pages/blog/LandClearingWilliamsonCounty.tsx
- [x] Add post to BLOG_POSTS array in Blog.tsx
- [x] Add route in App.tsx for /blog/land-clearing-williamson-county
- [x] Add URL to sitemap.xml (priority 0.9 — higher than general blog posts)

## Blog Post: Land Clearing in Davidson County — April 2026

- [x] Research Davidson County local context, neighborhoods, and land clearing search terms
- [x] Write full blog post content (1,200+ words) targeting local SEO keywords
- [x] Create /client/src/pages/blog/LandClearingDavidsonCounty.tsx
- [x] Add post to BLOG_POSTS array in Blog.tsx
- [x] Add route in App.tsx for /blog/land-clearing-davidson-county
- [x] Add URL to sitemap.xml (priority 0.9)

## Blog Post: Land Clearing in Rutherford County — April 2026

- [x] Research Rutherford County local context, neighborhoods, and land clearing search terms
- [x] Write full blog post content (1,200+ words) targeting local SEO keywords
- [x] Create /client/src/pages/blog/LandClearingRutherfordCounty.tsx
- [x] Add post to BLOG_POSTS array in Blog.tsx
- [x] Add route in App.tsx for /blog/land-clearing-rutherford-county
- [x] Add URL to sitemap.xml (priority 0.9)

## County Blog Post Cross-Links — April 2026

- [x] Add "Also Serving Nearby Counties" section to Williamson County post linking to Davidson and Rutherford
- [x] Add "Also Serving Nearby Counties" section to Davidson County post linking to Williamson and Rutherford
- [x] Add "Also Serving Nearby Counties" section to Rutherford County post linking to Williamson and Davidson

## ownrops-dashboard Update — April 2026

- [x] Copy Dashboard.tsx from ownrops-dashboard
- [x] Copy DashboardLayout.tsx from ownrops-dashboard
- [x] Copy DashboardLayoutSkeleton.tsx from ownrops-dashboard
- [x] Copy Jobs.tsx from ownrops-dashboard
- [x] Copy Leads.tsx from ownrops-dashboard
- [x] Copy Pricing.tsx from ownrops-dashboard
- [x] Copy Reports.tsx from ownrops-dashboard
- [x] Copy Schedule.tsx from ownrops-dashboard
- [x] Copy Settings.tsx from ownrops-dashboard
- [x] Skip server/routers.ts and server/db.ts overwrite (preserve ops router, quoteRouter, SMS, Jobber OAuth)
- [x] Run tests and fix any issues

## ownrops-dashboard UI Update — April 2026

- [x] Apply DashboardLayout.tsx from ownrops-dashboard (new nav structure, collapsible sidebar)
- [x] Apply DashboardLayoutSkeleton.tsx from ownrops-dashboard
- [x] Apply Dashboard.tsx from ownrops-dashboard (adapt to trpc.ops.* namespace, keep 15s polling)
- [x] Apply Jobs.tsx from ownrops-dashboard (adapt layout import and trpc.ops.jobs.* namespace)
- [x] Apply Leads.tsx from ownrops-dashboard (adapt layout import and trpc.ops.leads.* namespace)
- [x] Apply Schedule.tsx from ownrops-dashboard (adapt layout import and trpc.ops.schedule.* namespace)
- [x] Apply Pricing.tsx from ownrops-dashboard (adapt layout import only)
- [x] Apply Settings.tsx from ownrops-dashboard (merge Jobber panel with existing Quote Log tab)
- [x] Skip server/routers.ts and server/db.ts overwrite (preserve ops router, quoteRouter, SMS, Jobber OAuth)

## Sidebar Nav CSS Fix — April 2026

- [x] Add .ops-sidebar-item CSS rules to client/src/index.css (flex, align-items, gap, active state)

## Sidebar Logo Update — April 2026

- [x] DashboardLayout.tsx: change logo img from h-8 max-w-[140px] to h-32 max-w-[560px]
- [x] DashboardLayout.tsx: change logo container from h-14 to h-36
- [x] DashboardLayout.tsx: change logo Link href from "/dashboard" to "/"

## Sidebar Logo URL Update — April 2026

- [x] DashboardLayout.tsx: replace logo src with new PNG URL and update alt text

## Jobber GraphQL Live Data Integration — April 2026

- [x] Create /ops/clients page with live Jobber clients table (Name, Company, Email, Phone, City, Created)
- [x] Create /ops/quotes page with live Jobber quotes table (Quote #, Title, Client, Total, Status, Date)
- [x] Create /ops/invoices page with live Jobber invoices table (Invoice #, Client, Total, Outstanding, Status, Due Date)
- [x] Add "From Jobber" requests section to /ops/leads page alongside existing local leads
- [x] Add "Live from Jobber" jobs section to /ops/jobs page alongside local jobs
- [x] Add Jobber visits section to /ops/schedule page alongside local schedule entries
- [x] Remove placeholder: true from Clients, Quotes, Invoices nav items in DashboardLayout.tsx
- [x] Add Jobber connection status bubble to DashboardLayout.tsx sidebar (green/red dot + account name or link to settings)
- [x] Fix Jobber OAuth callback redirect from /admin/settings to /ops/settings in server/jobberRoutes.ts
