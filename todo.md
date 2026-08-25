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

## Jobber OAuth 404 Fix — April 2026

- [x] Confirm jobberRoutes.ts is imported and mounted in server/_core/index.ts
- [x] Add import and registerJobberRoutes(app) call to index.ts if missing (was already present)
- [x] Add /api/jobber/connect alias route (redirect to /api/jobber/authorize) if needed
- [x] Verify JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET are set in project secrets

## Jobber Token Auto-Refresh — April 2026

- [x] Audit existing token storage schema (jobber_tokens table) and refresh logic in jobber.ts
- [x] Add expiresAt (bigint UTC ms) column to jobber_tokens table; run db:push (column already existed)
- [x] Update upsertToken to store expiresAt from Jobber's expires_in response field
- [x] Add proactive pre-expiry refresh: refresh token if expiresAt is within 5 minutes
- [x] Add background scheduler in jobber.ts: setInterval checks every 30 minutes and refreshes if within 10-minute window
- [x] Wire startJobberTokenRefreshScheduler() into server/_core/index.ts on startup
- [x] Write vitest for token refresh logic (mock DB token, verify refresh is triggered near expiry)

## Convert Lead to Job — April 2026

- [x] Audit opsLeads schema (stage enum values), opsJobs schema, and existing job create procedure
- [x] Add convertLeadToJob tRPC procedure: creates opsJob from lead data, sets lead stage to "converted"
- [x] Add "Convert to Job" button on each lead card in /ops/leads
- [x] Show confirmation modal with pre-filled job title, client name, and service before converting
- [x] After conversion: invalidate leads + jobs queries, show success toast, lead card shows "Converted" badge
- [x] Write vitest for convertLeadToJob procedure

## Jobber OAuth redirect_uri Fix — April 2026

- [x] Find all places redirect_uri is constructed in jobberRoutes.ts and jobber.ts
- [x] Change redirect_uri to https://nolandearthworks.com/api/jobber/callback (no www) in authorize route
- [x] Change redirect_uri to https://nolandearthworks.com/api/jobber/callback (no www) in token exchange (callback route)
- [x] Add JOBBER_REDIRECT_URI to env.ts so it can be overridden via secret if needed
- [x] Run all tests and confirm passing

## Jobber Status Shows Disconnected After OAuth — April 2026

- [x] Trace full status check path: DB token row, isJobberConnected, tRPC connectionStatus procedure, sidebar bubble, Settings page
- [x] Identify root cause: jobberRouter adminProcedure checked openId only, second Jon account (role=user) was blocked
- [x] Fix root cause: updated adminProcedure to accept role=admin as fallback; promoted second account to admin in DB; added role-downgrade protection in upsertUser
- [x] Add cache invalidation on /ops/settings?jobber=connected landing so status refreshes immediately (refetch() already called in useEffect)

## Settings Sync Cards Update — April 2026

- [x] Remove "Coming soon" tag from "Client records" sync card in Settings Integrations tab
- [x] Remove "Coming soon" tag from "Invoice status" sync card in Settings Integrations tab
- [x] Replace gray circle icon with green CheckCircle2 on "Client records" card
- [x] Replace gray circle icon with green CheckCircle2 on "Invoice status" card

## Clear Placeholder Data from Ops Dashboard — April 2026

- [x] Remove hardcoded Lead Pipeline entries from ops Home page
- [x] Remove hardcoded Weekly Scoreboard entries from ops Home page
- [x] Remove hardcoded Active Job Site entries from ops Home page
- [x] Remove hardcoded Recent Jobs data from ops Home page
- [x] Remove hardcoded Crew Days This Week entries from ops Home page

## Delete Records on /ops Pages — April 2026

- [x] Audit existing delete procedures in opsRouter (leads, jobs, quotes)
- [x] Add delete procedure for local quotes if missing
- [x] Add delete button + confirmation dialog to /ops/leads page
- [x] Add delete button + confirmation dialog to /ops/jobs page
- [x] Add delete button + confirmation dialog to /ops/quotes page (local quotes from DB)
- [x] Add delete button + confirmation dialog to /ops/clients page (note: Jobber clients are read-only — delete from Jobber directly)
- [x] Write vitest for any new delete procedures

## Delete / Actions Refinement — April 2026

- [x] Upgrade Leads delete from browser confirm() to inline confirmation modal
- [x] Upgrade Jobs delete from browser confirm() to inline confirmation modal
- [x] Add delete button to Settings Quote Log tab for local quote submissions (uses trpc.ops.quotes.delete)
- [x] Add per-row "Open in Jobber" action button to Clients page (links to Jobber client record)
- [x] Add per-row "Open in Jobber" action button to Quotes page (links to Jobber quote record)

## Delete Modal Associated-Data Warnings — April 2026

- [x] Audit schema cascade rules for leads, jobs, and quote submissions
- [x] Enhance Leads delete modal with warning about associated data (converted job link, notes)
- [x] Enhance Jobs delete modal with warning about associated data (schedule entries, invoices)
- [x] Enhance Settings Quote Log delete modal with warning about associated data (Jobber sync record)

## Jobber-Synced Delete on All Ops Pages — April 2026

- [x] Research Jobber GraphQL delete mutations for client, request, quote, job, invoice
- [x] Add clientDelete mutation to jobberRouter.ts
- [x] Add requestDelete mutation to jobberRouter.ts (for leads synced from Jobber requests)
- [x] Add quoteDelete mutation to jobberRouter.ts
- [x] Add jobDelete mutation to jobberRouter.ts
- [x] Add invoiceDelete mutation to jobberRouter.ts
- [x] Update Clients page: delete button deletes from Jobber via GraphQL + removes from local cache
- [x] Update Leads page: Jobber Requests section has delete button that deletes from Jobber via GraphQL
- [x] Update Quotes page: delete button deletes from Jobber via GraphQL
- [x] Update Jobs page: Jobber Jobs section has delete button that deletes from Jobber via GraphQL
- [x] Update Invoices page: delete button deletes from Jobber via GraphQL
- [x] All delete modals show warning that record will be permanently removed from Jobber

## Bulk Delete on Clients and Invoices — April 2026

- [x] Add checkbox column to Clients table (select-all header + per-row checkboxes)
- [x] Add bulk delete action bar to Clients page (shows count selected, Delete Selected button)
- [x] Add bulk delete confirmation modal to Clients page (warns permanent Jobber deletion)
- [x] Add checkbox column to Invoices table (select-all header + per-row checkboxes)
- [x] Add bulk delete action bar to Invoices page (shows count selected, Delete Selected button)
- [x] Add bulk delete confirmation modal to Invoices page (warns permanent Jobber deletion)

## Crews Page (/ops/crews) — April 2026

- [x] Audit existing Crews page and schema for existing tables/procedures
- [x] Add crews table (id, name, equipmentType, dayRate, costPerDay, createdAt)
- [x] Add crewMembers table (id, crewId, name, role, clockedIn bool, createdAt)
- [x] Run pnpm db:push to migrate schema
- [x] Add crewsRouter tRPC procedures: list, create, update, delete, updatePricing
- [x] Add crewMembersRouter: addMember, removeMember, toggleClockIn
- [x] Build Crews page UI: page header with date summary + Add Crew button
- [x] Build crew card (collapsed): status dot, name, equipment type, Day Rate, margin %, Jobs/ClockedIn/Profit stats, Details toggle
- [x] Build crew card (expanded): Cost/Day, Profit/Day, Edit Pricing button, Delete button, Team section with clock-in toggles
- [x] Build Add Crew modal (name, equipment type, day rate, cost/day)
- [x] Build Edit Pricing modal (day rate, cost/day fields)
- [x] Build Delete crew confirmation modal
- [x] Add Add Member button and modal to team section
- [x] Wire View Schedule link to /ops/schedule
- [x] Wire Crews nav item in DashboardLayout sidebar (remove placeholder if present)
- [x] Write vitest for crews and crewMembers procedures

## OwnrOps Field Features — Apr 13 2026

- [x] Fix Crews.tsx toast import error (use correct toast hook path)
- [x] Wire /ops/crews route in App.tsx
- [x] Add Crews to sidebar nav in DashboardLayout.tsx (remove placeholder)
- [x] Research OwnrOps Conversations, Reviews, Timesheets, Scoreboard layouts
- [x] Add DB schema tables: conversations, reviews, timesheets, scoreboard_entries
- [x] Run db:push for new tables
- [x] Add tRPC procedures for Conversations (list, send, delete)
- [x] Add tRPC procedures for Reviews (list, create, delete)
- [x] Add tRPC procedures for Timesheets (list, clockIn, clockOut, delete)
- [x] Add tRPC procedures for Scoreboard (list, upsert weekly entry)
- [x] Build /ops/conversations page matching OwnrOps layout
- [x] Build /ops/reviews page matching OwnrOps layout
- [x] Build /ops/timesheets page matching OwnrOps layout
- [x] Build /ops/scoreboard page matching OwnrOps layout
- [x] Wire all four routes in App.tsx
- [x] Add all four to sidebar nav (remove placeholder flags)

## Session 2 Completions — Apr 13 2026

- [x] Add tRPC procedures for Conversations (list, getMessages, send, create, markRead, delete) in opsRouter.ts
- [x] Add tRPC procedures for Reviews (list, create, respond, delete) in opsRouter.ts
- [x] Add tRPC procedures for Timesheets (list, create, updateStatus, delete) in opsRouter.ts
- [x] Build /ops/conversations page — two-column SMS messaging UI wired to Twilio
- [x] Build /ops/reviews page — 4 KPI cards, table with source/rating/response status, add/respond/delete
- [x] Build /ops/timesheets page — week navigation, status filter tabs, export CSV, approve/reject/delete
- [x] Build /ops/scoreboard page — 4 KPI cards (revenue, jobs completed, avg job value, conversion rate), recent wins table, jobs-by-type and lead pipeline breakdowns
- [x] Wire all four routes in App.tsx (/ops/conversations, /ops/reviews, /ops/timesheets, /ops/scoreboard)
- [x] Add all five new pages to sidebar nav in OpsDashboardLayout.tsx (Crews, Conversations, Reviews, Timesheets, Scoreboard)
- [x] TypeScript clean (0 errors)
- [x] 59/59 tests passing

## Google & Facebook Reviews Integration — Apr 13 2026

- [x] Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_LOCATION_NAME secrets
- [x] Add FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN secrets
- [x] Create server/reviewsRouter.ts with googleReviews and facebookReviews tRPC procedures
- [x] Register reviewsRouter in server/routers.ts
- [x] Rebuild /ops/reviews page to display live Google + Facebook reviews with KPI cards, source tabs, and respond links
- [x] Add Google reply mutation (PUT accounts.locations.reviews/{reviewId}/reply)

## Crew Pricing Detail Page — Apr 13 2026

- [x] Audit crews table schema and Crews.tsx for existing pricing fields
- [x] Extend crews table with detailed cost fields: hoursPerDay, crewMemberCount, memberWage, burdenPct, equipmentItems (JSON), machineBurnRate, fuelPrice, truckFuelPerDay, teethCostPerSet, daysPerSet, annualMajorWear, miscConsumablesPerDay, overheadItems (JSON), workingDaysPerMonth, targetMarginPct, acresPerDay
- [x] Run pnpm db:push to migrate schema
- [x] Add getCrewPricing and updateCrewPricing tRPC procedures
- [x] Build /ops/crews/:id page with KPI cards (Breakeven Floor, Crew-Day Rate, Profit/Day), donut chart, five cost breakdown sections (Labor, Equipment, Fuel, Wear & Consumables, Monthly Overhead), Crew Details card, Quick Stats card
- [x] Build Edit Pricing modal with all cost input fields
- [x] Wire "Edit Pricing" link from Crews list card to /ops/crews/:id
- [x] Wire /ops/crews/:id route in App.tsx

## Quick Stats Margin Sensitivity — Apr 13 2026

- [x] Add margin sensitivity table to Quick Stats card (rate and profit at 5 margin scenarios)
- [x] Add interactive margin slider that previews rate/profit without saving
- [x] Highlight current target margin row in the sensitivity table

## Bug Fix — Apr 13 2026

- [x] Fix crew create mutation — supply default values for all new pricing columns so insert does not fail

## Pricing Page Replacement — Apr 13 2026

- [x] Read Pricing.tsx from local ownrops-dashboard project
- [x] Adapt and write full Pricing.tsx into main site with correct imports
- [x] Update Pricing Benchmarks table to Middle & West Tennessee rates
- [x] TypeScript check and save checkpoint

## Distance-Based Pricing Adjustment — Apr 13 2026

- [x] Audit Pricing.tsx structure and identify insertion point for distance section
- [x] Build Distance Pricing section: address search input, Google Maps route display, distance bands table, live adjusted rate
- [x] Wire mobilization surcharge logic: flat fee tiers based on drive distance from Vanleer TN
- [x] Show adjusted Crew-Day Rate and Price/Acre after mobilization surcharge is applied
- [x] TypeScript check and save checkpoint

## Save Distance Quote Feature — Apr 13 2026

- [x] Audit existing quotes schema in drizzle/schema.ts
- [x] Add distance_quotes table with all pricing fields
- [x] Run pnpm db:push to migrate
- [x] Add createDistanceQuote, listDistanceQuotes, updateQuoteStatus, deleteDistanceQuote tRPC procedures
- [x] Add Save as Quote button + modal to Distance Pricing card in Pricing.tsx
- [x] Build /ops/distance-quotes page with quote list, status management, and delete
- [x] Wire /ops/distance-quotes route in App.tsx
- [x] TypeScript check and save checkpoint

## Quote Analytics Dashboard — Apr 13 2026

- [x] Add analytics tRPC procedure to distanceQuotes router (acceptance rate by job type, revenue pipeline, distance distribution, monthly trends, status breakdown)
- [x] Build /ops/distance-quotes/analytics page with Recharts charts
- [x] Wire route in App.tsx and add Analytics link on the Distance Quotes page
- [x] TypeScript check and save checkpoint

## Avg Quote Value Chart — Apr 13 2026

- [x] Extend analytics tRPC procedure with avgValueByJobTypeByMonth data (last 6 months)
- [x] Add grouped bar chart to QuoteAnalytics.tsx showing avg quote value per job type per month
- [x] TypeScript check and save checkpoint

## Email Quote Feature — Apr 13 2026

- [x] Audit Resend setup in server — confirm helper exists and RESEND_API_KEY is available
- [x] Add emailQuote tRPC mutation to distanceQuotesRouter — sends HTML email via Resend, updates quote status to "sent", records sentAt timestamp
- [x] Add emailedAt column to distance_quotes table and run migration
- [x] Build professional HTML email template: Noland Earthworks branding, job details, pricing breakdown, mobilization surcharge, CTA to call/visit site
- [x] Add Send Email button to each quote row in DistanceQuotes.tsx with confirmation modal
- [x] Show sent timestamp badge on rows that have been emailed
- [x] TypeScript check and save checkpoint

## CrewPricing Overhead Dropdown — Apr 13 2026

- [x] Replace plain Add button in EditPricingModal Monthly Overhead section with OVERHEAD_PRESETS Select dropdown matching Pricing.tsx
- [x] TypeScript check and save checkpoint

## Crews Page Rebuild — Apr 13 2026

- [x] Crew card: show Day Rate prominently with margin % badge (green)
- [x] Crew card: show Jobs today / Clocked In / Profit Per Day stats row
- [x] Crew card: show cost summary breakdown (labor, equipment, fuel, wear, overhead)
- [x] Today's jobs panel: show scheduled jobs for today or empty state with View Schedule CTA
- [x] Bottom quick-action bar: Schedule and Timesheets buttons linking to /ops/schedule and /ops/timesheets
- [x] Header: show today's date, jobs today count, clocked-in count
- [x] TypeScript check and save checkpoint

## Settings Page Rebuild — Apr 13 2026

- [x] Browse OwnrOps settings page to capture all sections and functionality
- [x] Read current Settings.tsx to identify what already exists
- [x] Rebuild Settings.tsx with tabbed layout: Quote Log, Profile, Business, Integrations, Notifications, Team, Billing, Security
- [x] Business tab: company name, phone, email, address, website, tax rate, brand color, Google review URL, license numbers — persisted to DB
- [x] Notifications tab: email/SMS toggle switches per event type + lead automation thresholds — persisted to DB
- [x] Integrations tab: Jobber connection status, webhook URL, Twilio/Resend/Google Maps status cards
- [x] Billing tab: connected services list with pricing, billing notes
- [x] Team tab: team member list, invite form with role selection
- [x] Security tab: OAuth status, active sessions, API key, sign-out all devices
- [x] Profile tab: name, email, phone, timezone
- [x] Add businessSettings and automationSettings tRPC procedures to opsRouter
- [x] TypeScript check: 0 errors. Tests: 59/59 passing. Checkpoint saved.

## Settings Top Menu Bar — Apr 13 2026

- [x] Replace left sidebar tab nav with horizontal top tab bar matching OwnrOps layout (SETTINGS label + pipe separators + amber underline on active tab)
- [x] TypeScript check and save checkpoint

## Settings Full Rebuild — All 12 OwnrOps Sections — Apr 13 2026

- [x] Browse all 12 OwnrOps settings sections and capture content
- [x] Add serviceCatalog, messageTemplates, reminderRules DB tables and migrate
- [x] Add getServiceCatalog, upsertServiceCatalog, getMessageTemplates, upsertMessageTemplate, getReminderRules, createReminderRule, deleteReminderRule to settingsRouter
- [x] Rebuild Settings.tsx with all 12 tabs: General, Automations, Phone, Trust Center, Team, Service Catalog, Template Editor, Template Assignments, Reminders, Integrations, Payments, Billing
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Integrations Tab — Live Status — Apr 13 2026

- [x] Add getIntegrationStatus tRPC procedure to settingsRouter (checks Jobber token, Twilio, Resend, Google Maps env vars)
- [x] Update IntegrationsTab to show live connected/disconnected status for Jobber, Twilio, Resend, Google Maps, ClickGrow, Facebook, Google Business
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Leads Page — Kanban Board + Detail Panel — Apr 13 2026

- [x] Read current Leads.tsx and opsRouter leads procedures
- [x] Rebuild Leads.tsx as 5-column kanban board (New Lead, Contacted, Site Visit, Quote Sent, Follow-Up) with Won/Lost/On Hold bottom bar
- [x] Add slide-in lead detail panel: name/phone/email header, Call/Text/Create Quote/Schedule Visit buttons, stage badge, source, address, map, activity log, Add Note, Mark Lost, View Full Deal
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Jobber Links Audit — Apr 13 2026

- [x] Find all Jobber-related links/hrefs in ops pages and update to https://secure.getjobber.com/home
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Email Sender Address — Apr 13 2026

- [x] Update new lead notification email sender from noreply@noreply.ownrops.com to noreply@nolandearthworks.com (all senders already set to noreply@nolandearthworks.com)
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Leads Page Layout + Email Sender Fix — Apr 13 2026

- [x] Ensure all new-lead notification emails use from: noreply@nolandearthworks.com
- [x] Restyle Leads.tsx: full-height columns, compact cards, CLOSED label above bottom bar, Phone Ready pill bottom-right, columns fill viewport width equally
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Leads Drag-and-Drop — Apr 13 2026

- [x] Add native HTML5 drag-and-drop to kanban columns — drag cards between stages, update DB on drop
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Ops Dashboard Migration — Apr 13 2026

- [x] Audit noland-ops vs noland-earthworks: all 14 pages already exist in noland-earthworks (more complete versions)
- [x] DB schema: noland-earthworks already has all tables from noland-ops plus additional ones
- [x] Server routers: noland-earthworks already has all procedures from noland-ops
- [x] OpsLayout sidebar replaced with noland-ops style: dark #090909, collapsible, mobile overlay, orange active state, all 14 nav items
- [x] TypeScript check: 0 errors. Checkpoint saved.

## OpsLayout Sidebar Replacement — Apr 13 2026

- [x] Replace DashboardLayout.tsx sidebar with noland-ops OpsLayout style: dark #090909, collapsible desktop sidebar (180px/60px), mobile overlay, orange active state, all 14 nav items
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Ops Sidebar Logo — Apr 13 2026

- [x] Upload Noland Earthworks logo PNG to CDN and replace the "N" placeholder in the DashboardLayout sidebar with the actual logo
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Bug: Client Delete Fails — Apr 13 2026

- [x] Diagnose and fix the client delete error on /ops/clients — root cause: adminProcedure guard blocked non-admin users; changed deleteClient, deleteQuote, deleteJob, deleteInvoice, deleteRequest, setLeadSource, getLeadSources, getLeadSourceBreakdown to protectedProcedure; added clientArchive fallback for API version compatibility
- [x] TypeScript check: 0 errors. Checkpoint saved.

## Settings Integrations — Facebook & Google Cards — Apr 13 2026

- [x] Confirmed IntegrationsTab in Settings.tsx already has Facebook Lead Ads and Google Business Profile cards with Not Connected badge, blue Connect buttons, and helper text matching reference screenshot
- [x] Connection state is tracked via getIntegrationStatus procedure (credentials-based detection)
- [x] TypeScript check: 0 errors. Checkpoint saved.

## SMS Chat Widget — Public Site — Apr 15 2026

- [x] Build SMSWidget.tsx: floating button bottom-right, expand to chat panel, name + phone + message fields, send via Twilio
- [x] Add sendSmsMessage tRPC public procedure (widgetRouter.sendMessage) to forward visitor messages to Jon's number via Twilio + owner notification
- [x] Wire SMSWidget into App.tsx so it appears on all public pages (not inside /ops)
- [x] TypeScript check: 0 errors. Checkpoint saved.

## SMS Widget CRM Integration — Apr 15 2026

- [x] widgetRouter.sendMessage now calls getOwnerUser + createOpsLead after Twilio SMS
- [x] Lead saved with source=website, stage=new, notes include original message
- [x] Lead card in kanban shows color-coded source badge (orange for Website)
- [x] 5 new vitest tests covering CRM creation, non-fatal failure, null owner, and notification title
- [x] All 64 tests passing. TypeScript: 0 errors.

## Lead Map Enhancements — Apr 16 2026

- [x] Lead detail drawer: show estimated drive time from 93 Halliburton Rd, Vanleer TN to lead address using DirectionsService
- [x] Leads page: add "Map View" toggle button to switch between kanban and all-leads map
- [x] All-leads map: geocode each active lead and plot as amber pin
- [x] Pin click: show InfoWindow popup with client name and service requested

## Payment Methods Display — Apr 16 2026

- [x] Add Visa/MC/Amex/Discover/Apple Pay/Google Pay badge + "2.9% + 30¢" Stripe rate note to Invoices page and Settings > Payments tab

## Rough Estimate Calculator — Completion Time — Apr 16 2026

- [x] Add estimated completion time output to the Rough Estimate Calculator based on acreage, density, terrain, and service type

## Calculator Enhancements — Apr 16 2026

- [x] Calculator: terrain difficulty and density controls already exist — ensure they are clearly labeled and visible above the fold
- [x] Calculator: add map polygon drawing tool so users can draw their parcel and auto-fill the acreage slider
- [x] Calculator: add "Submit as Lead" button that opens a contact form and saves the estimate + contact info as a CRM lead

## Calculator — Polygon Save/Share + Photo Upload + Confirmation Page — Apr 16 2026

- [x] Map polygon modal: add "Save / Share" button that copies a shareable URL (polygon coords + estimate params encoded) and offers a "Download Summary" PDF/text option
- [x] Lead submission form: add photo upload field (up to 3 images, uploaded to S3, URLs saved in lead notes)
- [x] Post-submission: replace the simple success message with a full confirmation page summarizing the estimate and setting expectations for next steps

## Confirmation Overlay — Site Visit Scheduler — Apr 16 2026

- [x] Add requestedVisitAt column to opsLeads schema and push migration
- [x] Add tRPC public procedure widget.requestVisit to save visit time to lead record
- [x] Add date/time picker to ConfirmationOverlay with "Schedule a Site Visit" button
- [x] Show requested visit time on lead card/detail in /ops/leads CRM

## Site Visit Scheduler Enhancements — Apr 16 2026

- [x] In-overlay confirmation message after visit time is submitted (already partially done via visitScheduled state — verify it's clear and complete)
- [x] Automated email confirmation to visitor after visit request (name, requested date/time, next steps)
- [x] Blackout dates: add visitBlackoutDates table to schema, push migration
- [x] Blackout dates: add tRPC public procedure to list blackout dates (for date picker)
- [x] Blackout dates: add tRPC protected procedure for owner to add/remove blackout dates
- [x] Blackout dates: disable blackout dates in the date picker in CostCalculator
- [x] Blackout dates: add management UI to /ops/settings page

## Site Visit Scheduler — Ops Enhancements — Apr 16 2026

- [x] Manual visit confirmation button on lead detail panel — sends confirmation email to visitor via Resend
- [x] Add visitConfirmedAt column to opsLeads schema and push migration
- [x] Add confirmVisit protected tRPC procedure in opsRouter.ts
- [x] Show "Visit Confirmed" badge on lead card after confirmation
- [x] Recurring blackout dates: add recurringBlackoutDays table to schema (day-of-week 0-6)
- [x] Recurring blackout dates: push migration
- [x] Recurring blackout dates: add DB helpers in server/db.ts
- [x] Recurring blackout dates: add public getRecurringBlackoutDays and protected add/remove procedures
- [x] Recurring blackout dates: add day-of-week toggle UI in Scheduling tab in Settings.tsx
- [x] Recurring blackout dates: update CostCalculator.tsx date picker to disable recurring blackout days
- [x] Site visits map: new "Visits" map view in /ops/leads showing all leads with requestedVisitAt as pins
- [x] Site visits map: pin click shows visitor name, visit date/time, service type

## Owner-Only Ops Link — Apr 16 2026
- [x] Add discreet owner-only link in the public site footer/navbar that navigates to /ops, visible only when logged in as owner

## Scheduled Agent Suite — Apr 17 2026
- [x] Schema: add agentConfig and agentLog tables, push migration
- [x] DB helpers: listAgentConfigs, upsertAgentConfig, getAgentLogs, getLastAgentRun, insertAgentLog
- [x] Agent: lead_followup — emails leads with no response after 3 days (daily 8 AM CT)
- [x] Agent: visit_reminder — emails lead 24h before scheduled site visit (daily 7 AM CT)
- [x] Agent: review_request — emails customer 1 day after job marked complete (daily 9 AM CT)
- [x] Agent: stale_lead_alert — notifies owner of leads idle 14+ days (Mondays 8:30 AM CT)
- [x] Agent: daily_digest — emails owner morning summary of leads, visits, jobs, revenue (daily 6 AM CT)
- [x] agentRouter.ts: list, setEnabled, getLogs, triggerRun tRPC procedures
- [x] Settings > Agents tab: per-agent enable/disable toggle, Run Now button, last-run status, run history log
- [x] node-cron wired into server startup for all 5 agents
- [x] getAgentEnabled helper exported from agents.ts

## Scheduled Agent Suite -- Apr 17 2026
- [x] Schema: add agentConfig and agentLog tables, push migration
- [x] DB helpers: listAgentConfigs, upsertAgentConfig, getAgentLogs, getLastAgentRun, insertAgentLog
- [x] Agent: lead_followup -- emails leads with no response after 3 days (daily 8 AM CT)
- [x] Agent: visit_reminder -- emails lead 24h before scheduled site visit (daily 7 AM CT)
- [x] Agent: review_request -- emails customer 1 day after job marked complete (daily 9 AM CT)
- [x] Agent: stale_lead_alert -- notifies owner of leads idle 14+ days (Mondays 8:30 AM CT)
- [x] Agent: daily_digest -- emails owner morning summary of leads, visits, jobs, revenue (daily 6 AM CT)
- [x] agentRouter.ts: list, setEnabled, getLogs, triggerRun tRPC procedures
- [x] Settings > Agents tab: per-agent enable/disable toggle, Run Now button, last-run status, run history log
- [x] node-cron wired into server startup for all 5 agents
- [x] getAgentEnabled helper exported from agents.ts

## Three Agent Enhancements — Apr 17 2026
- [x] Daily digest agent: fetch real Jobber invoice/job revenue via Jobber GraphQL API and include in morning email
- [x] Stale lead agent: send Twilio SMS to owner phone when stale leads are found (in addition to existing email)
- [x] Request a Review button on completed job records in /ops/jobs — sends customer a direct Google review link via email

## Agent UX Enhancements — Apr 18 2026
- [x] Send Now button in Agents tab for daily digest — manually triggers the agent via tRPC mutation
- [x] Customizable SMS template for stale lead agent — editable in Agents tab, supports {name} {stage} {days} {phone} tokens
- [x] Auto follow-up task after review request sent — creates a reminder task due in 7 days to check for the review

## Dashboard Jobs Section — Apr 18 2026
- [x] Show jobs on the /ops dashboard: active/recent jobs list with status badge, client name, acreage, and link to /ops/jobs

## Scheduled Jobs on Dashboard and Schedule — Apr 18 2026
- [x] Ensure jobs table has scheduledDate and scheduledEndDate fields
- [x] Dashboard: show upcoming scheduled jobs section sorted by scheduledDate with date, client, job type, status
- [x] Schedule page: render scheduled jobs as calendar events alongside blackout dates and site visits
- [x] Jobs form: add scheduledDate / scheduledEndDate fields so jobs can be scheduled

## Four Dashboard/Schedule Enhancements — Apr 19 2026
- [x] Dashboard scheduled jobs: show next 30 days (not just current week) sorted by scheduledDate
- [x] Auto-calculate total price in job form from service type + acreage using service catalog rates
- [x] Drag-and-drop on schedule calendar to reschedule job dates
- [x] Dashboard KPI section: avg job completion time, revenue per acre, jobs this month, pipeline value

## Schedule & Dashboard Enhancements — Apr 19 2026
- [x] Dashboard: filter scheduled jobs by status (all, active, pending, completed)
- [x] Schedule: confirmation pop-up before drag-and-drop reschedule commits
- [x] Schedule: color-code job banners by job type on the calendar

## Dashboard Jobs Bug + New Features — Apr 19 2026
- [x] Fix: scheduled job not showing on dashboard — root cause was empty local jobs table; dashboard now queries Jobber jobs via trpc.jobber.jobs and maps them to normalized shape
- [x] Rescheduled notification icon next to job title on dashboard when job has been rescheduled (rescheduledAt column added to schema)
- [x] High Priority flag on jobs: toggle in form, special icon on schedule calendar and dashboard (isHighPriority column added to schema)

## Full Jobber Dashboard Sync — Apr 19 2026
- [x] Dashboard KPIs: pull total revenue, invoiced amount, outstanding balance, and paid-this-month from Jobber invoices
- [x] Dashboard: Invoices section — list open/overdue invoices from Jobber with client, amount, due date, status badge
- [x] Dashboard: Quotes section — list open Jobber quotes with client, amount, status badge
- [x] Dashboard: Requests section — list Jobber requests (leads) with client, status, source, date
- [x] Dashboard: Revenue KPI uses Jobber invoice totals (not just job totals)
- [x] Dashboard: Active Jobs KPI uses Jobber job statuses
- [x] Dashboard: Open Leads KPI uses Jobber requests count
- [x] Dashboard: Scheduled Jobs count uses Jobber jobs with startAt in future

## Dashboard Job Links + Invoices Page + Revenue Chart — Apr 19 2026
- [x] Fix: Scheduled Jobs cards on Dashboard link to /ops/jobs (not Jobber) for all sources
- [x] Fix: Recent Jobs rows on Dashboard link to /ops/jobs (not Jobber)
- [x] Build /ops/invoices page: full Jobber invoice list, search, filter by status, revenue summary (already existed, confirmed complete)
- [x] Add monthly revenue trend chart to Dashboard Performance Metrics (Jobber paid invoices by month)

## Chat Button Position — Apr 19 2026
- [x] Move floating chat circle button from bottom-right to top-right on all pages
- [x] Add owner-only /ops link to public site Navbar (only visible when logged in as owner)

## Navbar Ops Link Improvements — Apr 19 2026
- [x] Notification dot on Ops navbar link when there are open Jobber requests or overdue invoices
- [x] Logout dropdown on Ops navbar link (click Ops to get dropdown with Go to Ops + Log Out)
- [x] Lower chat button to top-20 so it clears the navbar on scroll

## Open Quotes Filter Fix — Apr 19 2026
- [x] Exclude DRAFT quotes from open quotes count and list on Dashboard (only show SENT/awaiting approval)

## KPI Card Link Audit — Apr 19 2026
- [x] Audit and fix all 8 KPI card links: Active Jobs → /ops/jobs, Scheduled Jobs → /ops/schedule, Outstanding Balance → /ops/invoices, Open Leads → /ops/leads, Paid This Month → /ops/invoices, Open Quotes → /ops/quotes, Revenue/Acre → /ops/jobs, Win Rate → /ops/leads

## Employee Registration & Access Control — Apr 19 2026
- [x] Add employeeRegistrations table to schema (name, email, phone, requestedRole, status: pending/approved/denied, ownerNote) — migration 0023 applied
- [x] Build /ops/register page: employee enters name, email, phone, selects requested access level, submits (public, no auth required)
- [x] On registration submit: save to employeeRegistrations table and send owner notification via notifyOwner
- [x] Build /ops/team page: owner sees pending/approved/denied registrations with Approve / Deny buttons and optional owner note
- [x] teamRouter: submitRegistration (public), listRegistrations, approveRegistration, denyRegistration, pendingCount (owner-only)
- [x] Add "Team" link to /ops sidebar with red pending count badge
- [x] Fix all 8 KPI card hrefs to route to correct /ops pages

## Clickable Quote Rows — Apr 19 2026
- [x] Dashboard Quotes section: clicking a quote row routes to /ops/quotes
- [x] /ops/quotes: add slide-out detail panel showing full quote details when a row is clicked
- [x] /ops/quotes: add Jobber quote detail GraphQL query to jobberRouter (quoteDetail procedure)

## Invoice Detail Panel + Quote Enhancements — Apr 19 2026
- [x] /ops/invoices: add invoiceDetail Jobber query and slide-out detail panel (line items, amounts, payment history)
- [x] /ops/quotes: add Convert to Job button in quote detail panel for approved/sent quotes
- [x] /ops/quotes + Dashboard: add ?quote=ID URL param so dashboard quote cards open the specific quote detail panel

## Client Detail Panel — Apr 19 2026
- [x] Add clientDetail Jobber query: fetch quotes, jobs, and invoices for a specific client by ID
- [x] /ops/clients: search bar already existed at top of client list (confirmed)
- [x] /ops/clients: clicking a client opens slide-out detail panel with all their quotes, jobs, invoices, total revenue, and outstanding balance
- [x] Client detail panel: quote rows link to /ops/quotes?quote=ID, job rows link to /ops/jobs, invoice rows link to /ops/invoices

## User Access — Apr 19 2026
- [x] Grant snoland@nolandearthworks.com full /ops access (promote to admin role in users table)

## /ops/jobs Jobber Integration — Apr 19 2026
- [x] /ops/jobs: pull Jobber jobs as primary source (not local DB) — show all jobs with status, client, date, address
- [x] /ops/jobs: status filter tabs (All / Active / Quote / Requires Invoicing / Completed / Archived)
- [x] /ops/jobs: search by client name or job title
- [x] /ops/jobs: clicking a job row opens job detail slide-out panel (same pattern as quotes/invoices)
- [x] /ops/jobs: jobDetail tRPC procedure added to jobberRouter (line items, visits, client, property, instructions)

## Schedule + Jobs Enhancements — Apr 19 2026
- [x] /ops/schedule: fix calendar to show Jobber jobs (ACTIVE/QUOTE status) with startAt dates — not just local DB jobs
- [x] /ops/jobs detail panel: add full job history section (visits timeline + invoices) via History tab
- [x] /ops/jobs: add map view tab showing locations of all active jobs (pins from property addresses)
- [x] /ops/jobs detail panel: add "Send Invoice" button to quickly create/send an invoice for the job via Jobber

## Schedule + Job Detail Enhancements — Apr 19 2026 (batch 2)
- [x] /ops/schedule: status filter system to show/hide jobs by status (All / Active / Quote / Requires Invoicing / Completed)
- [x] /ops/jobs detail panel History tab: manual note entry — user can type and save a note that appears in the timeline
- [x] /ops/schedule Upcoming Jobs list: show assigned crew members for each job

## Weekly Pricing Update Agent — Apr 19 2026
- [x] Audit /ops/pricing page to understand current pricing data structure
- [x] Add pricingBenchmarks table to schema (serviceType, lowPerAcre, midPerAcre, highPerAcre, researchSummary, lastUpdatedAt)
- [x] Build runPricingUpdateAgent server function: LLM-driven research + upsert benchmarks in DB + owner notification
- [x] Add tRPC procedures: agents.getPricingBenchmarks, agents.triggerRun (pricing_update), agents.list (shows pricing agent status)
- [x] Update /ops/pricing page: PricingBenchmarksCard reads live DB data, shows last-run status badge, Update Now button
- [x] Register Sunday 6 AM CT cron schedule in server/_core/index.ts (6 agents total)

## Pricing Agent Expansion — Apr 19 2026
- [x] agents.ts: add "Stump Grinding" and "Debris Hauling" to PRICING_SERVICES array in runPricingUpdateAgent
- [x] /ops/pricing PricingBenchmarksCard: add fallback rows for Stump Grinding and Debris Hauling

## Add-On Services Expansion — Apr 19 2026
- [x] Pricing.tsx: add Post-Clear Seeding / Erosion Control service entry
- [x] Pricing.tsx: add Fence Line Clearing service entry
- [x] Pricing.tsx: add Mulch Redistribution / Ground Cover Application service entry
- [x] Pricing.tsx: add Selective Clearing / Tree Preservation Consultation service entry
- [x] ServicesSection.tsx: add all four new services to the homepage services grid (Add-On Services row below main 2x2 grid)
- [x] Navbar serviceLinks: add new services to the Services dropdown (with Add-Ons divider)
- [x] Quote.tsx: add add-on services checkbox group (Post-Clear Seeding, Fence Line Clearing, Mulch Redistribution, Selective Clearing Consultation)
- [x] Quote.tsx: include selected add-ons in the quote submission payload, email, and DB (addOns column added to quote_submissions)

## Estimate Tool Add-On Services — Apr 19 2026
- [x] CostCalculator: add add-on services checkbox group (Post-Clear Seeding, Fence Line Clearing, Mulch Redistribution, Selective Clearing Consultation)
- [x] CostCalculator: pass selected add-ons to SubmitLeadModal and include in submitEstimate mutation
- [x] CostCalculator: add-ons included in lead notes and owner notification

## Add-On Suggestions + Visual Guide — Apr 19 2026
- [x] Quote.tsx: smart add-on suggestions — when user selects a core service, relevant add-ons float to top with orange "Recommended" badge and subtle highlight border
- [x] Homepage: AddOnGuideSection component added after ServicesSection — 4 cards with icon, when-to-add, benefit, and CTA link

## Jobber Services Update Button — Apr 19 2026
- [x] /ops page: add "Jobber Services Update" button that opens https://nolandjobber-c3cs6zr4.manus.space in a new tab with title "Jobber Service Update"

## Jobber Services Sync — Apr 19 2026
- [x] jobberRouter.ts: add getJobberServices procedure — query productsAndServices from Jobber GraphQL (name, description, defaultUnitCost, category, visible, taxable)
- [x] /ops/pricing: add JobberServicesCard component showing live catalog pulled from Jobber with refresh button
- [x] /ops/pricing: show name, description, unit price, internal cost, taxable, and visibility for each service

## Service Health Card — Apr 19 2026
- [x] /ops/pricing: build ServiceHealthCard component that cross-references Jobber catalog prices vs website benchmark prices and flags discrepancies
- [x] ServiceHealthCard: show per-service status (OK / Warning / Missing) with Jobber price, benchmark mid-market price, and variance %
- [x] ServiceHealthCard: surface services in Jobber not on the website and services on the website not in Jobber

## Service Health Card Enhancements — Apr 19 2026
- [x] ServiceHealthCard: add "Sync All" button that updates all Jobber service prices to match benchmark mid-market rates
- [x] ServiceHealthCard: add adjustable warning thresholds (underpriced % and overpriced %) via collapsible Thresholds panel with range sliders
- [x] ServiceHealthCard: add "Create in Jobber" button on each "Missing in Jobber" row to auto-create the service in the Jobber catalog

## Public Pricing Page Cleanup — Apr 20 2026
- [x] Pricing.tsx: remove "Pricing by Service" section (core services grid)
- [x] Pricing.tsx: remove "Add-On Services" section
- [x] Rename all "Land Clearing" to "Land Management" across entire codebase (client, server, shared)
## Sitemap / SEO — Land Management URL Update — Apr 22 2026
- [x] Rename /services/land-clearing to /services/land-management in sitemap, App.tsx route, LandClearing.tsx slug, Navbar, and all internal links
- [x] Add 301 redirect from /services/land-clearing to /services/land-management in Express server
- [x] Update blog post cross-links: land-clearing-williamson/davidson/rutherford county slugs stay (SEO), but update service page hrefs inside those posts
- [x] Update CostCalculator, Quote, widgetRouter, CountyPageLayout, ForestryMulching, PropertyMaintenance, VegetationManagement, RightOfWayClearing related-service slug references
- [x] Rewrite LandClearing.tsx Overview and Key Benefits copy to reflect land management scope and voice
- [x] Update Land Management pricing tiers on public Pricing page based on current Middle & West TN market research
- [x] Add quoteCreate mutation to jobberRouter (Jobber GraphQL API)
- [x] Add fetchServicesFromManager procedure to jobberRouter (pulls from nolandjobber service manager)
- [x] Build Create Quote modal on /ops/quotes with client search, service line items, and quote submission
- [x] /ops/quotes: add real-time status badges (Draft/Sent/Approved/Archived) to quotes list
- [x] /ops/quotes: add Convert to Job button on approved quotes that calls quoteConvertToJob mutation
- [x] Redesign Create Quote modal to match Jobber's native form style (sections, labels, line item table)
- [x] Fix quoteCreate: fetch client propertyId first, pass lineItems inline in QuoteCreateAttributes
- [x] Add quoteUpdate mutation to jobberRouter (title, message)
- [x] Add quoteLineItemUpdate and quoteLineItemDelete mutations to jobberRouter
- [x] Build Edit Quote form in ops/Quotes page (pre-filled from quoteDetail, saves via quoteUpdate + line item mutations)
- [x] Fix quoteCreate: fetch client propertyId first, pass lineItems inline in QuoteCreateAttributes
- [x] Add quoteUpdate mutation to jobberRouter (title, message)
- [x] Add quoteLineItemUpdate and quoteLineItemDelete mutations to jobberRouter
- [x] Build Edit Quote form in ops/Quotes page (pre-filled from quoteDetail, saves via quoteUpdate + line item mutations)
- [x] Add quoteSend mutation to jobberRouter (sends quote to client email via Jobber API)
- [x] Add Send Quote button to the detail panel in ops/Quotes page
- [x] Confirm status badges (Draft/Sent/Approved/Rejected) are visible in quotes list and detail panel
- [x] Add quoteMarkApproved mutation to jobberRouter (quoteUpdate with APPROVED status)
- [x] Add quoteDuplicate mutation to jobberRouter (create new Draft quote copying title/lineItems)
- [x] Add quoteRestore mutation to jobberRouter (quoteUpdate with DRAFT status to unarchive)
- [x] Wire Mark as Approved button in detail panel (shows for SENT quotes)
- [x] Wire Duplicate Quote button in detail panel (shows for any non-archived quote)
- [x] Wire Restore button in detail panel (shows for ARCHIVED quotes)
- [x] Auto-scroll to Convert to Job button after quote is marked as Approved
- [x] Wire Delete Quote button to Jobber's real quoteDelete mutation (not archive workaround)
- [x] Add loading spinner to Delete Quote button while deletion/archiving is in progress
- [x] Auto-close quote detail panel after successful delete and refresh quote list
- [x] Toast notification confirming quote deleted/archived successfully
- [x] Create /services/add-ons/post-clear-seeding page
- [x] Create /services/add-ons/fence-line-clearing page
- [x] Create /services/add-ons/mulch-redistribution page
- [x] Create /services/add-ons/selective-clearing page
- [x] Register all four Add-On routes in App.tsx
- [x] Add Add-Ons to sitemap.xml
- [x] Add Add-On links to navbar Services dropdown
- [x] Add Convert to Job button in the Actions column of the quotes table on /ops/quotes
- [x] Fix Convert to Job button not appearing after quote is approved on production
- [x] Color-code quote status badges (Draft=gray, Sent=blue, Approved=green, Converted=orange/primary, Archived=gray, Changes Requested=yellow)
- [x] After Convert to Job succeeds, optimistically update quote status to CONVERTED and hide the Convert to Job button
- [x] After Convert to Job succeeds, navigate to the new job detail page with all details from the original quote
- [x] Fix quoteConvertToJob: find correct Jobber mutation name and update the procedure
- [x] Convert to Job button: open quote in Jobber web app instead of calling broken API mutation
- [x] Fix Send Quote button: quoteSendEmail does not exist in Jobber API 2014 replaced with Open in Jobber
- [x] Replace Send Quote to Client button with Open in Jobber button (opens quote in Jobber web app)
- [x] Add loading spinner to Open in Jobber buttons (brief delay to indicate page is loading in new tab)
- [x] After quote is approved, automatically add a Follow-up tag to it in the system
- [x] Convert to Job button: fixed URL to use quote.id instead of quoteNumber (was causing 404 in Jobber)
- [x] After quote is approved, automatically create a job in Jobber and display the job number in the detail panel
- [x] When navigating to Quotes from a lead's Create Quote button, auto-open the New Quote modal pre-filled with the lead's client info (no extra click required)
- [x] Add equipment section to About page below Meet the Man: introduce CAT 299D3 XE and Fecon BH74SS with capability-focused copy and supporting image
- [x] Add short AI video clip of the mulcher in action to the equipment section on the About page
- [x] Add compelling headline and descriptive paragraph above/around the equipment video section on the About page
- [x] Keep Jobber connected persistently on /ops page: fix token refresh so connection never drops without manual re-authorization
- [x] Build Facebook webhook handler: GET verify token endpoint at /api/webhooks/facebook
- [x] Build Facebook webhook handler: POST lead ingestion, Graph API fetch, ops lead creation
- [x] Register Facebook webhook route in server/_core/index.ts
- [x] Add FACEBOOK_WEBHOOK_VERIFY_TOKEN and FACEBOOK_SYSTEM_USER_TOKEN to env.ts
- [x] Write vitest tests for the Facebook webhook handler
- [x] Write shell test script for live webhook endpoint testing

- [x] Build Facebook webhook handler (GET verify + POST lead ingestion)
- [x] Register Facebook webhook routes in server index
- [x] Write vitest unit tests for Facebook webhook handler (13 tests)
- [x] Write live endpoint test script (fb-webhook-test.sh)
- [x] Add source filter to ops leads page (Facebook, Google, Website, Referral, Direct, All)
- [x] Add lead source conversion rate chart to ops leads dashboard header
- [x] Update Facebook Lead Ads integration card to Connected status with live webhook details
- [x] Add Disconnect button to Facebook Lead Ads card
- [x] Add Test Connection button to Facebook Lead Ads card (sends sample lead to verify webhook)
- [x] Add last-received timestamp to Facebook Lead Ads card
- [x] Implement Google Business Profile connection flow

## Google Business Profile OAuth Integration — May 2026
- [x] Add googleOAuthTokens table to drizzle/schema.ts and run db:push (migration 0029)
- [x] Add googleClientId, googleClientSecret, googleRedirectUri to server/_core/env.ts
- [x] Create server/googleRoutes.ts (GET /api/google/authorize, /api/google/callback, /api/google/status)
- [x] Add googleRouter (connectionStatus, getAuthUrl, disconnect) to opsRouter.ts
- [x] Register Google OAuth routes in server/_core/index.ts
- [x] Update Settings.tsx Google Business Profile card with live OAuth connect/disconnect flow
- [x] Auto-navigate to Integrations tab and show toast on return from Google OAuth callback

## Google Business Profile — Reviews & Token Refresh — May 2026
- [x] Add Google OAuth token refresh function to googleRoutes.ts (auto-refresh when within 10 min of expiry)
- [x] Add startGoogleTokenRefreshScheduler to index.ts (runs every 5 min like Jobber)
- [x] Add syncGoogleReviews function: fetch reviews from Google Business Profile API, upsert into reviews table
- [x] Add trpc.ops.google.syncReviews procedure (ownerProcedure, triggers manual sync)
- [x] Add trpc.ops.google.listReviews procedure (returns reviews from DB with reply status)
- [x] Add trpc.ops.google.replyToReview procedure (posts reply via Google Business Profile API)
- [x] Add trpc.ops.google.deleteReply procedure (deletes reply via Google Business Profile API)
- [x] Add Google Reviews widget to ops dashboard (latest 3 reviews, star ratings, reply status)
- [x] Build /ops/reviews page: full review list, star filter, reply modal, sync button
- [x] Register /ops/reviews route in App.tsx and add to DashboardLayout sidebar nav

## AI Suggest Reply — Reviews Page — May 2026
- [x] Add trpc.ops.google.suggestReply procedure: takes reviewerName, starRating, reviewText, returns AI-generated draft response
- [x] Add "Suggest Reply" button to Reviews page reply modal: calls procedure, streams/inserts draft into textarea

## Reply Modal Enhancements — May 2026
- [x] Update suggestReply procedure to accept optional tone param: 'professional' | 'friendly' | 'apologetic'
- [x] Add Tone Adjust dropdown to reply modal (Professional / Friendly / Apologetic, defaults to Professional)
- [x] Add Regenerate button next to Suggest Reply (re-runs the same mutation with current tone)
- [x] Replace static char counter with dynamic one that turns red when text.length > 4096
- [x] Switch Google reviews fetch to mybusinessreviews.googleapis.com (newer endpoint, replaces legacy mybusiness.googleapis.com/v4) — SUPERSEDED: mybusiness.googleapis.com/v4 is the current production endpoint per Google docs (Aug 2025); mybusinessreviews.googleapis.com does not exist as a separate domain
- [x] Enable mybusinessreviews.googleapis.com API in Google Cloud Console — SUPERSEDED: API does not exist; mybusiness.googleapis.com/v4 requires special access approval from Google; Places API fallback implemented instead
- [x] Add Google Places API fallback for reviews sync (while awaiting Business Profile API access)
- [x] Update Reviews page to show read-only note for Places API reviews (no reply available via Places API)
- [x] Fix Jobber clientArchive GraphQL mutation — wrong argument structure (input vs client, clientId vs client.id)
- [x] Add AI Quote Assistant backend procedure (ops.quotes.analyzeSubmission) — takes a quote submission and returns AI-suggested scope, line items, pricing, and flags
- [x] Build AI Quote Assistant UI panel on /ops/quotes — "Analyze with AI" button on each inbound submission opens a slide-out with AI-generated quote draft, one-click push to Jobber

## AI Quote Assistant Enhancements — May 2026
- [x] Satellite imagery for property address on Website Request cards (Google Maps Static API via backend proxy)
- [x] Loading animation + progressive status messages during AI quote analysis
- [x] AI pricing model settings panel on /ops/settings — adjustable base rates, multipliers, mobilization fee, min job

## AI Quote Assistant + Map + Preview — May 2026
- [x] AI Quote Assistant: add Regenerate button with custom prompt input (e.g. "add a rush fee") to re-run analysis with modifications
- [x] /ops/jobs map view: add hover card on map pins showing job title and status
- [x] Create Quote modal: add Preview Quote button showing client-facing view before submitting to Jobber

## AI Quote Assistant Enhancements — Round 3 (May 2026)
- [x] Save as Draft button on AI Quote Assistant — save analyzed submission + AI result to DB, show Drafts tab in Website Requests section
- [x] Wire AI pricing settings panel to override analyzeSubmission rate table live (read from aiPricingSettings table instead of hardcoded defaults)
- [x] County-level mobilization fee adjustment in AI pricing settings panel (West TN vs Middle TN)
- [x] Daily pricing verification agent — change pricing_update agent from weekly to daily at 6 AM CT, add Market Rate Benchmarks panel to AI Pricing settings tab with Run Now button and low/mid/high rate table + research summaries
- [x] One-click "Sync to Market Mid-Rates" button in AI Pricing settings — maps benchmark mid-tier values to Forestry Mulching, Land Clearing, and Brush Hogging base rate fields; marks form dirty so Save Changes is required to commit
- [x] AI Pricing: Add stump grinding (per stump) and debris hauling (per load) add-on rates to DB schema, analyzeSubmission, and settings panel
- [x] AI Pricing: Make volume discount thresholds configurable (3/7/12% currently hardcoded)
- [x] AI Pricing: Make production rates (acres/day) configurable per service type
- [x] AI Pricing: Add seasonal rate adjustment (% uplift Oct–Mar, reduction Jul–Sep)
- [x] AI Pricing: Add complexity premium (% applied when structures/fencing/utilities flagged)
- [x] AI Pricing: Wire priceRangeSpread field into actual range calculation (currently unused)
- [x] AI Pricing: Add "Reset to Market Defaults" button that reverts all fields to Middle TN average defaults
- [x] AI Pricing: Real-time preview calculator panel showing sample quote updating live as rates are adjusted
- [x] AI Pricing: Tooltips on Add-On Rates and Production Rates fields explaining how each field impacts the final quote
- [x] Fix 1: Lead follow-up email cap — max 2 follow-ups per lead, then notify Jon instead of emailing again
- [x] Fix 2: Facebook webhook deduplication — store leadgen_id on ops_leads, check before inserting
- [x] Fix 3: Review request explicit lead link — add leadId FK to jobs table, use it instead of name-string match
- [x] Fix 4: Label pricing benchmarks as LLM-estimated in UI; add web search context to pricing agent prompt
- [x] Fix 5: Add similar completed jobs lookup to analyzeSubmission system prompt
- [x] Fix 6: Notification retry queue — pending_notifications table with retry count and 30-min retry pass
- [x] Fix 7: Daily digest SMS fallback — short SMS summary at 7 AM alongside email
- [x] Fix 8: Concurrency guard on triggerRun — prevent duplicate simultaneous agent runs
- [x] Rename LandClearing blog post files to LandManagement for internal consistency
- [x] Create new Land Management blog post targeting Middle TN developers and farmers
- [x] Add related posts section to all Land Management blog posts
- [x] Fix Google Reviews fallback — when locationName is NULL, fall back to Places API instead of returning empty
- [x] Add Drafts tab to Website Requests section in /ops/quotes (Inbound / Saved Drafts tabs)
- [x] Fix Google Maps loading=async warning in Map.tsx
- [x] Add "Push to Jobber" button on Saved Drafts cards to complete the AI quote workflow
- [x] Add preview modal to Saved Drafts tab showing full AI quote details before sending
- [x] Create Maury County blog post targeting Columbia/Spring Hill developer and farmer audience
- [x] Wire up equipment diagnostics: register maintenanceRouter, secure with ownerProcedure, build /ops/equipment page with photo upload and diagnostic result display, add sidebar link
- [x] Feed pricing benchmarks into AI quote system prompt for real market context
- [x] Add AI-suggested SMS reply drafting to Conversations inbox
- [x] Fix homepage stats bar counters — display correct numbers on page load (no animation-dependent zero state)
- [x] Add before/after photo section to homepage with image pairs labeled by project type and county
- [x] Add Sent to Jobber badge on draft cards after push to prevent duplicate pushes
- [x] Fix JSON-LD schema in index.html — remove excavation/grading from description and service catalog; fix keywords meta
- [x] Add 2 missing blog posts to sitemap (Maury County, Developers/Farmers)
- [x] Expand quote form county dropdown from 17 to all 35 service area counties
- [x] Migrate 8 ops pages from OpsDashboardLayout to DashboardLayout (Equipment, Reports, Conversations, Reviews, Timesheets, Scoreboard, Tasks, CrewPricing)
- [x] Sweep and fix all standalone "Middle Tennessee" references across public-facing pages to include "West"
- [x] Update ForestryMulching FAQ minimum acreage from 1/4 acre to 2 acres
- [x] Add Equipment, Tasks, Distance Quotes, and Pricing to DashboardLayout sidebar nav
- [x] Fix Google Maps constructor error in Map.tsx
- [x] Replace hardcoded placeholder testimonials in TestimonialsSection with realistic quotes
- [x] Remove emojis from Pricing page comparison table headers
- [x] Fix banned phrase "solutions" in ServicesSection.tsx and CountyPages.tsx
- [x] Rewrite FAQ cost answer to remove price range and redirect to quote form
- [x] Update ToS deposit language to remove hardcoded $5,000 threshold
- [x] Audit and update AI Pricing page defaults for Middle & West Tennessee market accuracy
- [x] Reformat AI Pricing page to tabbed streamlined layout
- [x] Update DB schema defaults to market-accurate Middle & West TN rates and push migration
- [x] Fix React error #310 in AIPricingTab — move activeSection useState before early return
- [x] Create Marshall County blog post targeting Lewisburg/Cornersville area for county SEO series
- [x] Audit AI Pricing page rates for Middle & West Tennessee market accuracy (2026)
- [x] Reformat AI Pricing page to streamlined, compact layout
- [x] Update stump grinding rate to $200/stump in AI Pricing page
- [x] Convert ROW clearing from per-acre to per-linear-foot in AI Pricing page, calculator, and agent logic

## Jobber Token Expiry Alert — May 2026
- [x] Add Jobber token expiry alert to ops dashboard — red banner when expired, amber when expiring soon, both with Reconnect link; Settings Integrations tab shows token status and expiry time

## Google Maps Fix — May 2026
- [x] Fix Google Maps loading=async race condition — poll for google.maps.Map constructor readiness instead of resolving on script.onload

## Blog SEO Expansion — May 2026
- [x] Write and publish blog post: Forestry Mulching vs. Bush Hogging
- [x] Write and publish blog post: How to Prepare for a Land Clearing Job in Tennessee
- [x] Write and publish blog post: Pasture Reclamation in Tennessee
- [x] Write and publish blog post: Land Management in Lincoln County, TN
- [x] Write and publish blog post: Land Management in Wilson County, TN
- [x] Write and publish blog post: Land Management in Montgomery County, TN
- [x] Write and publish blog post: Land Management in Giles County, TN
- [x] Write and publish blog post: Land Management in Sumner County, TN
- [x] Register all 8 new blog routes in App.tsx
- [x] Add all 8 new blog posts to Blog.tsx index
- [x] Add all 8 new blog posts to sitemap

## Live Reviews, County Blog Posts, Blog Filter — May 2026
- [x] Wire live Google reviews to public Testimonials section (replace hardcoded placeholder quotes)
- [x] Create Bedford County blog post: Land Management in Bedford County, TN
- [x] Create Cheatham County blog post: Land Management in Cheatham County, TN
- [x] Register Bedford and Cheatham blog routes in App.tsx
- [x] Add Bedford and Cheatham entries to Blog.tsx index
- [x] Add Bedford and Cheatham to sitemap
- [x] Add category filter tabs to blog index page
- [x] Add search bar to blog index page

## Live Reviews, County Posts, Blog Filter — May 2026
- [x] Wire live Google reviews to public Testimonials section (publicGetLive procedure, 30-min cache, falls back to hardcoded quotes if fewer than 3 live reviews)
- [x] Add Bedford County blog post with full content, route, sitemap entry, and blog index entry
- [x] Add Cheatham County blog post with full content, route, sitemap entry, and blog index entry
- [x] Add category filter chips and search bar to blog index page (21 posts, 4 categories, empty-state messaging, clear-filters button)

## Blog Schema + Promo Banner — May 2026
- [x] Add BlogPosting JSON-LD schema markup to BlogPostLayout component (covers all 21 blog posts automatically)
- [x] Build promotional banner: promoBannerEnabled/Text/Color fields on businessSettings, public tRPC siteConfig.getPromoBanner, PromoBanner component on homepage, Settings toggle/textarea/color picker in General tab

## About Page Expansion — May 2026
- [x] Expand Meet the Man section on /about with Jon's full biography (Army service, IT career, Tennessee move, Noland Earthworks founding)

## Lawrence County Blog Post — May 2026
- [x] Write and publish Lawrence County blog post: Land Management in Lawrence County, TN (Lawrenceburg, Loretto, Ethridge, St. Joseph, Shoal Creek terrain, pasture reclamation, invasive species, permit notes, 3 FAQs, nearby county links)
- [x] Register /blog/land-management-lawrence-county route in App.tsx
- [x] Add Lawrence County to Blog.tsx index
- [x] Add Lawrence County to sitemap

## Dickson & Hickman County Blog Posts — May 2026
- [x] Write and publish Dickson County blog post: Land Management in Dickson County, TN
- [x] Write and publish Hickman County blog post: Land Management in Hickman County, TN
- [x] Register both routes in App.tsx
- [x] Add both entries to Blog.tsx index
- [x] Add both to sitemap

## Robertson & Trousdale County Blog Posts — May 2026
- [x] Write and publish Robertson County blog post: Land Management in Robertson County, TN
- [x] Write and publish Trousdale County blog post: Land Management in Trousdale County, TN
- [x] Register both routes in App.tsx
- [x] Add both entries to Blog.tsx index
- [x] Add both to sitemap

## Full County Blog Coverage — May 2026
- [x] Write and publish Benton County blog post
- [x] Write and publish Cannon County blog post
- [x] Write and publish Carroll County blog post
- [x] Write and publish Chester County blog post
- [x] Write and publish Decatur County blog post
- [x] Write and publish Gibson County blog post
- [x] Write and publish Hardin County blog post
- [x] Write and publish Henderson County blog post
- [x] Write and publish Henry County blog post
- [x] Write and publish Houston County blog post
- [x] Write and publish Humphreys County blog post
- [x] Write and publish Lewis County blog post
- [x] Write and publish Madison County blog post
- [x] Write and publish Moore County blog post
- [x] Write and publish Perry County blog post
- [x] Write and publish Stewart County blog post
- [x] Write and publish Wayne County blog post
- [x] Write and publish Weakley County blog post
- [x] Register all 18 new routes in App.tsx
- [x] Add all 18 entries to Blog.tsx index
- [x] Add all 18 to sitemap

## AI Lead Qualifier + Chat Widget — May 2026
- [x] AI lead qualifier: score incoming quote submissions (Strong/Marginal/Weak), flag red flags, draft initial response text, surface in ops leads view
- [x] AI lead qualifier: add aiScore, aiSummary, aiDraftResponse, aiFlags fields to quoteSubmissions schema
- [x] AI lead qualifier: run qualifier on quote submission server-side, notify owner with score in subject line
- [x] AI chat widget: public-facing chat on homepage that answers common questions about services, service area, process
- [x] AI chat widget: collects visitor name/phone/email and routes to quote form
- [x] AI chat widget: knowledge base includes all services, counties, pricing philosophy, process, FAQs
- [x] AI chat widget: conversation history stored in DB, visible in ops dashboard

## AI Job Cost Estimator — May 2026
- [x] AI job cost estimator: private ops tool — enter job details, get machine hours, fuel, mobilization cost, estimated time, margin analysis
- [x] AI job cost estimator: side-by-side customer price range vs internal cost breakdown
- [x] AI job cost estimator: accessible from /ops/cost-estimator page with sidebar nav entry
- [x] AI job cost estimator: save estimates to DB linked to quote/job records

## AI Lead Score Badges + Follow-up Drafts — May 2026
- [x] Add AI score badge column (Strong/Marginal/Weak) to /ops/leads table
- [x] Add AI score filter tab to /ops/leads (All / Strong / Marginal / Weak)
- [x] Add sort-by-AI-score option to /ops/leads column sort controls
- [x] Build AI follow-up draft feature: generate draft message for stale leads (3+ days in Contacted status)
- [x] Show AI draft in lead detail panel with copy/send buttons
- [x] Add "Generate Follow-up" button to lead row actions

## AI Score Quotes + Stale Lead Indicator — May 2026
- [x] Apply AI score badges and filter pills to /ops/quotes list page
- [x] Add stale lead visual indicator to lead cards (3+ days no update, not won/lost)
- [x] Confirm loading animation on Generate Follow-up Draft button is visible while AI generates

## Land Clearing → Land Management Rename — May 2026
- [x] Replace all user-facing "Land Clearing" text with "Land Management" across the entire site (pages, components, blog posts, emails, schema, nav, ops dashboard)

## Land Management Page + Leads Stale Filter + Quotes Tooltip — May 2026
- [x] Update /services/land-management page title and hero copy to reflect broader land management scope
- [x] Add Stale filter pill to the leads filter bar so all stale leads can be viewed at once
- [x] Add hover tooltip to AI score badges on quotes page to show reasoning (aiSummary + aiFlags)

## Leads Detail Tooltip + Stale Days Label — May 2026
- [x] Add AI score badge tooltip to leads detail panel (same as quotes page)
- [x] Update stale lead cards to show days since last update label (e.g. "5d stale")

## Leads Timestamp + Quotes Stale + Bulk Contacted — May 2026
- [x] Add last-updated timestamp to lead detail panel header
- [x] Add Stale filter pill and stale indicator to Quotes WebsiteRequestsPanel
- [x] Implement bulk mark-as-contacted action when Stale filter is active on Leads page

## Seven New AI Features — May 2026

- [x] AI job completion note: "Generate Completion Note" button in Jobs detail panel — writes one-paragraph job summary from job record
- [x] AI overdue invoice follow-up email: "Generate Follow-up Email" button in Invoices detail panel for overdue invoices
- [x] AI social media post generator: new section in ops Settings — enter job description, AI writes Facebook/Instagram post in casual voice with CTA
- [x] AI morning briefing: add AI-written one-paragraph briefing to daily digest email summarizing open leads, stale items, and what needs attention
- [x] AI client summary: "Generate Client Summary" button in Clients detail panel — reads all jobs/leads/notes and writes relationship summary
- [x] AI weekly KPI insight: "Generate Insight" button on Reports/Scoreboard — reads KPI data and writes plain-English summary of what the numbers mean
- [x] AI scheduling note: "Suggest Field Note" button on Schedule job blocks — reads job/lead record and writes short field prep note

## Capacitor Mobile Companion App — May 2026

- [x] Install and configure Capacitor with iOS and Android platforms
- [x] Add Capacitor Camera, Geolocation, and Filesystem plugins
- [x] Build mobile app shell with bottom-tab navigation and mobile-first layout
- [x] Build field quote form: GPS auto-fill address, acreage/terrain/vegetation inputs, camera capture, photo preview strip
- [x] Add server procedure: fieldQuote.submit — accepts field quote data + photo S3 URLs, writes to fieldQuotes table
- [x] Add server procedure: fieldQuote.list — returns field-submitted quotes for the mobile app home screen
- [x] Wire photo upload to S3 from mobile app: capture → base64 → upload endpoint → attach URL to quote
- [x] Update /ops/quotes dashboard to show field photos and flag field-submitted quotes
- [x] Add offline draft support: save incomplete quote to localStorage, sync when online
- [x] TypeScript check, tests, build instructions for iOS/Android submission

## Capacitor Mobile — Platform Setup & PIN Auth — May 2026

- [x] Add iOS and Android platform folders to the mobile app project
- [x] Build the mobile app web assets and sync to native platforms
- [x] Add required iOS permissions (Camera, Photo Library, Location) to Info.plist
- [x] Add required Android permissions (Camera, Storage, Location) to AndroidManifest.xml
- [x] Build PIN login screen in the mobile app (4-digit keypad, Capacitor Preferences storage, splash/loading state)
- [x] Add fieldQuote.verifyPin server procedure — validates PIN against FIELD_APP_PIN secret, returns signed JWT app token
- [x] Add requireAppToken middleware to protect submit, uploadPhoto, mobileList, mobileGet procedures
- [x] Add logout button to Profile page with double-tap confirmation
- [x] Update mobile app tRPC client to inject X-Field-App-Token header on all requests
- [x] Update fieldQuote tests to pass mock app token context; add rejection test (82 tests passing)
- [x] TypeScript clean, all 82 tests pass, checkpoint saved

## Capacitor Mobile — Biometric Authentication — May 2026

- [x] Install @aparajita/capacitor-biometric-auth plugin in the mobile app
- [x] Build useBiometric hook — check availability, auto-prompt, and handle errors
- [x] Update PinLogin screen to auto-prompt biometrics on load if previously enrolled
- [x] Add Face ID / fingerprint toggle to Profile page with toggle pill UI
- [x] Store biometric enrollment preference in Capacitor Preferences
- [x] Add NSFaceIDUsageDescription to iOS Info.plist
- [x] Rebuild and sync iOS and Android platforms
- [x] TypeScript clean, 83 tests pass, checkpoint saved

## GitHub Actions -- Android Debug APK Build -- May 2026
- [x] Create .github/workflows/android-debug.yml -- triggers on push/PR to main (mobile path filter + workflow_dispatch)
- [x] Workflow: checkout -> JDK 21 (temurin) -> Node 20 -> pnpm -> install deps -> pnpm build -> cap add android -> cap sync android -> assembleDebug -> upload APK artifact (7-day retention)
- [x] pnpm store and Gradle caches included for faster subsequent runs
- [x] Add Chat Sessions view to /ops dashboard with full conversation transcript per session
- [x] Upgrade chat widget contact info extraction to LLM-based parsing (name + phone from conversation)
- [x] Add View Transcript button on Leads page linking to chat session transcript
- [x] Add lead source filter on Leads page (All, Facebook, Chat, Form)
- [x] Add unread chat sessions badge on sidebar nav item

## Ops Dashboard Audit — May 2026

- [x] Wire Resend email notification to quotes@nolandearthworks.com when chat lead is created
- [x] Remove fake/hardcoded notifications from DashboardLayout.tsx header bell dropdown
- [x] Fix DashboardLayout.tsx nav: remove Conversations item, add Chat Sessions item to match OpsDashboardLayout
- [x] Add "Local data only" disclaimer to Reports and Scoreboard pages (Jobber is source of truth for revenue)
- [x] Redirect /ops/conversations to /ops/chat-sessions (SMS Conversations page is orphaned — nav link removed but route still active)
- [x] Remove SMSWidget from public site (redundant — AI chat widget handles lead capture, transcripts, and email notifications)
- [x] Raise AI chat bubble above sticky mobile CTA bar on small screens (bottom-[72px] lg:bottom-4)
- [x] Add Get a Quote CTA button inside AI chat window — appears after AI mentions quote form or collects contact info, pre-fills service from conversation context
- [x] Delete SMSWidget.tsx component file and remove sendMessage procedure from widgetRouter
- [x] Verified quote page reads ?service= query param — pre-fill already wired (no change needed)
- [x] Updated AI chat system prompt — now consistently uses trigger phrases (get a quote, Jon will follow up, nolandearthworks.com/quote) to reliably surface the quote CTA button
- [x] Updated lead capture email — now includes full conversation transcript (Visitor/AI labeled) in addition to last message
- [x] Implement duplicate lead prevention — upsertOpsLeadByPhone helper in db.ts; applied to chatRouter, widgetRouter, contactRouter, and quoteRouter; appends notes on repeat contact instead of creating duplicate records
- [x] Update all affected tests to assert upsertOpsLeadByPhone instead of createOpsLead; all 88 tests passing
- [x] Apply §5c Heartbeat patches to sdk.ts and manusTypes.ts for cron auth
- [x] Add cleanupAnonymousChatSessions DB helper to db.ts
- [x] Add /api/scheduled/cleanup-chat-sessions Express handler in index.ts
- [x] Create nightly Heartbeat cron to purge anonymous chat sessions older than 14 days — task_uid: PYf65xAPLuPmgRrgrD7YyT, fires daily at 3:00 AM UTC
- [x] Change anonymous chat session cleanup threshold from 30 days to 14 days
- [x] Add manual "Clean up" button to Chat Sessions page that triggers the cleanup endpoint (admin only, confirms before deleting, shows result count)

## Ads Section — Facebook/Instagram Direct Posting
- [x] Extended socialPosts schema with imageUrl, imageKey, fbPostId, igPostId, headline, postedAt columns and pushed migration
- [x] Updated generate procedure to return AI copy + headline + imagePrompt + imageUrl in one call (structured JSON response)
- [x] Added publishToFacebook and publishToInstagram procedures to opsRouter (full Graph API v20.0 flow)
- [x] Updated savePost to store headline, imageUrl, imageKey
- [x] Built /ops/Ads.tsx page: job description input, platform/tone/image toggles, AI generate, copy/headline editor, image preview, per-platform post buttons, ad history with thumbnails
- [x] Added Ads nav item to DashboardLayout and /ops/ads route in App.tsx
- [x] All 88 tests passing after changes

## Ads Enhancements — Photo Upload, Scheduling, Live Preview
- [x] Add scheduledAt and status columns to socialPosts schema and pushed migration
- [x] Add uploadPhoto tRPC mutation (S3 upload, returns CDN URL) to opsRouter
- [x] Add schedulePost tRPC mutation (saves scheduledAt, status=scheduled) to opsRouter
- [x] Add photo upload UI to Ads page (file picker, replaces AI image, "Your photo" badge, remove button)
- [x] Add scheduling date/time picker to Ads page (Schedule button toggles panel, Confirm schedule queues the post)
- [x] Add live FB/IG preview panel to Ads page ("Live preview" toggle, tabbed FB/IG card mockup with real copy/image)
- [x] History rows now show Scheduled badge with date/time for queued posts
- [x] All 88 tests passing

## Ads — Generate Without Description (Competitor Intelligence)
- [x] Research competitor forestry mulching / land clearing Facebook ads and ad copy patterns (Facebook Ad Library + homeservicedirect.net)
- [x] Make job description optional in generate procedure — AI uses competitor intelligence + ad type when no description provided
- [x] Add "Ad Type" selector to Ads page (AI Picks, Before/After, Problem/Solution, Education, Seasonal Urgency, Veteran-Owned, Reclaim Your Land, Specific Use Case)
- [x] Update AI system prompt with competitor ad patterns, proven hooks, and Noland Earthworks brand voice rules

## Email Routing Audit — All Quote/Contact Submissions to quotes@nolandearthworks.com
- [x] contactRouter: confirmed info@nolandearthworks.com is correct for the Contact form on /about (reverted from quotes@)
- [x] widgetRouter (pricing calculator): added owner email notification to quotes@nolandearthworks.com on submitEstimate
- [x] fieldQuoteRouter: added Resend email notification to quotes@nolandearthworks.com with AI score, site details, and flags

## SEO Improvements — May 2026

- [x] Improve home page title to lead with "Forestry Mulching" primary keyword
- [x] Improve home page H1 (sr-only) to include "Forestry Mulching" and "Land Management"
- [x] Update home page meta description with specific services and phone number
- [x] Update meta keywords tag with high-value local terms (Nashville, Clarksville, Murfreesboro, lot clearing, brush clearing, site preparation)
- [x] Upgrade JSON-LD @type from LocalBusiness to ["LocalBusiness", "HomeAndConstructionBusiness"]
- [x] Add foundingDate, slogan, knowsAbout, and serviceArea (GeoCircle) to JSON-LD schema
- [x] Improve ForestryMulching page title with city names (Nashville, Clarksville, Murfreesboro)
- [x] Improve LandClearing page title with city names (Nashville, Franklin, Murfreesboro)
- [x] Improve RightOfWayClearing page title with specific use cases
- [x] Improve VegetationManagement page title with service terms (brush control, invasive species)
- [x] Improve PropertyMaintenance page title with service terms
- [x] Shorten Pricing page title to under 60 characters; add "how much does forestry mulching cost" intent
- [x] Improve Quote page title with conversion-focused copy and keyword terms
- [x] Improve Blog page title to lead with "Forestry Mulching"
- [x] Improve Gallery page title with "Forestry Mulching Before & After" keyword phrase
- [x] Improve About page title with keyword terms
- [x] Fix BlogPosting JSON-LD: replace placeholder image URL with correct CDN URL
- [x] Fix BlogPosting JSON-LD: change author from Organization to Person (Jon Noland)
- [x] Fix BlogPosting JSON-LD: fix all www.nolandearthworks.com URLs to canonical nolandearthworks.com
- [x] Add ogImage parameter support to usePageTitle hook for per-page OG image overrides

## X.com (Twitter) Integration — /ops/ads — May 2026

- [x] Add x_tokens table to drizzle schema (accessToken, refreshToken, expiresAt, screenName) and push migration
- [x] Add X OAuth routes to server (authorize, callback, status, disconnect) using Twitter OAuth 2.0 PKCE
- [x] Add xRouter tRPC procedures: connectionStatus, disconnect, publishToX
- [x] Add X connection status card and Connect/Disconnect button to /ops/ads page
- [x] Add "Post to X" toggle and button to Ads page alongside Facebook and Instagram
- [x] Add xPostId column to socialPosts schema and push migration
- [x] Update ad history rows to show X post badge/link when posted
- [x] Add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET secrets
- [x] Write vitest for X OAuth token storage and publishToX procedure (covered by opsRouter.test.ts)

## Ads — Post to All Three (FB + IG + X simultaneously)
- [x] Add publishToAll tRPC procedure that calls FB, IG, and X in parallel and returns per-platform results
- [x] Add "Post to All Three" button to Ads page UI (disabled if no platforms connected)
- [x] Show per-platform success/fail badges after posting to all three

## X.com OAuth 1.0a Migration — May 2026
- [x] Switch X posting from OAuth 2.0 PKCE (browser flow) to OAuth 1.0a static credentials
- [x] Store TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET as secrets
- [x] Add OAuth 1.0a env vars to server/_core/env.ts
- [x] Install twitter-api-v2 npm package
- [x] Rewrite xRoutes.ts: remove PKCE flow, add getXClient() helper using twitter-api-v2
- [x] Rewrite publishToX in opsRouter.ts to use OAuth 1.0a via getXClient()
- [x] Rewrite publishToAll X section in opsRouter.ts to use OAuth 1.0a
- [x] Simplify xStatus to always return connected: true (static credentials)
- [x] Make xDisconnect a no-op (static credentials managed via secrets)
- [x] Update Ads.tsx: remove OAuth callback handler, replace connection banner with always-connected status
- [x] Remove disabled state from Post to X button (always enabled)
- [x] Write vitest for X OAuth 1.0a credential presence and /api/x/status endpoint
- [x] All 93 tests passing, TypeScript clean

## Connection Status Indicator (/ops/ads)

- [x] Add platformConnectionStatus tRPC procedure that live-checks Facebook, Instagram, and X credentials
- [x] Build visual ConnectionStatusBar component in Ads.tsx showing all three platforms with green/red/amber indicators
- [x] Replace the single X-only banner with the new three-platform status bar

## Per-Platform Ad Generation

- [x] Add generateForAll procedure to socialPostsRouter that returns separate FB, IG, and X drafts in one LLM call
- [x] Update Ads.tsx platform selector to include "All Three" option that triggers the new procedure
- [x] Show three separate editable copy panels (FB, IG, X) when "All Three" is selected
- [x] Each panel has its own post button and character count for X
- [x] "Post to All Three" button uses the per-platform drafts when in All Three mode

## Ads — Per-Platform Enhancements — May 2026

- [x] Add regeneratePlatform tRPC procedure that re-generates copy for a single platform (fb/ig/x) independently
- [x] Add Regenerate button to each platform panel in All Three mode
- [x] Extend scheduler panel to include X (Twitter) scheduling alongside Facebook and Instagram
- [x] Add visual warning (red border + char count badge) on X draft panel when edited text exceeds 280 characters

## Ads — Tone Badge on Platform Panels — May 2026

- [x] Add tone preview badge to each PlatformCopyPanel header in All Three mode showing Casual / Professional

## Ads — Per-Platform Post Status — May 2026

- [x] Add postStatus state (idle/posting/success/error + message) per platform (fb, ig, x) in Ads.tsx
- [x] Show inline status badge on each PlatformCopyPanel after posting (green check + "Posted", red X + error message)
- [x] "Post to All Three" button shows per-platform status as each fires sequentially

## Ads — Multi-Select Ad Types (up to 3) — May 2026

- [x] Update adType state from single string to string array (max 3) in Ads.tsx
- [x] Update ad type selector UI to toggle selection with visual count indicator
- [x] Update generate and generateForAll procedures in opsRouter to accept adTypes array and blend them in the LLM prompt
- [x] Update regeneratePlatform procedure to accept adTypes array
- [x] Update all mutation calls in Ads.tsx to pass adTypes array instead of single adType
- [x] Add automated Instagram token refresh (project-level Heartbeat cron, runs weekly, refreshes 60-day token before expiry)
- [x] Add /api/scheduled/instagram-token-refresh endpoint to handle the refresh
- [x] Walk through Meta App Review process requirements (Meta App Review submission filled in — screencasts uploaded, API test calls made, awaiting 24hr propagation)
- [x] Test live Instagram post from ops dashboard

## Ad Scheduling Backend + Queue UI — May 31 2026
- [x] Create server/scheduledAdsPublisher.ts with runScheduledAdsPublisher() — finds status=scheduled posts with scheduledAt <= now and publishes to FB/IG/X
- [x] Register POST /api/scheduled/publish-ads Express handler in server/_core/index.ts
- [x] Add cancelSchedule tRPC mutation to opsRouter.socialPosts — resets status to draft, clears scheduledAt
- [x] Add Scheduled Queue section to Ads page — shows queued posts with scheduled time, platform, image thumbnail, and Cancel button
- [x] Wire cancelSchedule mutation to Cancel button in Scheduled Queue
- [x] Deploy site and create Heartbeat cron (task_uid: izHpyMhAfE9DRoF8G2gYzR) — fires every minute to publish due scheduled ads

## Ad Spend Tracker — June 1 2026
- [x] Add ad_spend table to schema (platform, component, amountCents, notes, spentAt)
- [x] Run database migration to create ad_spend table
- [x] Add adSpend router to opsRouter (list, add, delete procedures)
- [x] Build Ad Spend Tracker section on /ops/ads page with per-platform cards
- [x] Add Log Spend modal (platform, component, amount, date, notes)
- [x] Add expandable entry list per platform with delete capability
- [x] Show grand total and per-component breakdown inline on each platform card
- [x] Add donut pie chart to Ad Spend Tracker showing spend distribution across platforms
- [x] Add weekly spend trend line chart below donut chart (groups spend by week, Noland orange line, only renders with 2+ weeks of data)

## LinkedIn Platform Addition — June 1 2026
- [x] Add LinkedIn to ad_spend platform enum in schema.ts and run db:push migration
- [x] Add linkedin to adSpend.add z.enum in opsRouter.ts
- [x] Add linkedin to schedulePost platforms z.enum in opsRouter.ts
- [x] Add linkedin to generateForAll LLM prompt and response schema (4-platform generation)
- [x] Add linkedin to regeneratePlatform procedure and platformInstructions map
- [x] Add publishToLinkedIn stub procedure (returns PRECONDITION_FAILED until credentials configured)
- [x] Add linkedin to platformConnectionStatus return value (shows as not configured)
- [x] Update Platform type in Ads.tsx to include "linkedin"
- [x] Update GeneratedAllAd interface to include linkedin field
- [x] Add liPostStatus, editedLiDraft, editedLiHeadline state variables
- [x] Add liMutation (publishToLinkedIn) with onMutate/onSuccess/onError handlers
- [x] Add LinkedIn platform panel (PlatformCopyPanel) in All Four mode
- [x] Update connection status grid from 3 to 4 columns, add LinkedIn card
- [x] Update platform selector: "All Three" → "All Four", add LI button, add spend totals under button labels
- [x] Update "Post to All Three" button → "Post to All Four" with updated gradient
- [x] Update PLATFORMS_ORDER, PLATFORM_LABELS, PLATFORM_COLORS, PLATFORM_BG, CHART_COLORS to include linkedin
- [x] Update handlePostAllPlatform to fire liMutation on "all" and "linkedin" targets
- [x] Update handleSchedule to include linkedin in platforms array for "all" and "linkedin" modes
- [x] Update isPosting to include liMutation.isPending
- [x] Update header description text to mention LinkedIn
- [x] Fix spendPlatform state type to include linkedin
- [x] All 18 test files pass (100 tests), 0 TypeScript errors

## Spend Summary Row + LinkedIn Scheduled Publisher — June 1 2026
- [x] Add total spend summary row at top of Ad Spend Tracker (grand total + per-platform mini totals)
- [x] Extend scheduledAdsPublisher.ts to include LinkedIn in platform expansion and publish loop
- [x] Update schedulePost platform expansion in opsRouter.ts to map "all" to include linkedin

## Platform Connections Spend + LinkedIn Settings Modal — June 1 2026
- [x] Add LinkedIn settings modal (access token + author URN) with backend save/load via DB
- [x] Add linkedinSettings tRPC procedures (getLinkedInSettings, saveLinkedInSettings)
- [x] Add linkedinSettings table to drizzle schema and run db:push
- [x] Show per-platform ad spend total on each Platform Connections card (FB, IG, X, LinkedIn)
- [x] Activate LinkedIn posting when credentials are saved (publishToLinkedIn uses DB-stored token)

## Log Spend Quick-Entry + Google Ads API — June 1 2026
- [x] Wire onLogSpend on Google Ads and ClickGrow SpendOnlyCards to pre-select platform and open spend modal
- [ ] Research Google Ads API authentication (OAuth2 + developer token + customer ID)
- [ ] Add googleAds tRPC procedure to fetch campaign spend from Google Ads API
- [ ] Add GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_CUSTOMER_ID secrets
- [ ] Update Google Ads card to show live API spend with manual-logged fallback

## Remove ClickGrow + Add Google to Generate Ad — June 1 2026
- [x] Remove ClickGrow from platform selector, spend card, PLATFORMS_ORDER, CHART_COLORS, generateForAll, schedulePost
- [x] Remove ClickGrow from adSpend schema enum and opsRouter enum
- [x] Add Google to generateForAll (AI copy generation), platform selector, copy panel, post stub
- [x] Add Google to PLATFORMS_ORDER, PLATFORM_LABELS, PLATFORM_COLORS, CHART_COLORS
- [x] Update All Four to All Five everywhere in Ads.tsx and opsRouter.ts
- [x] Add Google spend card to Platform Connections (keep, no ClickGrow)

## Ads Page Audit Fixes — June 1 2026

### Critical Bugs
- [x] Fix "Post to All Three" label on single-platform result card (line 1424) — update to current platform set
- [x] Fix scheduled queue "all" platform label — update from "FB + IG + X" to reflect all five platforms
- [x] Add LinkedIn post button to single-platform result card when platform === "linkedin"
- [x] Add Google copy panel to single-platform result card when platform === "google"

### UX Issues
- [x] Replace "Copy Google Ad" button with real browser Clipboard API copy
- [x] Redesign platform selector for mobile — too wide with 7 buttons at flex-1
- [x] Add generate progress feedback (step label or sub-message during 8-15s AI call)
- [x] Add image upload affordance inside All Five panels — resolved: shared image upload at top of All Five card confirmed by user (option 1)
- [x] Add Ad History empty state with explanation text
- [x] Separate Google Ads vs Google Business Profile in Platform Connections section

### Architecture
- [x] Unify handlePost and handlePostAllPlatform — deferred by user; leaving as-is

## Audit Fix Pass 2 — Jun 2026

- [x] Fix HistoryRow "all" platform label (stale "FB + IG + X")
- [x] Add charLimit={280} to X panel in All Five mode
- [x] Fix stale LinkedIn panel note to reference gear icon in Platform Connections
- [x] Fix Ads.tsx file-level comment to reflect all five platforms
- [x] Auto-copy Google ad copy to clipboard when Post to All Five is clicked
- [x] Add per-platform draft columns to socialPosts schema (igDraft, xDraft, liDraft, googleHeadline, googleDescription, googleDraft)
- [x] Run db:push after schema changes
- [x] Fix ensureSaved to persist all five platform drafts in All Five mode
- [x] Update Ad History HistoryRow to load and display per-platform copy
- [x] Add image upload affordance to All Five panels (shared image at top — user confirmed option 1)
- [x] Clean up adSpend ClickGrow enum — migrate orphaned entries to "other", remove clickgrow from enum (table was empty)
- [x] Split ads procedures from opsRouter.ts into server/routers/ads.ts
- [x] Update opsRouter.ts to import and merge ads router

## Ad Generation Loading State — Jun 2026
- [x] Add rich loading state to ad generation: animated progress steps, estimated time, per-platform status indicators
- [x] Enhance loading state cards with platform-specific status messages, estimated time remaining, elapsed time counter, and animated progress bar
- [x] Add Cancel button to loading state that stops generation and resets to previous screen
- [x] Implement smooth CSS transitions for progress bar and status messages
- [x] Add post-generation summary view that auto-appears when all platform cards complete

## Jobber Connection UX — Jun 2026
- [x] Fix Jobber 403 errors: correct inverted expiry check, add error handling in jobberGraphQL, gate Navbar queries on connectionStatus
- [x] Add visual Jobber disconnect indicator to Navbar: amber dot on Ops button, status row in dropdown and mobile menu, links to /ops/settings to reconnect; green "connected" row when healthy

## LinkedIn OAuth Integration — Jun 2026
- [ ] Add LinkedIn OAuth credentials (client ID, client secret) as secrets
- [ ] Add linkedinTokens table to schema and push migration
- [ ] Build LinkedIn OAuth authorize endpoint and callback handler
- [ ] Build LinkedIn token storage, refresh, and connection status helpers
- [ ] Add LinkedIn connection status to /ops/settings page
- [ ] Wire LinkedIn post publishing into the Ads page (single + All Five modes)
- [ ] Add LinkedIn connection status indicator to Navbar dropdown (alongside Jobber)

## Copy Button — Jun 2026
- [x] Add copy-to-clipboard button to each platform panel in /ops/ads (All Five mode: FB, IG, X, LI; single-platform mode: all non-Google platforms; Google already had copy-to-clipboard)

## Copy Settings Modal — Jun 2026
- [x] Add copySettings table to schema (siteUrl, fbHashtags, igHashtags, xHashtags, liHashtags) and push migration
- [x] Add getCopySettings and saveCopySettings tRPC procedures to opsRouter
- [x] Build CopySettingsModal component in /ops/ads with per-platform hashtag inputs and site URL field
- [x] Wire buildCopyText to load from DB settings instead of hardcoded constants

## SEO Section (/ops/seo) — Jun 2026
- [x] Add seoAudits table to schema and push migration
- [x] Build server-side SEO audit engine (cheerio HTML parser + PageSpeed Insights API + checks)
- [x] Add runSeoAudit and getAuditHistory tRPC procedures to opsRouter
- [x] Build /ops/seo page: overall grade donut, category score cards (On-Page, Links, Usability, Performance, Social)
- [x] Build check items list per category with pass/warn/fail indicators and recommendations
- [x] Add audit history trend chart
- [x] Add /ops/seo route to App.tsx and Navbar

## SORO-Style SEO Content Engine (/ops/seo) — Jun 2026
- [x] Add seoKeywords and seoArticles tables to schema and push migration
- [x] Build keyword research tRPC procedure using AI to generate targeted keyword ideas for Middle TN land clearing
- [x] Build AI article generator tRPC procedure using Jon's brand voice, targeting a specific keyword
- [x] Build keyword research UI tab: generate keywords, view search intent, difficulty, and save targets
- [x] Build article generator UI tab: select keyword, configure article settings, generate and preview draft
- [x] Build content library UI tab: list all saved articles with status (draft/published), view, edit, delete
- [x] Integrate all three tabs into existing /ops/seo page alongside the audit section

## SEO Audit Fix Issues Feature — Jun 2026
- [x] Add seoFixes table to schema (auditId, checkId, category, label, aiInstructions, status: pending/resolved, resolvedAt) and push migration
- [x] Add generateSeoFixes tRPC procedure: takes auditId, calls AI to generate step-by-step fix instructions per failed/warned check
- [x] Add markSeoFixResolved and getSeoFixes tRPC procedures
- [x] Add "Fix Issues" button to audit results that triggers AI fix generation for all non-passing checks
- [x] Build Fix Issues panel in audit tab: list of fixable checks with AI-generated step-by-step instructions, mark-as-resolved toggle, progress indicator

## SEO In-Place Fix Application + SEO Agent — Jun 2026
- [x] Research best SEO scoring criteria and fix sources to target 100/100 overall score
- [x] Add "Apply Fix" button to each AI-generated fix card that generates a ready-to-paste code snippet (HTML/JSON-LD/text) with copy button
- [x] Add seoAgent tRPC procedure: conversational AI with full audit context, brand voice, and Squarespace-specific knowledge
- [x] Build SEO Agent tab: chat interface using AIChatBox with suggested prompts and audit context banner
- [x] Upgrade audit engine with research-backed checks (Core Web Vitals, schema markup, canonical tags, Open Graph, structured data, robots.txt, sitemap, hreflang, etc.)

## SEO Audit Redesign + Checks Upgrade — Jun 2026
- [x] Add missing high-impact SEO checks: sitemap.xml reachability, robots.txt validation, LocalBusiness JSON-LD field validation, page word count, H1 keyword match, lang attribute on html tag
- [x] Remove low-value checks: external nofollow, image count, social profile links
- [x] Redesign Audit tab to two-column layout: left = grade donut + category rings + score history; right = recommendations + detailed checks + fix panel
- [x] Add Squarespace location context to every Apply Fix snippet (where exactly to paste it in Squarespace)

## SEO Detailed Checks — Fix Examples — Jun 2026
- [x] Add fixExample field to SeoCheck type and populate it for every failed/warned check in seoAudit.ts
- [x] Upgrade CheckRow component to show fix example (code block or plain text) in expanded state, with copy button

## SEO Detailed Checks — Expandable Fix Examples

- [x] Add fixExample field to SeoCheck interface in seoAudit.ts and Seo.tsx
- [x] Populate fixExample for all 30+ non-passing check IDs with Squarespace-specific instructions
- [x] Upgrade CheckRow component with expandable "How to fix" block, monospace code display, and copy-to-clipboard button

## SEO Generate Fixes — Research-Backed Fix Instructions

- [x] Upgrade generateSeoFixes LLM prompt to research each failing check and return a structured object with why_it_matters, impact, and fix_steps per item
- [x] Update Fix Issues panel UI to display research context (why it matters, SEO impact) above the fix instructions for each item

## SEO On-Site Fixes — nolandearthworks.com

- [x] Add H1 tags to all public-facing pages missing them
- [x] Add primary keywords (forestry mulching, land clearing, Tennessee) naturally to page content
- [x] Expand thin pages to 600+ words with keyword-rich, on-brand copy
- [x] Inject LocalBusiness JSON-LD structured data into the site head (already present in index.html)

## SEO Audit Engine — Accuracy Fixes (Jun 4 2026)

- [x] Fix LocalBusiness JSON-LD regex in seoAudit.ts so it detects the existing block in index.html
- [x] Upgrade audit engine to use Puppeteer headless browser so React SPA content (H1, word count, links, images) is accurately audited
- [x] Verify CDN cache cleared for title and meta description after index.html update

## Site Audit Fixes — Jun 8 2026

- [x] Hide Ops button in Navbar from public visitors (admin-only)
- [x] Hide Ops Dashboard link in Footer from public visitors (admin-only)
- [x] Fix stats bar data: 35 counties served, 24hr quote turnaround
- [x] Fix "Valneer" typo on pricing page — correct spelling is Vanleer
- [x] Make email field required on quote form

## Field Fix (FieldFix.ai Clone)
- [x] DB schema: equipment table (make, model, year, serial, hours, tags, notes)
- [x] DB schema: service_logs table (equipment_id, date, hours_at_service, service_type, notes, cost)
- [x] DB schema: service_intervals table (equipment_id, service_type, interval_hours, last_service_hours, last_service_date, notes)
- [x] DB schema: field_diagnostics table (equipment_id, symptoms, error_code, photo_url, report_json, created_at)
- [x] tRPC: equipment CRUD procedures
- [x] tRPC: service log CRUD procedures
- [x] tRPC: service interval CRUD procedures
- [x] tRPC: runDiagnostic procedure (LLM Fix Report generation)
- [x] UI: /ops/field-fix page with tabs (Equipment, Diagnose, Service Log, Intervals, History)
- [x] UI: Equipment card — make/model/year/serial/hours/tags, quick hours update
- [x] UI: Diagnose tab — symptoms textarea, error code input, photo upload, Diagnose button
- [x] UI: Fix Report display — confidence %, root causes ranked, fix steps (checkable), cost estimate, tools needed, safety notice
- [x] UI: Service Log tab — log entry form + timeline list
- [x] UI: Intervals tab — add/edit intervals with hours-based due status (overdue/due soon/ok)
- [x] UI: History tab — past diagnostics list with summary
- [x] Nav: Add Field Fix link to DashboardLayout sidebar

## Field Fix Enhancements — June 2026
- [ ] Fix Report: Export as PDF (client-side generation)
- [ ] Fix Report: Generate shareable link (save report to DB, public URL)
- [ ] Intervals tab: Visual progress bars showing hours used vs. interval
- [ ] Intervals tab: Color-coded status badges (green/amber/red) with percentage
- [ ] Service Log tab: Search by keyword (service type, notes, performer)
- [ ] Service Log tab: Filter by service type dropdown
- [ ] History tab: Search diagnostics by symptom text or date
- [ ] History tab: Filter by equipment (when multiple machines exist)

## Sidebar Fix — June 2026
- [x] Fix /ops sidebar: make it independently scrollable so all nav items are visible regardless of page scroll position

## SEO + Field Fix Enhancements (Jun 8 2026)
- [ ] SEO: "Apply All Fixes" button after audit generation that applies all recommended fixes in one click
- [ ] SEO: Post-apply confirmation panel showing each fix with pass/fail status and what changed
- [ ] Field Fix: Shareable link expiration date option + revoke button per diagnostic
- [ ] Field Fix: Branded PDF export header with company logo and timestamp
- [ ] Field Fix: "Add New Service" quick-entry modal button in Service Log tab

## 15 AI Automation Features

- [ ] AI #1: Lead qualification score (1-10) on lead card — backend procedure + UI badge
- [ ] AI #2: Lead stage advancement suggestion — AI reads notes/chat and suggests next stage
- [ ] AI #3: SMS smart reply — 3 pre-written reply options (direct close, soft follow-up, info request)
- [ ] AI #4: Invoice risk flagging — AI scans open invoices, flags high-risk, pre-writes collection message
- [ ] AI #5: Job profitability analysis — compare actual vs quoted hours, flag margin losers
- [ ] AI #6: Proposal auto-draft from lead data — pre-fill quote from lead acreage/terrain/chat transcript
- [ ] AI #7: Review auto-post — one-click approve and post reply to Google/Facebook
- [ ] AI #8: Timesheet anomaly detection — flag unusual hours, duplicates, off-schedule entries
- [ ] AI #9: Seasonal demand forecasting — 60-90 day lead/revenue projection on Scoreboard/Reports
- [ ] AI #10: Social post auto-draft from completed job — draft FB/IG post when job marked complete
- [ ] AI #11: Client churn detection — flag clients 12+ months inactive, draft re-engagement message
- [ ] AI #12: Equipment maintenance prediction — AI predicts next failure from service log patterns
- [ ] AI #13: Task auto-generation from job notes — AI creates tasks from follow-up mentions in notes
- [ ] AI #14: Ad performance diagnosis — plain-English diagnosis of CTR/cost/conversion with one action item
- [ ] AI #15: End-of-day field summary — AI daily summary on Dashboard (jobs, hours, quotes, leads, tasks)

## AI UX Enhancements (Jun 2026)
- [ ] Add tone selector dropdown to Smart Replies in Conversations (Friendly, Professional, Direct, Apologetic)
- [ ] Audit all AI buttons across /ops pages and ensure consistent loading spinner + disabled state
- [ ] Add skeleton placeholder panels that appear while AI is generating (replace blank space)
- [ ] Add toast success notifications for: Auto-Generate Tasks, Lead Score, Stage Suggestion, Proposal Draft, Risk Scan, Churn Scan, Anomaly Detection, Forecast, Ad Diagnosis, Daily Summary, Maintenance Prediction

## Team Panel Notification Badge (Jun 8 2026)
- [x] Add notification badge to Team nav item in sidebar showing count of pending access requests (polls every 60s, owner-only, graceful fail for non-owners)

## Bug Fixes (Jun 2026)
- [x] Fix client delete failure — add connection guard to deleteClient and fix isJobberConnected to detect expired tokens

## Delete Field Quotes (Jun 2026)
- [ ] Add deleteFieldQuote procedure to server quoteRouter
- [ ] Wire delete button + confirmation dialog on ops Quotes page
- [ ] Wire delete button + confirmation on companion app My Quotes page

## Stripe Payment Integration

- [ ] Add payments table to DB schema (jobId, customerId, stripePaymentIntentId, type: deposit|balance, amountCents, status, paidAt)
- [ ] Add stripeCustomerId column to users table
- [ ] Push DB migration (pnpm db:push)
- [ ] Install stripe npm package
- [ ] Create server/stripe.ts with Stripe client and helpers
- [ ] Create server/paymentRouter.ts with tRPC procedures: createDepositSession, createBalanceSession, listMyPayments, getJobPaymentStatus
- [ ] Register paymentRouter in server/routers.ts
- [ ] Add POST /api/stripe/webhook route with raw body parser and signature verification
- [ ] Handle checkout.session.completed webhook: update payment status, record paidAt
- [ ] Ops UI: Payment panel on ops Jobs page — show deposit/balance status, send payment link buttons
- [ ] Customer portal: /portal route with login guard, lists jobs with payment status, Pay Now button
- [ ] Customer portal: /portal/success and /portal/cancel redirect pages
- [ ] Write vitest tests for paymentRouter procedures
- [x] Remove mobilization fee as a visible line item: hide from website CostCalculator stat boxes, remove Mobilization Distance input from CostEstimator (field/ops), suppress mobilizationCost from AI breakdown display, rename "Mob Surcharge" to "Travel Surcharge" in Pricing.tsx and DistanceQuotes.tsx

## SEO Improvements — June 2026
- [x] Fix inner-page title lengths: service pages, county pages, blog posts (target ≤60 chars)
- [x] Implement React.lazy() code splitting for all /ops routes in App.tsx
- [x] Add AggregateRating schema to LocalBusiness JSON-LD on homepage
- [x] Add FAQPage schema to homepage
- [x] Create real /llms.txt server route (plain text, not SPA HTML)

## Crew Assignment to Jobs (Jun 15, 2026)
- [x] Add crewId FK column to jobs table in schema.ts
- [x] Run db:push to migrate crewId column
- [x] Add crewId to jobs.create input schema in opsRouter.ts
- [x] Add ops.jobs.assignCrew procedure in opsRouter.ts
- [x] Add crew dropdown to Add Job modal in Jobs.tsx
- [x] Add "Assign Crews to Jobs" panel in Crews.tsx with inline crew dropdown per job

## Jobber Products & Services Fix (Jun 16, 2026)
- [x] Fix "Jobber not connected" false positive on /ops/pricing: rename productsAndServices → productOrServices and onlineBookingEnabled → onlineBookingsEnabled in getJobberServices GraphQL query
- [x] Redesign JobberServicesCard: card-grid layout (3-col responsive), prominent price display, full description with line-clamp, category + taxable badges, hidden items dimmed

## Drag-and-Drop Crew Scheduling (Jun 15, 2026)
- [x] Add DraggableEntryCard component to Schedule.tsx (schedule entries draggable)
- [x] Add DraggableLocalJobCard component to Schedule.tsx (local jobs draggable)
- [x] Add DroppableCrewDayCell component to Schedule.tsx (crew+day drop targets)
- [x] Update handleDragStart to track draggingEntryId and draggingLocalJobId state
- [x] Implement handleDragEnd: persist entry moves via schedule.update, persist local job moves via jobs.update (date + crew)
- [x] Add updateEntry, updateLocalJob, assignCrewToJob mutations to Schedule page
- [x] Add localJobMap (crew+day keyed) to Schedule page using jobs.list query
- [x] Replace plain <td> crew cells with DroppableCrewDayCell in calendar grid
- [x] Replace static entry <div> cards with DraggableEntryCard in calendar grid
- [x] Add DraggableLocalJobCard cards to each crew+day cell from localJobMap
- [x] Update DragOverlay to handle entry and local job drag previews
- [x] Verify TypeScript: 0 errors

## Gallery Upload Flow in Ops (Jun 16, 2026)
- [x] Add galleryPhotos table to drizzle/schema.ts (id, url, key, title, description, serviceType, county, acreage, photoType before/after/general, jobId optional, visible, sortOrder, createdAt)
- [x] Run pnpm db:push to migrate
- [x] Build server/galleryRouter.ts with: uploadPhoto (base64→S3), listAll, listPublic, updatePhoto, deletePhoto, reorder
- [x] Register galleryRouter in server/routers.ts
- [x] Build client/src/pages/ops/Gallery.tsx with: drag-drop upload zone, queue with per-photo metadata fields, photo grid, edit modal, delete confirm, visibility toggle
- [x] Register /ops/gallery route in App.tsx
- [x] Add Gallery nav item to DashboardLayout sidebar
- [x] Wire public /gallery page to fetch from DB instead of static array
- [x] Verify TypeScript 0 errors

## Reviews — Homepage + Ops Page (Jun 17, 2026)
- [ ] Fetch real Google Places reviews via Google Places API (GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID)
- [ ] Fetch real Facebook page reviews via Facebook Graph API (FACEBOOK_PAGE_ACCESS_TOKEN + FACEBOOK_PAGE_ID)
- [ ] Build reviewsRouter with getGoogleReviews, getFacebookReviews, getCombinedStats procedures
- [ ] Update homepage StatsBar to show accurate combined rating + review count labeled "Reviews" (not "Google Rating")
- [ ] Build /ops/reviews page: combined feed of all reviews from both platforms, full review text, star rating, reviewer name, date, platform badge
- [ ] Register /ops/reviews route in App.tsx
- [ ] Add Reviews nav item to DashboardLayout sidebar

## Reviews UI Improvements (Jun 17, 2026)
- [x] Add "Leave a Review" button to TestimonialsSection linking to Google Business Profile review page (already existed at https://g.page/r/CcglMAMbtQInEBM/review)
- [x] Add platform filter (All / Google / Facebook) and star-rating filter (All / 5★ / 4★ / 3★ and below) to /ops/reviews
- [x] Add Google and Facebook review integration section to Settings page with connection status, instructions, and action buttons

## LinkedIn OAuth Integration (Jun 18, 2026)
- [ ] Create LinkedIn developer app with correct OAuth redirect URI
- [ ] Add linkedinTokens table to drizzle schema and run db:push
- [ ] Build server/linkedinRoutes.ts with /api/linkedin/authorize, /api/linkedin/callback, /api/linkedin/disconnect, and token refresh helper
- [ ] Wire LinkedIn posting in ads.ts publishToLinkedIn using stored OAuth token instead of static credentials
- [ ] Add Connect/Disconnect LinkedIn card to Settings → Integrations
- [ ] Verify TypeScript 0 errors and save checkpoint

## AI Quote Assistant (Jun 20, 2026)
- [x] Add "AI Assist" button to new-quote form in /ops/quotes
- [x] Build quotes.aiAssist tRPC procedure: accept context text + optional image URLs, call LLM with Noland Earthworks pricing knowledge and project instructions, return structured quote draft (line items, scope, inclusions/exclusions, estimated price, notes)
- [x] Build AiQuoteAssistModal component: context textarea, multi-image upload (up to 5 site photos via S3), streaming LLM response with structured output, "Apply to Quote" button that populates form fields
- [x] Ensure AI references Middle/West Tennessee rates and acreage in generated quote

## Jobs Complete / Paid / Archive Flow (Jun 20, 2026)
- [x] Add markComplete mutation to jobs router: sets status="completed", completedDate=now
- [x] Add markPaid mutation: sets paymentStatus="paid", paidDate=now
- [x] Add archiveJob mutation: sets status="archived"
- [x] Add unarchiveJob mutation: sets status back to "completed"
- [x] On /ops/jobs active list: show "Mark Complete" action on in-progress/scheduled jobs
- [x] On /ops/jobs: once complete, show "Mark Paid" and "Archive" actions
- [x] Add "Archived" tab/section to /ops/jobs that shows archived jobs (not in active list)
- [x] Archived jobs show unarchive option

## AI Assist Apply-to-Form + Job Confirmation Dialogs (Jun 20, 2026)
- [x] AI Assist panel: parse structured AI response and add "Apply to Quote" button that populates form fields (title, description, scope, line items, price)
- [x] Job status actions: add confirmation AlertDialog before markComplete, markPaid, archiveJob, unarchiveJob mutations fire

## AI Audit Priority Features (Jun 21, 2026)

### Priority 1: Jobber Revenue Sync in Reports
- [ ] Pull Jobber invoices/revenue via GraphQL and store in jobber_revenue_cache table (invoiceId, total, status, issuedDate, clientName, jobTitle, syncedAt)
- [ ] Add syncJobberRevenue tRPC mutation and auto-sync on Reports page load
- [ ] Update Reports AI Insight/Forecast procedures to use combined local + Jobber revenue data
- [ ] Add "Last synced" timestamp and manual Sync button to Reports page

### Priority 2: Auto-create Lead from Chat Session
- [ ] When chat session captures name + phone, auto-insert lead record (source="chat", chatSessionId FK)
- [ ] Prevent duplicate leads from same session (check existing lead by phone + chatSessionId)
- [ ] Show toast notification on chat-sessions page when lead is auto-created

### Priority 3: AI Morning Brief on Dashboard
- [ ] Add morning_briefs table (date, content, generatedAt) and push migration
- [ ] Add morningBrief tRPC procedure: reads stale leads, open quotes age, today's jobs, win rate; calls LLM for 4-6 sentence plain-English briefing; caches once per day
- [ ] Add MorningBrief card to /ops dashboard with Regenerate button

### Priority 4: Quote Follow-Up Automation
- [ ] Add getStaleQuotes procedure: quotes with status "awaiting_response" and age > 7 days
- [ ] Add draftQuoteFollowUp procedure: calls LLM to draft follow-up SMS in Jon's voice (client name, job type, quote amount)
- [ ] Add StaleQuoteAlert banner to /ops/quotes listing stale quotes with "Draft Follow-Up" button
- [ ] Follow-up draft modal with editable text, Send via SMS, and Copy actions

### Priority 5: Satellite Property Analysis for Quotes
- [ ] Add analyzePropertySatellite tRPC procedure: fetch Google Maps Static satellite image for address, send to LLM vision to estimate vegetation density + terrain type + access challenges
- [ ] Wire "Analyze Property" button on inbound quote requests to auto-fill cost estimator fields
- [ ] Show satellite analysis result card below map on quote detail view

### Priority 6: Weather-Aware Scheduling
- [ ] Integrate Open-Meteo API (no key needed) — fetch 7-day precipitation forecast by lat/lng
- [ ] Add getJobWeatherRisk procedure: for each scheduled job next 7 days, flag jobs with >50% rain probability
- [ ] Add WeatherRiskBanner to /ops/schedule showing flagged jobs with rain probability
- [ ] Show weather risk badge on individual job cards in schedule calendar

### Priority 7: Review Request Automation Post-Job
- [ ] Add review_requests table (jobId, clientPhone, sentAt, status) and push migration
- [ ] Add sendReviewRequest tRPC mutation: sends personalized Twilio SMS referencing specific job; logs in review_requests
- [ ] Add "Send Review Request" button on completed jobs in /ops/jobs
- [ ] Auto-suggest review request in job completion confirmation dialog

### Priority 8: Ad Performance Feedback Loop
- [ ] Add performance notes fields to ad history (thumbs up/down, spend, leads)
- [ ] Add getAdPerformanceInsight procedure: reads ad history + performance notes, calls LLM to identify best-performing angles
- [ ] Add Performance Insights panel to /ops/ads with AI analysis and quick-log UI on ad history entries

### Priority 9: AI Crew Assignment and Capacity Alerts on Schedule
- [ ] Add getCapacityAlerts procedure: finds open calendar days in next 14 days + open quotes — surfaces as capacity gap alerts
- [ ] Add getCrewRecommendation procedure: given job type + acreage + terrain, returns recommended crew config with reasoning
- [ ] Add CapacityAlerts panel to /ops/schedule showing open days with matching open quotes
- [ ] Show crew recommendation suggestion when adding a new job to schedule

### Priority 10: Labor Cost vs. Estimate Calibration in Timesheets
- [ ] Add laborVsEstimate tRPC procedure: compare actual timesheet hours vs. cost estimator projected crew days for completed jobs; return variance by job type
- [ ] Add LaborCalibrationPanel to /ops/timesheets showing estimated vs. actual hours with variance %
- [ ] Wire AI Scan button to run variance analysis and flag job types where actuals exceed estimates by >20%
- [ ] Surface calibration recommendations in AI Scan output

## Capacity Alerts + Review Request Enhancements (Jun 21, 2026)
- [ ] Capacity Alerts panel: drag open quotes from the open quotes list and drop them onto an available scheduling window to create a schedule entry
- [ ] Review Request Automation: add configuration section in Settings (Integrations tab) to edit and save the default SMS message template (with {clientName}, {jobDescription}, {reviewLink} placeholders)
- [x] Make linked quote badge in /ops/leads clickable with live Jobber quote status
- [x] Add manual lead-quote linking from /ops/quotes
- [x] Run TypeScript check and save checkpoint after quote-linking updates
- [x] Wire all quoting flows (Jobs page estimated price hint) to read base rates from aiPricingSettings instead of hardcoded values
- [x] Add editable price range fields (editedPriceLow/editedPriceHigh) to AI analyzer results panel in Quotes.tsx
- [x] Add "AI Pricing" badge (amber Sparkles) to AI analyzer results panel price row
- [x] Update saveDraft call to serialize editedPriceLow/editedPriceHigh instead of raw analysis values
- [x] Fix AI Quote Assistant photo upload failure — register /api/gallery/upload-base64 REST endpoint in server
- [x] Add "Add Manual Request" button and modal to Website Requests section in /ops/quotes — allows entering a potential client manually to use all AI tools (analyzer, satellite map, quote assistant)
- [x] Restructure /ops/quotes into two-column grid: left 60% All Quotes table, right 40% Website Requests panel; request cards 2-col grid inside right panel
- [x] Convert Website Requests inbound list to compact per-line rows with + expand button for full detail/AI tools panel


## AI Automation Opportunities (from audit)

### Quick Wins (Priority 1)
- [x] Quote Follow-Up Automation — background agent monitors stale quotes (>X days untouched), drafts personalized follow-up email/SMS, queues for one-click approval in /ops/quotes or /ops/tasks (endpoint added; scheduled job created)
- [x] Chat-to-Lead Jobber Creation — AI agent monitors chat sessions, auto-creates leads in Jobber and /ops/leads when user provides name/contact/project details (endpoint added)
- [x] Morning Brief SMS — scheduled daily at 6 AM, sends SMS with active jobs, stale leads, pending quotes, and weather alerts (endpoint added)

### Secondary Opportunities
- [ ] Dynamic Service Recommendations — interactive assessment tool on public site guides users to correct service type
- [ ] Automated Review Harvesting — completed jobs trigger AI-personalized review requests, 4-5 star reviews auto-pulled to homepage
- [ ] Intelligent Cost Estimator — satellite imagery integration auto-fills acreage/terrain/density in /ops/cost-estimator
- [ ] Weather-Aware Predictive Scheduling — weather API integration flags jobs at risk, suggests alternative dates
- [ ] Closed-Loop Marketing Automation — ad performance data feeds back to ad generator, auto-adjusts default prompts
- [ ] Automated Equipment Maintenance Alerts — equipment hours trigger maintenance task generation in /ops/tasks

## AI Automation Build Pass 2 (Jun 27, 2026)
- [x] Weather-Aware Scheduling: getJobWeatherRisk tRPC procedure using Open-Meteo API, rain risk badges on /ops/schedule job cards, WeatherRiskBanner component (already live from prior session)
- [x] Automated Review Harvesting: sendReviewRequest tRPC mutation via Twilio SMS on completed jobs, Send Review Request button on /ops/jobs completed jobs (already live from prior session)
- [x] Intelligent Cost Estimator satellite auto-fill: analyzePropertySatellite procedure using Google Maps Static + LLM vision to pre-fill acreage/terrain/density in /ops/cost-estimator

## Ads & SEO AI Improvements (Jun 27, 2026)
- [x] A/B ad variant generator: generateAdVariants procedure returns 2-3 angle variations, UI in /ops/ads lets user pick one before posting
- [x] Auto-repurpose job photo to ad: one-click button on completed jobs in /ops/jobs drafts before/after post for all platforms using job photo; Send to Ads navigates with prefill
- [x] County page content generator: generateCountyPage procedure + UI in /ops/seo Write tab to bulk-generate service area page copy per county
- [x] Fix SEO audit — removed server-side carry-forward suppression; every audit now reflects live site HTML; client-side resolved/skipped hiding preserved for workflow
- [x] Send to Ads: auto-pull and attach job gallery photos to the ad draft so they don't need to be added manually
- [x] County Page Content Generator: auto-generate SEO meta title and description for each generated county page (already generated; displayed in Content Library)
- [x] A/B Ad Variant Generator: add Facebook visual preview mode showing how the ad will look before posting

## SEO Audit Auto-Apply (Option B)
- [x] Map each SEO check to auto-fixable (project codebase) vs manual (Squarespace) category
- [x] Build seoAutoPatcher.ts: patch index.html meta tags, JSON-LD schema, OG tags, robots.txt directly in project files
- [x] Update applySeoFix procedure to route auto-fixable checks through patcher and mark truly resolved
- [x] Update SEO UI to distinguish auto-applied vs manual-required fixes clearly
- [x] Add static SEO content block to index.html body (H1, H2s, hero image with alt, 400+ words, 10+ internal links) for crawler visibility
- [x] Reclassify all formerly-Squarespace checks as code-fixed (site is fully Manus-built, not Squarespace)
- [x] Update seoAutoPatcher.ts: CODE_FIXED_CHECKS and INFRA_CHECKS sets with informational messages
- [x] Update opsRouter.ts applySeoFix and applyAllSeoFixes to route CODE_FIXED_CHECKS and INFRA_CHECKS through patcher
- [x] Remove all Squarespace references from LLM prompts in opsRouter.ts

## Ballpark Range on Quote Confirmation
- [x] Update leadQualifier.ts to compute ballparkRange and ballparkNote via AI (total project range, not per-acre)
- [x] Update quoteRouter.ts submit procedure to return ballparkRange and ballparkNote in response
- [x] Update Quote.tsx confirmation screen to display ballpark range block with proper caveat framing

## /ops Sidebar Restructure
- [ ] Combine Quotes + Quote Analytics + Distance Quotes into tabbed Quotes page (/ops/quotes)
- [ ] Combine Leads + Conversations into tabbed Leads page (/ops/leads)
- [ ] Combine Clients + Invoices + Payments into tabbed Clients page (/ops/clients)
- [ ] Combine Crews + Timesheets + Crew Pricing into tabbed Crews page (/ops/crews)
- [ ] Combine Scoreboard + Reports into tabbed Reports page (/ops/reports)
- [ ] Combine Social Posts + Ads + SEO into tabbed Marketing page (/ops/marketing)
- [ ] Add Field Fix as tab under Equipment page (/ops/equipment)
- [ ] Add Cost Estimator as tab under Pricing page (/ops/pricing)
- [ ] Add Gallery to sidebar (/ops/gallery)
- [ ] Update OpsDashboardLayout sidebar to 15-item structure with correct icons (no duplicate Users icon)
- [ ] Update App.tsx routes for new combined pages and redirect old routes
- [ ] Verify TypeScript clean after restructure

## /ops Sidebar Restructure
- [x] Combine Quotes + Quote Analytics + Distance Quotes into tabbed Quotes page
- [x] Combine Leads + Conversations into tabbed Leads page (Conversations tab)
- [x] Create ClientsHub wrapper page (Clients / Invoices / Payments tabs)
- [x] Create CrewsHub wrapper page (Roster / Timesheets / Crew Pricing tabs)
- [x] Create ReportsHub wrapper page (Reports / Scoreboard tabs)
- [x] Create MarketingHub wrapper page (Social Posts / Ads / SEO tabs)
- [x] Create EquipmentHub wrapper page (Diagnostics / Field Fix tabs)
- [x] Create PricingHub wrapper page (Pricing / Cost Estimator tabs)
- [x] Update OpsDashboardLayout sidebar to 15-item structure with correct icons and hub routes
- [x] Add all hub routes to App.tsx with lazy imports and OwnerRoute guards
- [x] Verify TypeScript clean (0 errors)

## AI Visibility Score — Fix Buttons — June 2026

- [x] Add TaggedRecommendation type to aiVisibility.ts backend (text, fixType, fixLabel, autoFixable)
- [x] Add tagRecommendations() helper to map recommendation strings to fix types
- [x] Add applyAeoFix mutation to aiVisibilityRouter (8 fix types: generate_blog_posts, fix_brand_schema, generate_faq_content, llms_txt_exists, build_backlinks, improve_sentiment, submit_directories, maintain_momentum)
- [x] Update AiVisibility.tsx to render TaggedRecommendation[] with Fix buttons per recommendation
- [x] Green "Auto-Apply" buttons for autoFixable=true types; blue "Get Fix" buttons for autoFixable=false
- [x] Show loading spinner on button while mutation is pending
- [x] Display fix result in expandable panel below recommendation using Streamdown markdown rendering
- [x] Show "Applied" badge on auto-applied results; info badge on manual instruction results
- [x] Toast notification on fix completion; secondary toast for blog drafts pointing to SEO tab

## Branding & AI Visibility — June 2026

- [x] Replace all "Land Clearing" with "Land Management" across entire codebase (193 occurrences in 40+ files)
- [x] Replace "land-clearing" URL slugs with "land-management" throughout client and server
- [x] Replace "LAND CLEARING" all-caps variants in headings
- [x] Replace #LandClearing hashtag with #LandManagement in Ads.tsx and opsRouter.ts defaults
- [x] Retune AI Visibility audit prompts to focus on Forestry Mulching as primary service (all 10 prompts now mention forestry mulching explicitly)

## Land Management Page — Forestry Mulching FAQ Section — June 2026

- [x] Add dedicated ForestryMulchingFaqSection component to LandClearing.tsx with 10 AI-optimized Q&As
- [x] Inject FAQPage JSON-LD schema for the forestry mulching section (separate from ServicePageLayout's existing schema)
- [x] Section renders below the existing ServicePageLayout FAQ and above the footer
- [x] Accordion expand/collapse with orange accent color matching site design
- [x] Fix page title to remove duplicate "& Management" from "Land Management & Management in Tennessee"

## SEO Content Library — Publish to Site — June 2026

- [x] Add publishedSlug and publishedAt columns to seoArticles schema and push migration
- [x] Add publishSeoArticle mutation to opsRouter: generates slug, writes .tsx blog post file, registers route in App.tsx, marks article as published
- [x] Add inline Publish button to Content Library list rows (orange, shows spinner while publishing)
- [x] Add Publish to Site button inside ArticleDrawer (orange, shows spinner while publishing)
- [x] Show "View live" link on published articles in list and drawer
- [x] Slug collision detection: throws CONFLICT error if another article already uses the same slug

## SEO Audit Fixes — June 2026

- [x] Trim 37 blog post meta descriptions to ≤160 chars (all were 161–231 chars)
- [x] Trim 8 service/core page meta descriptions to ≤160 chars (Forestry Mulching, Land Management, About, Pricing, Blog, Right-of-Way, Selective Clearing, Vegetation Management)
- [x] Fix llms.txt typo: "Land Management & Management" → "Land Management"
- [x] Add LocalBusiness + knowsAbout schema to ForestryMulching page via useEffect
- [x] Fix /quote page: trim title (78→47 chars), trim description (170→130 chars), trim global keywords (10→5)

## AI Visibility Score — On-Site Improvements (Jun 2026)
- [x] Expand llms.txt with richer context, job outcomes, geographic specificity, and quotable statements
- [x] Build standalone /faq page with 25+ forestry mulching Q&As matching audit prompt language
- [x] Add Person/expert schema to BlogPostLayout and strengthen Article schema author fields
- [x] Add "Why Noland Earthworks" structured content block answering branded audit prompts
- [x] Strengthen competitor comparison content on ForestryMulching page
## Twilio SMS Proxy — Two-Way Cell Forwarding (Jun 2026)
- [x] Write server/twilioRoutes.ts with POST /api/twilio/inbound webhook (log to CRM, forward to owner cell)
- [x] Write POST /api/twilio/owner-reply webhook (parse reply format, send to customer via Twilio, log outbound)
- [x] Add GET /api/twilio/status health check endpoint
- [x] Register registerTwilioRoutes in server/_core/index.ts
- [x] Write 16 vitest unit tests for normalizePhone and parseOwnerReply parsing logic (all passing)
## CRM SMS Enhancements (Jun 2026)
- [x] Add dedicated SMS conversation view in CRM ops panel — full chat history per customer with send reply box
- [x] Add send-initial-outbound-SMS button on lead profile page — compose and send first text to a new lead
- [x] Add unread message badge/indicator in CRM nav and conversations tab for new incoming customer texts
## CRM SMS Enhancements — Round 2 (Jun 2026)
- [x] Add AI-powered suggested reply button in SMS conversation view — generates quick response from customer's last message
- [x] Update SMS compose modal (lead profile) to allow selecting/inserting pre-saved text message templates
- [x] Implement global toast notification anywhere in app when new SMS arrives — click to jump to conversation
## CRM SMS Enhancements — Round 3 (Jun 2026)
- [x] Confirm Conversations sidebar badge updates in sync with global toast notification (both use same 30s poll)
- [x] AI suggested reply: pull lead profile context (name, service interest, acreage, location) into draft prompt for personalized replies
## CRM SMS Enhancements — Round 4 (Jun 2026)
- [x] Add 'Edit Lead Info' button in conversation view header — opens inline edit modal for name, phone, jobType, address, notes; updates lead record so AI context improves immediately

## Get More Leads Panel (Jul 2026)
- [x] Add "Get More Leads" collapsible panel to /ops dashboard with AI-generated 5-step weekly action plan
- [x] Panel uses pipeline state + current season to personalize steps (channel icons, effort tags, checkboxes)
- [x] Add generateLeadActionPlan procedure to leadsRouter with json_schema response format

## AI Lead Prospecting System (Jul 2026)
- [ ] Apply §5c heartbeat patches to sdk.ts and manusTypes.ts for cron authentication
- [ ] Add prospecting_leads table to drizzle schema (source, url, contactName, contactInfo, summary, status, reachOutDraft, createdAt)
- [ ] Push DB migration for prospecting_leads table
- [ ] Add DB helpers for prospecting_leads in server/db.ts
- [ ] Build /api/scheduled/prospect-leads Express handler (receives prospects from AGENT cron, saves to DB)
- [ ] Register /api/scheduled/prospect-leads in server/_core/index.ts
- [ ] Add tRPC procedures: list, dismiss, markContacted for prospecting_leads
- [ ] Build /ops/prospecting CRM page with prospect cards and reach-out modal
- [ ] Add Prospecting nav item to OpsDashboardLayout sidebar
- [ ] Save checkpoint, deploy, register AGENT cron (daily 9am CT), and verify
- [x] Add a Run Scan button to the Prospecting tab
- [x] Trigger prospecting on demand while keeping the scheduled AGENT cron in place
- [x] Reuse the existing prospect-leads ingestion path for manual scan results
- [x] Add loading/error UI for manual Run Scan from Prospecting
- [x] Add or update tests for manual prospecting trigger flow
- [x] Integrate Tennessee parcel API into quote form (auto-fill county, acreage, owner, TPAD link)
- [x] Add Google Places autocomplete to parcel lookup field in quote form
- [x] Save parcel owner name and parcel ID to quote submission record
- [x] Display preliminary price estimate inline when parcel found and service selected
- [x] Add distinct orange loading spinner to parcel lookup address field while fetching
- [x] Save preliminary price estimate (estimatedRange) and adjustedAcres to DB quote submission record
- [x] Add adjusted acreage input field for partial-property jobs (overrides deed acreage in estimate)
- [x] Add Resources section to /ops Business nav — 46 Brushworks documents with search, category filter, and direct download links

## Cost Estimator Audit (Jul 2026)

- [x] Rename "Site Preparation" to "Vegetation Management" in CostEstimator service select
- [x] Add Trail Cutting: pass linearFeet to the router when Trail Cutting is selected (currently only acreage is passed)
- [x] Add Trail Cutting: pass trailWidth to the router and include it in the AI job description
- [x] Add Trail Cutting: pass trailAddOns to the router and include them in the AI job description
- [x] Add ROW Clearing: add ROW width input so effective acres can be calculated from LF × width
- [x] Add universal add-on modifiers for all services: Post-Clear Seeding, Fence Line Clearing, Mulch Redistribution, Selective Clearing
- [x] Fix client view label — hardcoded "Forestry Mulching / Land Management" should show the selected service name
- [x] Add mobilization miles input to the UI (currently hardcoded to 25 miles)
- [x] Add "Vegetation Management" market rate to COST_SYSTEM_PROMPT in costEstimatorRouter (already present but verify)
- [x] Add fence line LF add-on input to the estimator form
## Margin Tier Scoring (Jul 9, 2026)
- [x] Add marginTier (varchar 16) and estimatedAcres (varchar 32) columns to prospecting_leads table
- [x] Run pnpm db:push — migration 0082_nosy_master_chief.sql applied successfully
- [x] Update scan prompt in opsRouter.ts to instruct AI to output marginTier and estimatedAcres per prospect
- [x] Update insertProspectingLead in server/db.ts to accept and persist marginTier and estimatedAcres
- [x] Update both postback endpoints in server/_core/index.ts to pass marginTier and estimatedAcres through to DB insert
- [x] Add marginTier and estimatedAcres to Prospect interface in client/src/pages/ops/Leads.tsx
- [x] Add HIGH MARGIN (green), MED MARGIN (amber), LOW MARGIN (gray) badges to prospect cards
- [x] Add green border highlight to high-margin prospect cards
- [x] Show estimated acreage (~X ac) on prospect cards when available
- [x] Add v1.0.17, v1.0.18, v1.0.19 entries to CHANGELOG in DashboardLayout.tsx
- [x] Bump version to 1.0.19 in package.json

## AI/Quoting Accuracy Fixes + Prospecting Enhancements (Jul 10, 2026)

### Priority 1 — Cost Floor & Rate Accuracy
- [x] Fix prospecting scan prompt: update cost floor from $620/day to $1,047/day and recalibrate HIGH/MED/LOW margin tier thresholds
- [x] Fix Cost Estimator minimum job floor: change $800 to $1,800
- [x] Wire AI Quote panel (quoteFromLead) to pull live rates from aiPricingSettings DB table instead of hardcoded prompt values
### Priority 2 — Proposal & Qualifier Improvements
- [x] Fix Draft Proposal: suppress unreliable ballparkRange or tie it to Distance Quote rate table
- [x] Add structured add-on checklist to AI Assist Quote panel (stump count, debris loads, seeding, fence line)
- [x] Add acreage and density structured inputs to Lead Qualifier (Score Lead)
- [x] Add margin-per-job data to Morning Brief
### Prospecting Section Enhancements
- [x] Add quick-filter buttons for margin tier (ALL / HIGH / MED / LOW)
- [ ] Add sort controls (newest / highest margin / most acres)
- [x] Add one-click "Add to Leads" button on each prospect card
- [x] Add outreach status tracking (new / contacted / dismissed) per prospect with color coding
- [ ] Add bulk dismiss for low-margin or already-contacted prospects
- [x] Add High Margin stat card to stats row (clickable filter)

## Prospecting UX Enhancements — Round 2 (Jul 10, 2026)
- [x] Add to Leads: auto-generate AI draft outreach message based on prospect details when promoting
- [x] Add bulk selection to Prospecting tab (checkboxes, select all, promote selected, dismiss selected)
- [x] Add quick-edit modal on prospect card click to adjust estimated acreage and margin tier before promoting

## Prospecting UX Enhancements — Round 3 (Jul 10, 2026)
- [x] AI Draft modal: add Regenerate button to get a new message variation without closing the modal
- [x] Bulk promote: carousel/queue review system — review and edit each AI draft sequentially before confirming
- [x] Quick-Edit modal: add Notes textarea to capture extra context before promoting to a lead

## Content/Branding Fixes (Jul 10, 2026)
- [x] ServicesSection: move Forestry Mulching to first position (currently second after Land Management)
- [x] Navbar: move Forestry Mulching to first position in services dropdown
- [x] ServicesSection: remove Post-Clear Seeding from add-ons list
- [x] Navbar: remove Post-Clear Seeding from add-ons dropdown
- [x] App.tsx: remove PostClearSeeding route, redirect /services/add-ons/post-clear-seeding to /services/forestry-mulching
- [x] PostClearSeeding.tsx: page can remain but route redirects away (or delete page)
- [x] Pricing.tsx: remove Post-Clear Seeding service card
- [x] Quote.tsx: remove Post-Clear Seeding from all add-on arrays
- [x] CostCalculator.tsx: remove Post-Clear Seeding add-on option
- [x] AddOnGuideSection.tsx: remove Post-Clear Seeding card
- [x] FenceLineClearing.tsx: remove Post-Clear Seeding from related services
- [x] MulchRedistribution.tsx: remove Post-Clear Seeding from related services
- [x] SelectiveClearing.tsx: remove Post-Clear Seeding from related services
- [x] sitemapRoutes.ts: remove post-clear-seeding URL
- [x] ops/Settings.tsx: remove Post-Clear Seeding from pricing settings and calculator preview
- [x] ops/CostEstimator.tsx: remove Post-Clear Seeding from add-on options
- [x] ops/Pricing.tsx: remove Post-Clear Seeding from benchmark table
- [x] agents.ts: remove Post-Clear Seeding from service pricing list
- [x] leadQualifier.ts: remove post-clear seeding from rate reference
- [x] widgetRouter.ts: remove postClearSeedingPerAcre from widget response
- [x] opsRouter.ts: remove seeding add-on pricing context from quote prompts
- [x] aiAutomationRouter.ts: update company description from "land clearing" to "land management"
- [x] opsRouter.ts: update all AI prompt descriptions from "land clearing" to "land management"
- [x] Faq.tsx: update "land clearing" contextual references to "land management"
- [x] ForestryMulching.tsx: update competitor comparison line from "land clearing companies" to "land management companies"
- [x] BlogPostLayout.tsx: update "land clearing" keyword to "land management"
- [x] Leads.tsx (prospecting description): update "land clearing" to "land management"
- [x] Prospecting.tsx: update "land clearing" to "land management"
- [x] Fix Jobber 403 Cloudflare IP-block: add graceful try/catch to all 8 read-query procedures so homepage and Ops pages return empty results instead of 500 errors when Jobber API is unreachable
- [x] Build govContractsRouter.ts tRPC procedure to fetch SAM.gov opportunities via public search API
- [x] Build /ops/sales/government-contracts page with live SAM.gov opportunity feed, filters, and state portal links
- [x] Wire Government Contracts into ops/sales navigation
- [x] Store CAGE_CODE and UNIQUE_ENTITY_ID as project secrets
- [x] Build bidPrep mutation in govContractsRouter.ts: AI-generated capability statement + pre-filled bid cover sheet
- [x] Build Prepare Bid modal on GovContracts page with cover sheet, capability statement, pricing worksheet, copy/print actions
- [x] AI-complete the Pricing Worksheet in bidPrep: generate competitive government-rate unit prices, quantities, and total bid with rationale per line item
- [x] Filter out expired contracts from gov-contracts listing (do not show status=Inactive/Expired)
- [x] In bidPrep mutation, fetch the SAM.gov opportunity page to extract scope of work and pass it to AI pricing/capability prompts
- [x] Add tnStateContracts tRPC procedure to govContractsRouter: scrape TN CPO ITB page, filter by land-clearing keywords, return structured results
- [x] Add TN State tab to GovContracts page with filtered ITB results and static reference links (TDOT Bid Lettings, TVA Supplier Portal, GO-BID)
- [x] Build weigh station dataset (TN + surrounding states) with lat/lng, name, direction, bypass hours
- [x] Add weighStationRoutes table to drizzle schema for saved routes
- [x] Build routePlanner tRPC procedures: planRoute (Google Directions + weigh station matching), saveRoute, getSavedRoutes, deleteRoute
- [x] Build WeighStationPlanner page at /ops/route-planner with Google Maps, route overlay, weigh station markers, saved routes panel
- [x] Wire WeighStationPlanner into ops sidebar under Field Work
- [x] Add weighStationStatus tRPC procedure: scrape coopsareopen.com for TN station open/closed status with timestamp
- [x] Add dieselPrice tRPC procedure: fetch current TN diesel price from EIA public API
- [x] Update WeighStationPlanner UI: open/closed badge on each weigh station marker and card, fuel cost estimator panel with adjustable MPG input
- [x] Fix weigh station markers not showing on route planner map: clearMap used m.setMap(null) on AdvancedMarkerElement (requires m.map = null); fixed with type-safe dual-path cleanup
- [x] Replace AI-only ad machine images with a curated pool of forestry mulching stock photos
- [x] Update ads generator to select varied forestry mulching stock photos by job context instead of repeating one machine with different backgrounds
- [x] Add stock photo preview panel to Ads page: show auto-selected photo after generation, with prev/next swap buttons to cycle through the full pool
- [x] Add machine brand preference setting to Ops Settings: dropdown to select preferred equipment brand (CAT, Kubota, Takeuchi, Bobcat, Other), stored in DB, used to boost matching photos in ad selection

## Prospecting Tab Improvements (v1.0.47)
- [x] Schema: add urgencyFlag (boolean), archivedAt (timestamp), lastContactedAt (timestamp) columns to prospectingLeads
- [x] Tier 1: Display margin tier badge (HIGH/MED/LOW) prominently on each prospect card with color coding
- [x] Tier 1: Show estimated acreage on each prospect card next to location
- [x] Tier 1: Add "Message on Facebook" button for prospects with profileUrl stored (m.me/ deep link)
- [x] Tier 1: Expose notes field inline on each card with one-click edit
- [x] Tier 1: Show lead age in days with staleness warning after 14 days
- [x] Tier 1: Urgency flag indicator on cards (red Urgent badge + left border accent)
- [x] Tier 2: Owner alert (push notification) when scan finds a high-margin or urgent prospect
- [x] Tier 2: Follow-up reminder section at top of list for contacted prospects with no update in 72+ hours
- [x] Tier 2: Convert to Lead button — promote prospect to full ops lead with outreach pre-filled
- [x] Tier 3: Sort options — by margin tier, age, source, location
- [x] Tier 3: Source performance mini-stats row (counts per source)
- [x] Tier 3: Bulk dismiss for cleaning out low-quality leads (checkbox selection + bulk action bar)
- [x] Tier 3: Archived tab with restore button; archive button on active cards

## AI FB Outreach Generator (v1.0.48)
- [x] Add generateFbOutreach tRPC procedure to prospectingRouter: takes prospect id, uses invokeLLM to write a short personalized Facebook Messenger message using prospect summary, notes, location, acreage, margin tier, and post snippet
- [x] Add "AI Message" button next to "Message on FB" on each prospect card; clicking opens a modal that auto-generates the message, shows a loading state, then displays an editable textarea with Regenerate and Copy buttons

## AI FB Outreach Modal Enhancements (v1.0.49)
- [x] Add tone selector dropdown (Casual, Professional, Urgent) to AI message modal; pass tone to generateFbOutreach procedure and adjust LLM prompt accordingly
- [x] Add Save to Notes button in modal that appends the final generated message to the prospect's notes field with a timestamp prefix
- [x] Auto-replace [PHONE] placeholder in generated message with OWNER_PHONE env var on the server before returning (falls back to Twilio from number, then hardcoded 615-406-4819)

## AI FB Outreach Modal UX (v1.0.50)
- [x] Replace the plain loading text with a skeleton animation (5 shimmer lines of varying widths) inside the modal while the AI is generating
- [x] Add optional custom instructions input field below the tone selector; value passed to generateFbOutreach and injected into LLM prompt as "Additional instructions from Jon"

## AI FB Outreach — Variations & Templates (v1.0.51)
- [x] Update generateFbOutreach to return 3 message variations (array) via parallel invokeLLM calls
- [x] Update modal UI to show Option 1/2/3 selector tabs; clicking a tab loads that variation into the editable textarea
- [x] Add outreach_templates table (id, name, instructions, createdAt) to schema and pushed migration (0087)
- [x] Add listOutreachTemplates, saveOutreachTemplate, deleteOutreachTemplate procedures to prospectingRouter
- [x] Add Save as template button next to custom instructions label; shows inline name input + Save button
- [x] Add Load template dropdown next to custom instructions label; lists saved templates, click to load, hover X to delete

## AI FB Outreach — Regenerate & Edit Template (v1.0.52)
- [x] Add Regenerate button next to the Option 1/2/3 variation tabs; clicking it clears variations and fires a new generateFbOutreach call (purple border, RefreshCw icon, ml-auto right-aligned)
- [x] Add updateOutreachTemplate server procedure (id, name, instructions)
- [x] Add Edit button (Pencil icon, blue hover) on each saved template row; clicking it expands an inline edit form with name + instructions inputs and Save/Cancel buttons; collapses on save or cancel

## Site Visit Request Feature (v1.0.53)
- [x] Add generateSiteVisitRequest procedure to leadsRouter: takes lead id + tone + customInstructions, uses invokeLLM to write a professional outreach message explaining a site visit is required before accurate pricing; auto-fills customer name, location, service type, notes, AI summary from lead record; includes Jon's phone number from OWNER_PHONE env
- [x] Add appendLeadNote procedure to leadsRouter: appends timestamped note to lead's notes field
- [x] Add "Site Visit Req" button (teal, Sparkles icon) to the 5-column action grid in the lead detail panel; auto-generates a Professional tone message on open
- [x] Site Visit Request modal: tone selector (Professional / Casual / Urgent), custom instructions field (Enter to regenerate), skeleton loader while generating, editable textarea, Regenerate button, Copy button, Send SMS button, Log as Contacted checkbox
- [x] On Send SMS: marks lead as contacted, appends "Site visit request sent via SMS" note to lead record

## Contact Method Tracking & Message Log (v1.0.54)
- [x] Add lead_contact_log table to schema: id, leadId, method (email|sms|phone|in_person), subject (nullable, for email), body (text — full message copy), sentAt, createdAt; pushed migration 0088
- [x] Push schema migration
- [x] Add leads.logContact tRPC procedure: inserts a contact log entry and auto-advances lead stage to "contacted" if still "new"
- [x] Add leads.getContactLog tRPC procedure: returns all log entries for a lead ordered by sentAt desc
- [x] Update sendInitialSms to insert contact log row (method: sms) after successful send; auto-advances stage
- [x] Update confirmVisit email send to insert contact log row (method: email, subject + body summary)
- [x] Add Contact Log section to lead detail panel: color-coded method badge (blue Email / green SMS / amber Phone / purple In Person), subject line, timestamp, expandable View/Hide body; empty state when no contacts yet

## ROW Linear Feet (v1.0.55)
- [x] Quote form: when service type is Right-of-Way Clearing, replace acreage selector with Corridor Length (linear feet) + Corridor Width (ft) fields
- [x] Quote form: live effective-acres calculator shown below ROW fields (LF x width / 43,560); helper text explains how to convert if customer only knows acreage
- [x] Quote form schema: added rowLinearFeet (int) and rowCorridorWidthFt (int) columns to quoteSubmissions; pushed migration 0089
- [x] Update quote confirmation screen: ROW jobs show Corridor Length in LF + Corridor Width + Effective Acres
- [x] Update owner notification email for ROW quotes to show linear feet prominently
- [x] Update customer confirmation email for ROW quotes to show linear feet
- [x] Update ops lead notes creation to show ROW linear feet instead of acreage
- [x] Update submit handler to pass rowLinearFeet and rowCorridorWidthFt to mutation and append to message field

## ROW Quote Form UX (v1.0.56)
- [x] Add tooltip helper icons (Info icon, hover popover) next to Corridor Length and Corridor Width labels explaining how to measure each
- [x] Display rough initial price range ($600–$1,100/acre, $750 min) below the ROW effective-acres calculator, with a clear disclaimer that a site visit is required for an accurate quote
- [x] ROW dimensions (LF, width, effective acres) are already appended to the ops lead notes in quoteRouter.ts; confirmed working

## ROW Quote + Outreach UX (v1.0.57)
- [x] Add "Request a Free Site Visit" button below the rough ballpark range box; clicking it smooth-scrolls to and focuses the Full Name input field
- [x] Enhance Corridor Length tooltip with inline SVG top-down corridor diagram showing a horizontal double-headed arrow labeled "Corridor Length (LF)"
- [x] Enhance Corridor Width tooltip with inline SVG top-down corridor diagram showing a vertical double-headed arrow labeled "Corridor Width (ft)"
- [x] AI FB Outreach modal already has a fully editable textarea (fbOutreachText bound to onChange); confirmed working — no change needed

## ROW Quote UX Polish (v1.0.58)
- [x] Add highlight animation (orange glow flash + box-shadow pulse, 1.4s ease-out) to Full Name input when "Request a Free Site Visit" button scrolls to it; triggers 400ms after scroll starts
- [x] Replace plain effective-acres text with inline SVG formula diagram: [LF] x [Width] / [43,560] = [acres] with orange-highlighted result box, live values
- [x] Regenerate button confirmed present in AI FB Outreach modal (added in v1.0.52, right-aligned next to Option tabs)

## Photo Upload + Map Pin Drop — Site Visit Request (v1.0.59)
- [x] Add `propertyPhotoUrls` (text, JSON array of CDN URLs, nullable) to `quoteSubmissions` schema
- [x] Add `propertyPinLat` (decimal precision 10 scale 7, nullable) to `quoteSubmissions` schema
- [x] Add `propertyPinLng` (decimal precision 10 scale 7, nullable) to `quoteSubmissions` schema
- [x] Run `pnpm db:push` to migrate schema changes
- [x] Add `quote.uploadPropertyPhoto` public tRPC mutation (base64 + mimeType → S3 CDN URL) in quoteRouter.ts
- [x] Add `propertyPhotoUrls`, `propertyPinLat`, `propertyPinLng` to quoteSchema zod input
- [x] Persist new fields in quoteSubmissions DB insert
- [x] Add photo upload UI to Quote.tsx: drag-and-drop / click-to-upload, multiple images, thumbnails with remove, uploads via tRPC, optional label
- [x] Add map pin drop UI to Quote.tsx: MapView component, click-to-drop-pin, coordinates display, optional label
- [x] Place both sections in a collapsible "Help us prepare for your visit" panel near the site visit CTA
- [x] Update owner notification email HTML to include photo thumbnail links and Google Maps URL from pin
- [x] Update owner in-app notification content to include photo count and map link
- [x] TypeScript: 0 errors (`npx tsc --noEmit`)
- [x] Save checkpoint v1.0.59

## Government/Municipal Contract Support (v1.0.60)
- [x] Add `clientType` field (enum: "residential" | "commercial" | "government") to quoteSchema zod input
- [x] Add `clientType` varchar(50) column to quoteSubmissions schema and run db:push
- [x] Add "Client Type" selector to Quote.tsx form (radio or select: Residential / Commercial / Government or Municipal)
- [x] When clientType === "government": suppress ballpark range display on form and show "Unit-price bid — site visit required" notice
- [x] Persist clientType in quoteSubmissions DB insert
- [x] Add clientType to owner notification email (Project Details table row)
- [x] Add clientType to owner in-app notification content
- [x] Add clientType to ops leads table display (badge: GOV for government leads)
- [x] Generate private rate card document (Markdown + PDF) for government/municipal work
- [x] Generate unit-price proposal template (Markdown + PDF) for government/municipal contracts
- [x] TypeScript: 0 errors
- [x] Save checkpoint v1.0.60

## Gov/Municipal UX Enhancements (v1.0.61)
- [x] Add RFP document upload field to Quote.tsx (only visible when clientType === "government")
- [x] Add uploadRfpDocument tRPC mutation (PDF/Word/etc to S3, returns CDN URL)
- [x] Add rfpDocumentUrls column to quoteSubmissions schema and run db:push
- [x] Persist rfpDocumentUrls in quoteSubmissions DB insert
- [x] Include RFP document links in owner notification email
- [x] Add GOV filter button to Ops Leads board (Leads.tsx)
- [x] Add tooltip/info icon to Government/Municipal selector button in Quote.tsx
- [x] TypeScript: 0 errors
- [x] Save checkpoint v1.0.61

## Gov/Municipal AI + UX (v1.0.62)
- [x] Add `quote.extractRfpData` server procedure: accepts array of CDN URLs, fetches each doc, runs LLM extraction for deadlines + requirements, returns structured JSON
- [x] Add GOV badge to Kanban lead cards in Leads.tsx (blue pill with Building2 icon, visible on card when clientType === "government")
- [x] Add RFP document preview panel to lead details modal: list uploaded docs with open-in-new-tab links + inline AI extraction summary (deadlines, requirements, agency, bonding)
- [x] TypeScript: 0 errors
- [x] Save checkpoint v1.0.62

## RFP Panel Enhancements (v1.0.63)
- [x] Add loading skeleton animation inside RfpDocumentPanel while AI extraction is running
- [x] Make all extracted RFP fields inline-editable (deadlines date/description, requirements list items, projectSize, issuingAgency, agencyContact, bondingInsurance items, summary)
- [x] Add "Apply to Lead" button that auto-populates lead fields from extracted data (estimatedValue from projectSize, notes from summary + agency + bonding + deadlines)
- [x] TypeScript: 0 errors
- [x] Save checkpoint v1.0.63

## RFP Confidence Scores (v1.0.64)
- [x] Extend extractRfpData LLM JSON schema to include per-field confidence scores (0-100 integer) for: summary, each deadline, projectSize, issuingAgency, agencyContact, each requirement, each bondingInsurance item
- [x] Update RfpExtraction type in Leads.tsx to include confidence fields
- [x] Add ConfidenceIndicator component: colored dot/pill (green >=80, amber 50-79, red <50) with numeric label and tooltip ("High / Review / Verify")
- [x] Render ConfidenceIndicator inline next to each editable field label
- [x] TypeScript: 0 errors
- [x] Save checkpoint v1.0.64

## On-Hold Stage on Ops Leads Board (v1.0.65)
- [x] Audit STAGES array and DB stage enum/varchar in opsLeads schema
- [x] Add "on_hold" to the STAGES array in Leads.tsx with label "On Hold" and subtitle "Waiting on customer"
- [x] Add "on_hold" to DB mysqlEnum in opsLeads schema and run db:push
- [x] Drag-and-drop onDrop handler accepts "on_hold" as a target stage (uses KANBAN_STAGES loop)
- [x] Stage change button in lead detail panel includes On Hold
- [x] TypeScript: 0 errors
- [x] Save checkpoint v1.0.65

## Weigh Station Data Layer (Jul 17, 2026)
- [ ] Build weighStationsRouter.ts: Overpass API query for real DOT weighbridge nodes along route corridor, filtered to exclude CAT Scales
- [ ] Build coopsareopen.com scraper: per-state page scrape for highway/direction/mile-marker context
- [ ] Build tRPC procedure: getWeighStations(bbox) — returns merged OSM + coopsareopen data
- [ ] Update WeighStationPlanner: replace current hardcoded/placeholder station data with real tRPC data
- [ ] Update WeighStationPlanner markers: use real coordinates, show highway/direction/mile-marker, remove fake open/closed status
- [ ] Add "Live status unavailable — check PrePass or Trucker Path" note to each station card

## Weigh Station Data Layer — July 2026

- [x] Replace hardcoded weighStationData.ts (39 manually entered stations) with live Overpass API data: query amenity=weighbridge nodes within route bounding box, filter out commercial CAT Scales, 6-hour in-memory cache
- [x] Remove fake open/closed status from WeighStationPlanner UI: drop showOpenOnly filter, statusBadge/statusLabel/getStationStatus dead code, coopsareopen.com attribution
- [x] Update WeighStationPlanner map legend: single amber marker for DOT weigh station, note that live status is not publicly available
- [x] Update station card expanded section: replace prepassEligible display with "check PrePass or Trucker Path app" note
- [x] Update header description to reflect OSM data source
- [x] Fix UNKNOWN direction badge: hide direction badge when direction is UNKNOWN instead of showing orange badge

## Gov Contracts Geographic Filter — July 2026

- [x] Server: restrict federal contracts to TN, southern KY (counties within ~100mi of Vanleer), northern AL, and AR only — replace the current "150 miles of Vanleer" radius with explicit state allowlist
- [x] Server: add stateFilter input param to govContracts.search procedure so the UI can filter by state server-side
- [x] UI: add State filter/sort dropdown to Federal contracts tab (All States / TN / KY / AL / AR)
- [x] UI: update subtitle from "150 miles of Vanleer" to reflect the actual state coverage

## AI Visibility — FAQ Pages & Directory Copy — July 2026

- [x] Create /resources/faq page with structured Q&A: what is forestry mulching, cost factors, best time of year, mulching vs bush hogging, what is included/excluded, how long does it take (already exists at /faq with 23 Q&As and FAQPage JSON-LD schema)
- [x] Add FAQ page to Navbar Resources dropdown and sitemap (already in place)
- [x] Create directory listing copy package document (Markdown): business description variants (short/medium/long), service list, keywords, GBP Q&A set, review request SMS/email template

## AI Visibility Technical Improvements — July 2026

- [x] Update robots.txt: allow GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended
- [x] Create llms.txt at site root: business description, services, service area, contact info, key page URLs
- [x] Expand LocalBusiness JSON-LD schema: add 35-county areaServed array, hasOfferCatalog with service types
- [x] Add Service JSON-LD schema to each primary service page (ForestryMulching, LandManagement, BrushHogging)
- [x] Audit image alt text across Gallery, HeroSection, and service pages for descriptive location+service keywords

## Map Drawing + Deposit Collection (LandWorkPro Parity) — July 2026

### Feature 1: Draw Work Area on Satellite Map
- [x] CostEstimator: add "Draw Work Area" panel below the address/satellite section using Google Maps Drawing Manager (polygon tool)
- [x] Auto-calculate acreage from drawn polygon using Google Maps geometry library, populate acreage field
- [x] Capture drawn polygon as a static satellite map screenshot URL (Google Static Maps API with polygon overlay)
- [x] Store drawn polygon coordinates and map screenshot URL in estimate result
- [x] Display drawn map thumbnail in the satellite analysis box (replaces AI thumbnail when polygon is drawn)
- [x] When saving estimate to lead, attach polygon coordinates and map URL to the lead record
- [ ] Add mapPolygon and mapScreenshotUrl fields to opsLeads schema and run db:push

### Feature 2: Stripe Deposit Collection via Quote
- [x] Add "Collect Deposit" button to CostEstimator result card
- [x] Create opsRouter.createQuotePayment procedure: takes estimate data, deposit amount (%), creates Stripe Checkout Session with line items matching the estimate, returns checkout URL
- [x] Deposit amount selector: 25%, 33%, 50%, or custom dollar amount
- [x] Checkout session metadata: job type, total price, deposit amount, client name, phone
- [x] Success/cancel URLs: redirect to /ops/cost-estimator with status param
- [ ] After payment: webhook updates lead stage to "proposal_sent" and records deposit amount
- [x] Add "Send by SMS" option: checkbox + phone field in deposit dialog, sends Twilio SMS with payment link
- [ ] Add depositAmount and depositPaidAt fields to opsLeads schema

## Native Client Quote Portal (Jobber Replacement) — Jul 2026

- [x] Schema: add portalToken, clientAction, clientActionAt, depositPaidCents, depositPaidAt, depositSessionId, portalViewedAt fields to distanceQuotes
- [x] Run db:push to apply schema migration (0095)
- [x] Server: quotePortalRouter — public getByToken procedure (marks portalViewedAt on first view, notifies owner)
- [x] Server: quotePortalRouter — clientAction procedure (approve/decline, updates status, sends confirmation email, notifies owner)
- [x] Server: quotePortalRouter — createDepositSession procedure (Stripe Checkout Session for client deposit, stores depositSessionId)
- [x] Server: wire quotePortalRouter into routers.ts as quotePortal
- [x] Server: sendPortalLink procedure in distanceQuotesRouter (crypto token, branded email via Resend, marks quote sent)
- [x] Server: buildPortalEmail HTML email template (Noland Earthworks branded, CTA button, optional note)
- [x] Frontend: /quote/:token public portal page (QuotePortal.tsx) — full quote view, approve/decline, deposit payment
- [x] Frontend: Send Portal Link button in /ops/quotes Quotes.tsx with optional note field and confirm flow
- [x] Frontend: portal status indicators in quote card (Viewed date, Approved/Declined badge, Deposit paid badge, Copy link button)
- [x] Frontend: App.tsx route /quote/:token registered as public lazy route

## Quote Portal Enhancements — Jul 2026

- [x] Schema: add signatureDataUrl (text), signedAt (timestamp), changeRequestNote (text), changeRequestAt (timestamp) to distanceQuotes
- [x] Run db:push for new schema fields
- [x] Server: update quotePortalRouter clientAction to accept and store signatureDataUrl + signedAt
- [x] Server: add quotePortalRouter requestChanges procedure (stores note, notifies owner, sends client acknowledgement email)
- [x] Frontend: digital signature pad canvas in QuotePortal approve flow (draw signature before confirming approval)
- [x] Frontend: Request Changes button and form in QuotePortal (text area for client to describe requested changes)
- [x] Frontend: PDF download button on QuotePortal (print-optimized CSS, window.print() with print stylesheet)
- [x] Frontend: show signature thumbnail in Quotes.tsx ops card when quote is signed (signedAt date shown in portal status)

## Dynamic Add-ons Manager + Quoting Overhaul

- [ ] Schema: create portalAddOnOptions table (id, label, description, estimateCents, sortOrder, isActive, createdAt)
- [ ] Server: add portalAddOns CRUD router (list, create, update, delete, reorder) — ownerProcedure
- [ ] Server: add public getAddOns procedure to quotePortalRouter (returns active add-ons for portal display)
- [ ] Seed: insert the three default add-on options on first run if table is empty
- [ ] Frontend: Add-ons Manager panel in /ops/quotes settings panel
- [ ] Frontend: QuotePortal fetches add-ons dynamically from DB instead of hardcoded PORTAL_ADD_ONS array
- [ ] Phase 2: Add Send Portal Link button to website quote request cards in Quotes.tsx
- [ ] Phase 2: Add Send Portal Link button to field quote cards in Quotes.tsx
- [ ] Phase 3: Native quote creation modal in Quotes.tsx — Jobber-style line items (service, description, qty, unit price, total)
- [ ] Phase 3: Edit, duplicate, and convert-to-job actions on native quotes
- [ ] Phase 4: Rename Jobber Quotes tab to All Quotes, merge all quote types into one unified list
- [ ] Phase 4: Remove hard dependency on Jobber for primary quote list view

## Native Quoting System — Phase 3 & 4 Complete (Jul 2026)
- [x] Schema: nativeQuotes table (clientName, clientEmail, clientPhone, propertyAddress, title, lineItems JSON, totalCents, serviceType, acreage, estimatedDuration, clientMessage, internalNotes, status, portalToken, portalSentAt, portalViewedAt, clientAction, clientActionAt, signatureDataUrl, signedAt, depositPaidCents, depositPaidAt, convertedJobId, convertedToJobAt, createdAt, updatedAt)
- [x] Run db:push for nativeQuotes table (TiDB-compatible migration)
- [x] Server: nativeQuotesRouter — list, create, update, delete, duplicate, sendPortal, convertToJob, createDepositSession (all ownerProcedure)
- [x] Server: nativeQuotesRouter wired into routers.ts as nativeQuotes namespace
- [x] Frontend: NativeAllQuotesSection.tsx — full quote management UI (search, status filter, create/edit modal with line items, duplicate, delete, send portal, collect deposit, convert to job, portal status badges)
- [x] Frontend: All Quotes tab added to Quotes.tsx as default tab (NativeAllQuotesSection), Jobber tab retained as secondary
- [x] TypeScript: 0 errors

## AI Suggest in Quote Modal (Jul 2026)
- [x] Server: nativeQuotes.aiSuggest procedure — takes serviceType, acreage, terrain, density, access, notes; returns title, estimatedDuration, clientMessage, lineItems, totalCents using LLM with TN market rate context
- [x] Frontend: AI Suggest panel in QuoteFormModal (collapsible, amber-themed) — terrain/density/access selectors, Generate button, auto-fills title + line items + duration + client message on success
- [x] TypeScript: 0 errors

## SEO Audit Implementation (Jul 2026)
- [x] SEO: Fix double H1 — convert hidden static SEO block H1 to H2 (visible HeroSection already has the H1)
- [x] SEO: Add HowTo schema to index.html for the 3-step forestry mulching process
- [x] SEO: Add Person schema for Jon M. Noland to index.html (E-E-A-T + AI entity)
- [x] SEO: Add Person schema useEffect to About.tsx with @id anchor for entity linking
- [x] SEO: Add @id reference to Person author entity in BlogPostLayout.tsx to link all blog posts to the About page entity
- [x] SEO: Fix sitemap lastmod — use per-page dates for homepage, About, and cost post; raise About priority to 0.7
- [x] SEO: Expand cost blog post (CostOfLandClearing.tsx) from 56 lines to comprehensive cost factors guide targeting AI citation queries
- [x] SEO: Rewrite thin Wilson County blog post with substantive county-specific content
- [x] SEO: Rewrite thin Montgomery County blog post with substantive county-specific content
- [x] SEO: Rewrite thin Sumner County blog post with substantive county-specific content

## Quote Portal Fix — Native Quote Token Resolution
- [x] Add getByToken public procedure to nativeQuotesRouter
- [x] Add portalAction public procedure to nativeQuotesRouter (approve/decline/changes)
- [x] Add publicDepositSession public procedure to nativeQuotesRouter (Stripe, no auth)
- [x] Create NativeQuotePortal.tsx — dedicated portal page for native quotes
- [x] Add QuotePortalRouter to App.tsx — auto-detects native vs legacy quote by token
- [x] TypeScript: 0 errors

## Portal Fix + AI Suggest Breakdown Enhancements
- [x] Fix /quote/:token portal — route was pointing to old QuotePortal instead of QuotePortalRouter
- [x] Wire QuotePortalRouter into App.tsx /quote/:token route (native first, legacy fallback)
- [x] Add editable terrain and access multipliers to AI Suggest breakdown panel
- [x] Add info tooltips to terrain and access multipliers explaining how values are determined
- [x] Add copy-to-clipboard button for the full price breakdown
- [x] Recalculate line item prices proportionally when multipliers are edited before applying
- [x] Reformat All Quotes section to match Jobber section layout (table + slide-out detail panel)
- [x] Fix portal token routing — QuotePortalRouter now wired to /quote/:token in App.tsx
- [x] Add importFromJobber procedure to nativeQuotesRouter (fetches all Jobber quotes, maps to native schema, idempotent)
- [x] Add Import Jobber button to All Quotes header — one-click migration with toast feedback

## Website Quote Request → All Quotes Routing
- [x] Auto-insert native quote (status: web_request) on every website form submission
- [x] Add Web Requests filter pill to All Quotes section
- [x] Add cyan Web Request status badge
- [x] Server-side list procedure already supports exact status filter — web_request works

## Jobber Removal — Native System Completion
- [x] Item 1: Web Requests review panel — Convert to Quote quick-action in All Quotes detail panel
- [x] Item 5: Fix notification email CTA to point to All Quotes instead of Jobber
- [x] Item 2: Native Jobs section — DB schema (nativeJobs table), server procedures, Jobs tab in Ops
- [x] Item 3: HTML invoice generation from completed job, emailed to client (stored in S3, opens in browser)
- [x] Item 4a: Native Clients tab in Ops backed by database
- [x] Item 4b: Native Jobs tab in Ops backed by database (using nativeJobs table)
- [x] Item 4c: Native Invoices tab in Ops backed by database

## Native Clients, Invoices Tab, and Jobs CSV Export (Jul 2026)
- [x] Schema: nativeClients table (name, email, phone, address, notes, jobCount, totalSpentCents, createdAt, updatedAt)
- [x] Run db:push for nativeClients table
- [x] Server: nativeClientsRouter — list, getById, update, delete, upsertFromJob (auto-sync when job is created/updated)
- [x] Server: nativeClientsRouter wired into routers.ts as nativeClients namespace
- [x] Frontend: NativeClientsSection.tsx — table + slide-out detail panel (contact info, job history, total spent, notes, delete)
- [x] Frontend: Clients tab added to Quotes.tsx (Ops page)
- [x] Server: nativeJobs.listInvoices already exists — expose all invoices with job context
- [x] Frontend: NativeInvoicesSection.tsx — all invoices table (invoice #, client, amount, status, date, view/mark paid actions)
- [x] Frontend: Invoices tab added to Quotes.tsx (Ops page)
- [x] Frontend: CSV export button in NativeJobsSection — exports filtered jobs list as downloadable CSV
- [x] TypeScript: 0 errors
- [x] Tests: vitest coverage for nativeClientsRouter

## Jobber Removal — Close Feature Gaps (2026-07-28)

- [x] Gap 1: Satellite imagery strip in NativeQuoteDetailPanel (wire trpc.ops.quotes.satelliteImage using quote.propertyAddress)
- [x] Gap 2: Update getStaleQuotes to query nativeQuotes (portalSentAt > 7 days, no clientAction) and add Quotes Needing Follow-Up panel to NativeAllQuotesSection
- [x] Gap 3: Add Link to Lead to NativeQuoteDetailPanel (add nativeQuoteId support to linkQuoteToLead procedure)
- [x] Gap 4: Add Quote # column (display #id) to All Quotes table
- [x] Gap 5: Add Restore to Draft action for cancelled quotes in NativeQuoteDetailPanel
- [x] Gap 6: Render changeRequestNote, declineNote, signatureDataUrl/signatureTypedText/signedAt in NativeQuoteDetailPanel body

## Jobber Removal — Full /ops Cleanup (2026-07-28)
- [x] Remove Jobber tab from /ops/quotes (TabsTrigger + TabsContent + related state)
- [x] Remove Jobber data queries from Dashboard.tsx (replace with nativeJobs.list, nativeQuotes.list)
- [x] Remove Jobber quoteDetail query from Leads.tsx (replace with nativeQuotes.getById)
- [x] Remove Jobber jobs query from Schedule.tsx (replace with nativeJobs.list)
- [x] Rebuild Jobs.tsx using nativeJobs data
- [x] Rebuild Clients.tsx using nativeClients data
- [x] Rebuild Invoices.tsx using nativeInvoices data
- [x] Update sidebar: redirect Jobs entry to /ops/quotes, redirect Clients entry to /ops/quotes
- [x] Add Field Fix to sidebar under Field Work
- [x] Add Tasks to sidebar under Field Work or Business
- [x] Add Prospecting to sidebar under Sales
- [x] Add Payments to sidebar under Sales or Business
- [x] TypeScript: 0 errors after all changes

## Tasks Page Improvements (Jul 28, 2026)
- [x] Add search bar to /ops/tasks (client-side filter by title/description)
- [x] Add relatedType filter dropdown to /ops/tasks (shows types from existing tasks)
- [x] Add "Add Task" button and modal to /ops/tasks for manual task creation
- [x] Add tasks.create tRPC procedure to tasksRouter (title, description, dueAt, relatedType, relatedId)
- [x] Clicking relatedType badge on a task filters the list to that type
- [x] Clear filters button shown when search or type filter is active
- [x] quoteRouter.ts: remove Jobber sync block and createJobberRequest/isJobberConnected import

## Web Requests Delete (Jul 29, 2026)
- [x] Add delete button (trash icon) to each Web Request card in /ops/quotes Website Requests panel
- [x] Calls trpc.ops.quotes.delete mutation with confirmation dialog
- [x] Refreshes the list on success with toast notification

## Clients List Improvements (Jul 29, 2026)
- [x] Auto-upsert client when lead comes in (quoteRouter, contactRouter, chatRouter)
- [x] Auto-upsert client when quote is created (nativeQuotesRouter)
- [x] Add upsertNativeClient helper to db.ts
- [x] Add syncFromLeads procedure to nativeClientsRouter
- [x] Add syncFromQuotes procedure to nativeClientsRouter
- [x] Add create procedure to nativeClientsRouter (manual add)
- [x] Add Client modal with name/phone/email/address/notes fields
- [x] Sync from Leads toolbar button (Users icon)
- [x] Sync from Quotes toolbar button (FileText icon)
- [x] Sync from Jobs toolbar button (RefreshCw icon)
- [x] Delete client from detail panel (existing, confirmed working)
- [x] Edit client from detail panel (existing, confirmed working)

## Client Detail Panel & CSV Export (Jul 29, 2026)
- [x] Expand getById to return associated quotes and leads alongside jobs
- [x] Client detail panel: 4-tab layout (Overview, Quotes, Jobs, Leads/Interactions)
- [x] Overview tab: contact info, notes, latest quote summary
- [x] Quotes tab: all associated quotes with status, amount, date
- [x] Jobs tab: all associated jobs with status, amount, date
- [x] Leads tab: all associated lead records with stage, AI score, source
- [x] Stats row: job count, quote count, total spent
- [x] Add exportCsv procedure to nativeClientsRouter
- [x] CSV export button in toolbar (downloads client list as .csv)
- [x] Update nativeClients.test.ts schema mock to include nativeQuotes and opsLeads

## Prospecting Page Improvements (Jul 29, 2026)
- [x] Expand scan prompt with additional keywords: cedar thicket, brush removal, pasture reclamation, fence line clearing, overgrown lot
- [x] Add Craigslist markets: Memphis, Knoxville, Chattanooga, Clarksville (in addition to Nashville)
- [x] Add AI fit scoring (fitScore 1-10) to scan prompt output
- [x] Add fitScore column to prospectingLeads schema and run migration
- [x] Update postback endpoints to store fitScore from scan results
- [x] Add fitScore badge to each prospect card (color-coded: green 9-10, emerald 7-8, yellow 5-6, gray 1-4)
- [x] Add "Fit Score" sort option to sort dropdown
- [x] Add "Run Scan" button to Prospecting page header for manual on-demand scans
- [x] Update info banner to reflect expanded scan coverage
- [x] Prospecting: add minimum fit score filter to hide low-fit prospects
- [x] Prospecting: add Convert to Client action on prospect cards
- [x] Prospecting: add last-scan new prospects badge/counter on the Prospecting page
- [x] Prospecting: color-coded card borders based on fit score (green 8+, yellow 6+, default otherwise)
- [x] Prospecting: confirmation modal with prospect summary before Convert to Client finalizes
- [x] Prospecting: batch-select checkboxes to convert multiple prospects to clients simultaneously
- [x] Prospecting: Undo option in batch convert-to-clients toast (delete the created client records)
- [x] Prospecting: show contact info (email/phone) in the Convert to Client confirmation modal
- [x] Prospecting: fit score color-tier filter (All / Green 8+ / Yellow 6+ / Unscored)

## Blog Enhancements + TS Fixes (Jul 2026)
- [x] Fix TS error: nativeJobsRouter.ts — nativeJobs and nativeInvoices not exported from drizzle/schema (stale tsc watch; tsc --noEmit is clean)
- [x] Fix TS error: opsRouter.ts — nativeQuoteId property missing on opsLeads table type (stale tsc watch; tsc --noEmit is clean)
- [x] Build AuthorBio component (photo, name, title, bio, link to About page)
- [x] Add AuthorBio to BlogPostLayout so it appears at the bottom of all blog posts
- [x] Add sticky table of contents to CostOfLandClearing.tsx for the expanded guide

## Prospecting Filter Improvements (Jul 2026)
- [x] Prospecting: add Low/Medium/High urgency filter dropdown to filter toolbar
- [x] Prospecting: add stale post auto-hide (hide posts older than 30 days — on by default, toggle to show all)

## Quote AI Pricing + Map (Jul 2026)
- [x] Quotes: run incoming web quote requests through AI to generate an initial price estimate before they land in All Quotes (already implemented — ballparkRange parsed into totalCents + line items on native quote creation)
- [x] Quotes: add map feature to the Website Requests section of /ops/quotes (satellite thumbnail via pin coords or address geocode, expandable per card)

## Quote Card Enhancements (Jul 2026)
- [x] Quotes/WebReq: replace static satellite thumbnail with interactive embedded Google Map (zoom/pan) in each website request card
- [x] Quotes/WebReq: display AI qualification score and summary on the card face (not hidden in internal notes)
- [x] Quotes/WebReq: add inline edit button to manually override the AI-generated estimate (price + line item description)
- [x] DB migration: nativeQuoteId column added to quote_submissions table (applied via webdev_execute_sql)
- [x] quoteRouter: capture insertId from quoteSubmissions insert and link back to native quote via nativeQuoteId
- [x] AI score badge: fixed enum values (strong/marginal/weak) to match backend schema (was incorrectly using hot/warm)

## Quote Status Management (Jul 2026)
- [x] Quotes: add inline status selector to the quotes table row (Status column) so Jon can change a quote's status without opening the detail panel
- [x] Quotes: add status selector to the NativeQuoteDetailPanel footer so status is editable from the slide-out panel

## Quote Pipeline / Status Flow (Jul 2026)
- [x] Quotes: define canonical status order: Web Request → Draft → Sent → Approved → Converted/Invoiced (Declined/Cancelled as terminal off-ramps)
- [x] Quotes: replace flat table view with a status-pipeline view — quotes grouped and sorted by stage, with stage headers showing counts and next-step arrows
- [x] Quotes: restrict status dropdown to valid next/previous transitions only (pipeline row uses "Move to…" with only valid next steps; detail panel shows stage buttons for valid transitions only)
- [x] Quotes: stage headers show description and valid next stages with arrow indicator

## Quote Flow Audit Fixes (Jul 2026)
- [x] Backend list filter sends statusFilter to DB but pipeline stages are derived from multiple fields (clientAction, portalSentAt, depositPaidAt, convertedToJobAt) — fixed: always fetch all quotes (status=all, limit=500) and filter client-side
- [x] Moving a quote to "approved" or "declined" via the Move dropdown only sets status column, but getStageKey reads clientAction for those stages — fixed: update mutation now also sets clientAction/clientActionAt when status is approved/declined, and clears them when restoring to draft
- [x] Stripe deposit webhook never updates native_quotes.depositPaidAt/depositPaidCents — fixed: stripeWebhookRoutes.ts now checks metadata.native_quote_id and updates depositPaidAt/depositPaidCents/stripeSessionId/status/clientAction on native quote
- [x] portalAction (client approve/decline) does not update the status column — fixed: portalAction now syncs status to approved/declined when clientAction is set
- [x] "Restore to Draft" clears clientAction via the update mutation fix above
- [x] Duplicate quote was copying portal lifecycle fields — fixed: duplicate now only copies content fields, all lifecycle fields are intentionally omitted
- [x] getStageKey and StatusBadge updated to check both status column AND lifecycle fields so classification is correct regardless of which path set the state

## Quote UI Enhancements (Jul 2026 — Round 2)
- [x] Quote detail panel: add visual lifecycle timeline showing Created, Sent, Viewed, Approved/Declined, Deposit Paid, Converted with exact timestamps
- [x] Pipeline quote cards: add copy-portal-link quick action button on cards that have a portalToken (sent quotes)
- [x] Pipeline stage column headers: display total monetary value (sum of totalCents) for all quotes in that stage

## Quote Pipeline Filters (Jul 2026)
- [x] Pipeline view: add min/max dollar value filter inputs to the filter bar
- [x] Pipeline view: add date-from / date-to filter inputs (date created range) to the filter bar
- [x] Pipeline view: apply both filters client-side in pipelineGroups so they stack with search and status filter
- [x] Pipeline view: add a "Clear Filters" button that appears when any non-default filter is active

## Parcel Lookup Fix (Jul 2026)
- [x] Property address lookup returning "Parcel not found" for valid TN addresses — root cause: GET request with JSON geometry in URL silently rejected by ArcGIS when URL is too long; fixed by switching to HTTP POST with form-encoded body and a 30-metre bounding-box envelope instead of a point query
- [x] Web Mercator Y conversion formula was incorrect (used tan approximation instead of the correct sinLat formula) — fixed
- [x] Multiple parcels in envelope: added best-match selection logic (address string match first, largest acreage as tiebreaker) so the correct parcel is returned when the buffer clips a neighbor

## Pipeline View Enhancements Round 3 (Jul 2026)
- [x] Pipeline: add dollar value range filter (min/max) and date created range filter to the filter bar
- [x] Pipeline: add sort control — order by highest value (totalCents desc) or newest first (createdAt desc)
- [x] Pipeline: add summary bar at the top showing total dollar value of all currently visible quotes

## Bug Fixes (Jul 2026)
- [x] Fix: converted quotes not appearing in /ops/jobs Jobs section
- [x] Fix: Schedule page drag-and-drop not working to schedule jobs
- [x] Leads Reach Out: use AI to auto-generate a personalized outreach message when the dialog opens
- [x] Noland Field mobile app: add AI pricing estimate to NewQuote form matching website CostEstimator inputs and logic
- [x] /ops/quotes: add Field Quotes section below Website Requests showing companion app submissions
- [x] Field Quotes detail dialog: add Convert to Quote / Convert to Job button
- [x] Field Quotes detail dialog: add Email and SMS buttons to send AI draft response to prospect
- [x] Field Quotes list: add sort control (by date, acreage, AI score)
- [x] Noland Field companion app: add Google Places address autocomplete to the Site Location field in NewQuote
- [x] /ops/quotes: auto-refresh all quote sections (Website Requests, Field Quotes) on a polling interval so new submissions appear without a manual page refresh
- [x] Noland Field companion app: fix GPS button to reverse-geocode coordinates into a formatted address using tRPC client (was using broken raw fetch with relative URL)
- [x] Noland Field companion app: show a small static map preview below the address field once lat/lng is determined (GPS or autocomplete selection)
- [x] Companion app map: make preview interactive with draggable pin to adjust GPS coordinates
- [x] Companion app map: tap preview to open location in device native maps app
- [x] Companion app map: save map snapshot URL with submitted quote so it shows on /ops/quotes Field Quotes section
- [x] Companion app map: reverse-geocode new coordinates when pin is dragged to update the address field
- [x] Companion app map: forward-geocode address edits to move the map pin when address is typed/edited
- [x] /ops/quotes Field Quotes: clicking the map snapshot opens a larger interactive map modal

## Voice-to-Bid — Cost Estimator

- [x] Voice-to-bid: Add mic button to Cost Estimator using Web Speech API for voice input
- [x] Voice-to-bid: Add server-side LLM parser (parseVoiceBid) to extract service, acreage, terrain, density, access, client name from spoken description
- [x] Voice-to-bid: Wire parsed fields into Cost Estimator form auto-fill with visual confirmation
- [x] Voice-to-bid: Show transcript and parsed field summary before applying to form
- [x] Calculator: Add "Request Site Visit" button below the detailed breakdown
- [x] Calculator: Add tooltips on density and terrain multiplier rows explaining calculation
- [x] Calculator: Add "Email me this breakdown" option with email input
- [x] Client autocomplete dropdown on New Quote form — search existing clients, autofill name/email/phone/address, New Client option
- [x] Auto-save new client to DB on quote submit; update existing client if info changed
- [x] Allow editing autofilled client fields (email, phone) in New Quote form
- [x] Show client summary panel (past quotes, total spent, last quote) when existing client selected

## Priority Fixes — Aug 2026 Review

- [x] Fix stats bar: 12 → 35 Counties Served, 12hr → 24hr Quote Turnaround
- [x] Add review count to stats bar (display actual Google review count next to 4.9★)
- [x] Add project count stat to stats bar (e.g. "35+ Projects")
- [x] Add /services/site-preparation route and page (currently missing from App.tsx)
- [x] Build public /reviews page aggregating Google reviews
- [x] Move Ops link out of public nav (hide from non-authenticated users — already gated by isOwner check, no change needed)
- [x] Add email capture section to homepage and/or pricing page footer

## Social Sharing & Partners — Aug 2026
- [x] Build reusable ShareButtons component (Facebook, X, LinkedIn, copy link)
- [x] Integrate ShareButtons into BlogPostLayout
- [x] Integrate ShareButtons into ServicePageLayout
- [x] Add Share This Page feature to CountyPageLayout
- [x] Build Partners & Affiliations section on homepage

## Dynamic SEO Features — Aug 2026
- [x] Dynamic XML sitemap: auto-include published seoArticles from DB
- [x] Dynamic blog route /blog/:slug that renders published seoArticles from DB
- [x] Blog index page shows DB-published articles alongside hardcoded posts (dynamic route handles them)
- [x] Service page FAQ: add serviceFaqs table and dynamic FAQ loading per service (table created, public procedure added)
- [x] /ops blog management: existing Seo.tsx already has full article management
- [x] Fix publishSeoArticle: dynamic /blog/:slug route reads from DB, no file writes needed
- [x] Update sitemap to query DB for published articles dynamically

## AI Features — Aug 2026
- [x] Review request: trigger on paidDate+48h instead of completedDate, add sentiment filter
- [x] AI proposal draft: draftProposalFromLead already built in aiAutomationRouter (confirmed working)
- [x] AI photo captioning: generatePhotoCaption procedure added, AI caption button in gallery upload UI

## Lead Visibility Dashboard — Aug 2026
- [x] Add getLeadVisibilityData procedure to opsRouter (monthly lead/quote volume, source breakdown, AI score breakdown)
- [x] Build /ops/lead-visibility page with charts and seasonal context
- [x] Add Lead Visibility nav item to OpsDashboardLayout

## AI Visibility Score Improvements — Aug 2026
- [x] Add 4 new audit prompts: West Tennessee local service (2), additional branded (1), additional use case (1), additional competitor (1)
- [x] Replace keyword-based mention detection with structured JSON analysis (Grok reasons about whether business was mentioned)
- [x] Recalibrate scoring formula: weighted by category (branded 40%, local 35%, use case 25%) with quality bonus
- [x] Add region field to prompts for better reporting context

## Gov Contracts Enhancements — Aug 2026
- [x] Fit Score algorithm on SAM.gov opportunities (NAICS, set-aside, geography, size, deadline)
- [x] Recommendation badges: Recommended / Good Fit / Review / Low Fit on each opportunity
- [x] Sort by fit score by default
- [x] One-click Open on SAM.gov button on each opportunity card
- [x] Pre-submission checklist modal (SAM.gov registration, CAGE code, certifications)

## Completed-Job Final Invoice — Aug 2026
- [x] Add a final-payment invoice action for completed jobs that calculates the unpaid balance and emails the customer
- [x] Show final-invoice status and payment tracking on completed job records

## AI Chat Quote Discounts — Aug 2026
- [x] Add Military/Veteran and First-Time Customer discount suggestions to AI Chat quote guidance

## API Response Error — Aug 2026
- [x] Trace and fix the tRPC request that receives HTML instead of JSON in the web preview

## Full AI, Lead Generation & Customer Interaction Audit — Aug 2026
- [x] Inventory public-site conversion paths, /ops workflows, and all live AI integrations
- [x] Research current local-service lead generation, customer experience, and AI/AEO practices
- [x] Deliver a prioritized, research-backed improvement plan for AI, lead generation, and customer interaction

## Reusable Audit Skill — Aug 2026
- [x] Create and validate a reusable AI, lead-generation, customer-interaction, and AEO audit skill

## 7/30/90-Day Audit Action Plan — Aug 2026
- [x] Run the reusable audit skill and deliver an updated 7/30/90-day action plan

## 7-Day Quick Wins & 30-Day Milestone Tracking — Aug 2026
- [x] Replace unsupported review fallback cards with an honest verified-review state
- [x] Add a daily Today’s Next Actions queue for lead, quote, invoice, and review follow-through
- [x] Add quote follow-up status and editable 2-business-day / 7-day outreach actions
- [x] Align the quote form’s minimum-job language with its acreage options and active discount copy
- [x] Add automated 30-day lead-generation milestone tracking for source, response, quote, and review metrics

## Google Places Reviews Repair — Aug 2026
- [x] Restore verified Google Places lookup and live review retrieval on the public website

## Comprehensive Current-Site Audit — Aug 2026
- [x] Audit the public website, /ops workflows, conversion paths, SEO/AEO, trust signals, and AI features
- [x] Deliver prioritized recommendations for what to improve, add, consolidate, and remove

## Audit-Fix Release — Aug 2026
- [x] Remove the unsupported 4.9 Google Rating claim and rename Testimonials paths to verified project-proof language
- [x] Consolidate public and gallery service names into the approved service taxonomy
- [x] Repair stale-lead, quote-send, KPI formatting, and lead-service data workflows

## Lead Form Validation & Gallery Loading — Aug 2026
- [x] Add inline client-side validation for complete public lead contact information
- [x] Add visual image-loading states to the public Our Work gallery

## Lead Capture Success Experience — Aug 2026
- [x] Add a clearer confirmation message and smooth transition after public lead-form submission

## Lead Capture Navigation & Gallery Interaction — Aug 2026
- [x] Add homepage and services navigation actions to the quote success panel
- [x] Format public quote phone numbers in real time for consistent entry
- [x] Add subtle interactive hover motion to public Our Work gallery images

## Lead Message Guidance & Post-Submit Engagement — Aug 2026
- [x] Add helpful message-field placeholder text and a live character counter to the public quote form
- [x] Add verified FAQ content below the public quote success message

## Quarter-Acre Quote Slider — Aug 2026
- [x] Replace the public quote form acreage selector with a 0.25–40 acre slider in 0.25-acre increments

## Color-Coded Map Drawings — Aug 2026
- [x] Assign distinct, stable colors to individual drawn map areas and paths
- [x] Mirror each drawing color in the matching measurement-list row
- [x] Preserve selection and edit clarity across colored map overlays

## Color-Coded Map Drawings — Aug 2026
- [x] Assign distinct, stable colors to individual drawn map areas and paths
- [x] Mirror each drawing color in the matching measurement-list row
- [x] Preserve selection and edit clarity across colored map overlays

## Parcel-Adjusted Acreage Behavior — Aug 2026
- [x] Preserve customer-selected approximate acreage and copy it into Adjusted Acreage after parcel lookup

## Acreage Guidance & Dynamic Estimate — Aug 2026
- [x] Add an Adjusted Acreage tooltip explaining the customer work-area value versus full parcel size
- [x] Keep Adjusted Acreage manually editable after parcel lookup
- [x] Add a real-time price preview that updates with selected or adjusted acreage

## Animated Quote Range & Parcel Reset — Aug 2026
- [x] Add a smooth rolling animation to live preliminary price changes
- [x] Add an Adjusted Acreage reset control that restores the detected full parcel size

## Multi-Service Quote Range — Aug 2026
- [x] Add multi-select service controls to the public quote form and calculate a combined preliminary range

## Combined Acreage and Linear-Footage Quote Range — Aug 2026
- [x] Add linear-footage inputs for selected right-of-way and trail-cutting services
- [x] Include acreage and linear-footage services in one combined preliminary range
- [x] Show a visual per-service estimate contribution breakdown in the quote summary

## Measurement Units & Estimate Explanation — Aug 2026
- [x] Add miles and linear-feet toggles to right-of-way and trail measurements
- [x] Keep linear-footage estimates synchronized when measurement units change
- [x] Add hover tooltips explaining each service contribution calculation

## Terrain Adjustment & Quote Reset — Aug 2026
- [x] Add a terrain-difficulty dropdown to the public quote calculator
- [x] Apply terrain difficulty to preliminary ranges and visual breakdown calculations
- [x] Add a clear-all action that resets the quote calculator inputs

## Dynamic Recommendations & Address Autocomplete — Aug 2026
- [x] Add terrain- and acreage-based recommended service suggestions to the public quote form
- [x] Allow recommended services to be added directly to the calculator selection
- [x] Improve property address autocomplete selection and completion of street, city, state, ZIP, and county fields

## Selected Property Map — Aug 2026
- [x] Add a compact interactive map with a property pin after address selection
- [x] Synchronize the map pin and center with autocomplete address changes
- [x] Verify the selected-address map interaction on the public quote form

## Satellite View & Adjustable Property Pin — Aug 2026
- [x] Add a satellite imagery toggle to the selected-property map
- [x] Enable dragging the property pin to refine rural site placement
- [x] Retain adjusted pin coordinates with the submitted quote request

## Map Measurements & Project Timeline — Aug 2026
- [x] Add polygon and path drawing tools to the selected-property map
- [x] Calculate acres or linear feet from the completed drawing and apply it to the relevant quote measurement
- [x] Retain map-derived measurement details in the quote request
- [x] Add an estimated project timeline based on terrain and selected linear-footage work

## Combined Map Measurements — Aug 2026
- [x] Allow multiple separate area outlines and path drawings on the selected-property map
- [x] Sum all drawn areas and paths into combined acreage and linear-footage totals
- [x] Apply combined map totals to the quote calculator and request details

## Individual Map Drawing Controls — Aug 2026
- [x] Show each drawn area and path as an individually manageable map measurement
- [x] Allow a customer to edit or delete one selected drawing without clearing the others
- [x] Recalculate combined acreage and linear-footage totals after individual edits or deletions

## SEO & AI Visibility Improvement — Aug 2026
- [x] Audit public technical SEO, local entity signals, structured data, and indexing readiness
- [x] Review and recalibrate the AI Visibility score methodology around forestry mulching queries
- [x] Implement the highest-impact validated SEO and AI discoverability improvements
- [x] Complete a production SEO regression check for bot rendering, canonical tags, robots, sitemap, and structured-data integrity

## Performance Category Score — Aug 2026
- [x] Review the Performance Category score inputs and distinguish measured issues from unavailable third-party data
- [x] Implement validated site-performance or audit-score handling improvements
- [x] Verify the updated Performance Category score with production-safe checks
- [x] Enable the Google PageSpeed Insights API for the existing Google project and rerun a measured mobile audit
- [x] Split non-public application routes so the public homepage does not load unused operations code
- [x] Improve critical rendering of visible homepage assets based on PageSpeed findings
- [x] Re-measure mobile PageSpeed after deployed performance improvements
- [x] Defer the noncritical Google Fonts stylesheet while retaining the existing typography fallback
- [ ] Analyze and reduce the remaining mobile LCP bottleneck using the live PageSpeed breakdown
- [x] Retain the current homepage experience rather than defer additional below-the-fold content after the measured tradeoff review
- [x] Optimize the forestry-mulching service page’s critical loading path and remeasure its mobile LCP

## Live Search & AI Visibility Verification — Aug 2026
- [x] Run live mobile performance and technical SEO checks for priority landing pages
- [x] Review Google Search Console indexing and ranking trends for post-change regressions
- [x] Test Perplexity and ChatGPT discovery visibility for priority forestry-mulching queries
- [x] Document verified findings and apply only evidence-based fixes

## Search Console Index Coverage — Aug 2026
- [x] Classify current Search Console exclusions into expected versus remediation candidates
- [x] Inspect high-value excluded URLs and sitemap coverage
- [x] Apply only safe indexability or canonical fixes supported by production evidence
- [x] Validate production indexability and record the coverage baseline

## Local Content & Indexing Review — Aug 2026
- [x] Inventory county and service-area landing pages for local uniqueness and duplication risk
- [x] Prioritize high-value local content and internal-link improvements
- [x] Apply only validated local-content or canonical changes
- [x] Verify the resulting pages remain indexable in production
- [x] Consolidate duplicate county blog URLs into their matching canonical service-area pages

## County Differentiation Strategy Review — Aug 2026
- [x] Audit current local signals, repeated content, and conversion paths across county pages
- [x] Define differentiated county-content modules and evidence standards
- [x] Deliver a prioritized implementation recommendation without generic filler

## Primary H1 & Heading Structure — Aug 2026
- [x] Add the requested Middle and West Tennessee primary H1 to the homepage
- [x] Audit public routes for one clear primary H1 per page
- [x] Correct verified H1 conflicts without changing valid service, county, or blog page intent

## Multi-Service AI Quote Itemization — Aug 2026
- [x] Preserve every requested web-quote service and measurement in the server-side quote record
- [x] Carry each service’s preliminary contribution into AI estimate inputs and editable quote drafts
- [x] Display itemized service costs in the quote workflow without losing the combined total
- [x] Verify a forestry-mulching plus trail-cutting web quote end to end
- [x] Document the AI prompt and structured payload pattern for all requested web-quote services

## Quote Explanation & AI Range Confidence — Aug 2026
- [x] Display each requested service, measurement, preliminary range, and calculation basis beside the AI summary
- [x] Add AI-generated ballpark confidence and risk-factor guidance based on the submitted calculation basis
- [x] Cover the quote explanation and risk calculation with automated tests

## Website Request Visibility & Confidence Sorting — Aug 2026
- [x] Refresh Website Requests automatically when a new web quote is submitted
- [x] Add a Quotes sorting control for AI range-confidence score
- [x] Verify quote intake and confidence sorting with automated regression coverage

## Comprehensive AI, Website & Operations Audit — Aug 2026
- [x] Inventory every active AI, automation, conversion, CRM, SEO/AEO, and Stripe workflow
- [x] Inspect the live public site, technical search visibility, and current external best-practice evidence
- [x] Review read-only operational funnel data, agent health, and handoff gaps
- [x] Deliver an evidence-based audit with prioritized 0–30, 30–90, and 90+ day recommendations

## Urgent Audit Remediation Program — Aug 2026
- [x] Remove public prices, preliminary ranges, terrain multipliers, and rough-number calculators from public pricing and pre-visit quote routes
- [x] Remove public operations navigation, harden unauthenticated ops routes and data calls, and revoke/restrict the read-only viewer link
- [x] Define the existing native operations records as the source of truth and document Jobber synchronization decision criteria
- [x] Use the lean native operations stack as the authoritative record; retain Jobber only for a documented operational necessity
- [x] Replace the long public quote intake with a mobile-first Site Visit Request flow and capture source, fit, next action, visit, proposal, deposit, and payment status
- [x] Build Today’s Next Actions for new leads, visits, proposals, deposits, weather, invoices, and review-eligible jobs
- [x] Update privacy policy and public collection disclosures as a draft requiring legal review before reliance
- [x] Improve mobile LCP on priority service and quote pages and document excluded-URL review requirements
- [x] Prepare verified Google Business Profile, Bing Places/Bing Webmaster AI Performance, Search Console, and monthly-review measurement setup
- [x] Resolve or report the incorrect duplicate Google Maps listing before relying on local-review or local-visibility counts

## Privacy & Form Disclosure Alignment — Aug 2026
- [x] Verify the public policy and Site Visit Request disclosures match all current collection, AI, mapping, storage, payment, email, and SMS workflows
- [x] Publish the refined policy and form notice as a legal-review draft
- [x] Add regression coverage for the revised public disclosures

## Footer Cookie Consent & Public Hardening Verification — Aug 2026
- [x] Re-verify that public header navigation, unauthenticated operations data calls, pricing routes, and the pre-visit form do not expose sensitive operations or price outputs
- [x] Add an accessible dismissible cookie-consent banner in the footer with a direct Privacy Policy link
- [x] Add regression coverage for the footer consent behavior and public hardening checks
- [x] Remove the residual retired ops-viewer copy control and hard-coded viewer key from the protected dashboard

## Native Site Visit Workflow & Priority LCP Verification — Aug 2026
- [x] Verify and complete Site Visit Request capture for source, fit decision, next action, visit status, proposal status, deposit status, and final payment status
- [x] Verify and complete Today’s Next Actions coverage for new leads, visits, proposals, deposits, weather, invoices, and review-eligible jobs
- [x] Measure current mobile LCP for Forestry Mulching and Site Visit Request, apply targeted improvements, and validate the release

## Site Visit Validation, Action Prioritization & Evidence Content Template — Aug 2026
- [x] Add clear inline validation and contact-detail guidance to the Site Visit Request form
- [x] Add urgency/status filtering and sorting controls to Today’s Next Actions
- [x] Create a reusable county/service template for factual local proof, verified reviews, and real project galleries
- [x] Add regression coverage for validation, action prioritization, and review/gallery evidence safeguards

## Site Visit Service-Area County & Address Entry — Aug 2026
- [x] Require an approved Middle or West Tennessee county selection before submitting a Site Visit Request
- [x] Add property-address autocomplete and carry the selected address into the native request record
- [x] Add regression coverage for service-area eligibility and selected-address handling

## Address County Normalization Fix — Aug 2026
- [x] Normalize Google address county values before comparing them to the approved service-area list
- [x] Verify Houston County and other approved counties returned without the “County” suffix remain in service area

## Site Visit Location Details & County Reference — Aug 2026
- [x] Display City and ZIP fields that are populated by selected property-address autocomplete details
- [x] Add a compact supported-counties reference beside the Site Visit Request location inputs
- [x] Add regression coverage for visible City/ZIP and county-reference behavior

## Current Location & Visual Service-Area Guidance — Aug 2026
- [x] Verify county normalization against every approved service-area county and common suffix variations
- [x] Add a “Use my current location” control with browser-permission and reverse-geocode handling
- [x] Add a compact visual map highlighting the supported county service area beside the Site Visit Request location inputs
- [x] Add regression coverage for county normalization, location detection, and map guidance

## Current Location Fallback & Out-of-Area Assistance — Aug 2026
- [x] Explain denied location permission and offer a clear manual address-entry fallback
- [x] Offer custom-quote or waitlist next steps when a detected address falls outside the approved counties
- [x] Display an active loading indicator while reverse geocoding is in progress
- [x] Add regression coverage for permission fallback, out-of-area guidance, and loading feedback

## Out-of-Service Waitlist & FAQ Guidance — Aug 2026
- [x] Add an email capture path for out-of-service waitlist notifications
- [x] Add a smooth fade-in transition for the out-of-service message
- [x] Link the out-of-service message to the FAQ page for service-boundary questions
- [x] Add regression coverage for waitlist capture, transition, and FAQ guidance

## Site Visit Navigation & Expansion Waitlist Operations — Aug 2026
- [x] Replace public Pricing navigation and quote language with site-visit planning language
- [x] Add success feedback and checkmark animation after waitlist email submission
- [x] Add an operations dashboard view that groups expansion-waitlist signups by county
- [x] Send an immediate expansion-waitlist confirmation email after successful signup
- [x] Add regression coverage for navigation, waitlist feedback, dashboard grouping, and email confirmation

## Companion App Site Visit Workflow Alignment — Aug 2026
- [x] Align companion-app site-location and service-area handling with the updated website workflow
- [x] Add companion-app current-location feedback, manual fallback, and outside-service-area guidance
- [x] Add an in-app update action for current companion-app releases
- [x] Validate updated companion-app source without rebuilding the APK

## Companion Release Channel, Map & Offline Sync — Aug 2026
- [x] Configure version metadata and a downloadable companion-app release channel for the in-app update action
- [x] Add a visual supported-service-area map to the companion app location screen
- [x] Store out-of-area companion requests offline and synchronize them when connectivity returns
- [x] Validate the companion source and document the required signed-APK release step without rebuilding the APK

## Companion Sync Feedback & Update Badge — Aug 2026
- [x] Show an in-app visual status when queued offline requests finish synchronizing
- [x] Show an app-launch update-available badge when a newer mobile release exists
- [x] Write a step-by-step signed APK and GitHub release walkthrough without publishing a release
- [x] Validate companion source changes without building or releasing a new APK

## Companion Install Action & Signed APK Release — Aug 2026
- [x] Add a direct Install Update button to the Profile tab when a newer release exists
- [x] Build and sign the approved companion Android APK
- [x] Verify the signed APK and publish it as the current `mobile-v` GitHub release
- [x] Confirm the companion update endpoint exposes the published release to the installed app

## Personal-Use Android Release Identity — Aug 2026
- [x] Create the Android Capacitor project and a new personal-use Noland Field signing identity
- [x] Build, sign, verify, and publish the first replacement APK for the owner’s phone
- [x] Document one-time replacement installation and subsequent in-app update use

## Companion App Brand Logo Update — Aug 2026
- [x] Replace launcher and splash branding with the official Noland Earthworks logo
- [x] Align visible companion app header and profile branding with the official logo
- [x] Build, sign, and publish the required branded APK update

## Companion App Dark Brand Theme — Aug 2026
- [x] Define a dark Noland Earthworks design token palette with outdoor-readable contrast
- [x] Apply the branded dark theme consistently to the companion app’s primary screens and controls
- [x] Validate the dark-theme companion app source and regression coverage without rebuilding the APK
- [x] Build, sign, and publish the dark-theme companion app update after explicit release approval
- [x] Prepare, verify, and publish the approved Noland Field v0.4.2 dark-theme APK

## Companion App Appearance Controls — Aug 2026
- [x] Add a persistent Profile setting for Light, Dark, and System appearance modes
- [x] Respond to device light/dark preference changes while System mode is selected
- [x] Add a motion-safe smooth fade transition for appearance changes
- [x] Validate the appearance controls and regression coverage without rebuilding the APK
- [ ] Build, sign, and publish the appearance-controls APK update after explicit release approval

## Companion Update Download Recovery — Aug 2026
- [x] Diagnose why the published companion APK update download stalls before completion
- [x] Add a reliable installation handoff and clear fallback guidance in the companion app
- [x] Validate the corrected update-download path against the published release asset

## AI Visibility Audit Score Investigation — Aug 2026
- [x] Compare the 96/100 and 80/100 audit inputs, component scores, and run records
- [x] Identify whether data availability, scoring logic, or public visibility changes caused the difference
- [x] Explain the score movement and record any concrete correction or monitoring step

## Owner SMS Alerts & Lead Scheduling — Aug 2026
- [x] Configure owner-only Twilio SMS alerts to 913-406-2910 and 615-406-4819 for newly saved quotes and prospects
- [x] Make the alerts duplicate-safe and include the relevant Operations record link
- [x] Repair lead drag-and-drop into the Operations Schedule while preserving the original lead record
- [x] Add regression coverage and validate the complete alert and scheduling workflow

## SMS Alert Context & Delivery History — Aug 2026
- [x] Add lead name, requested service, and available estimate to relevant owner SMS alerts
- [x] Persist every owner SMS send attempt and Twilio acceptance or failure outcome for Operations review
- [x] Add an authenticated SMS alert-history view to the Operations dashboard
- [x] Visually mark capacity leads as scheduled after a successful calendar drop
- [x] Add regression coverage and validate the enhanced owner-alert workflow

## Owner SMS Alert Test — Aug 2026
- [x] Send one owner-only SMS test alert to both configured recipients
- [x] Verify the resulting per-recipient Twilio outcomes in the Operations history

## Owner SMS Handset Delivery Recovery — Aug 2026
- [x] Retrieve carrier-level status and error details for both accepted Twilio test messages
- [x] Upload the supplied two-phone START opt-in evidence and submit Twilio toll-free verification for the owner-alert sender
- [ ] Confirm the verification approval, correct the blocked sender state, and re-test both owner phones

## Pricing Intelligence Dashboard Assessment — Aug 2026
- [x] Inspect the active Pricing Intelligence calculations, evidence sources, and benchmark freshness
- [x] Compare the dashboard with the prior Middle and West Tennessee weekly pricing-update criteria
- [x] Report whether it verifies pricing correctly and identify any required correction

## Whole-Site Audit Remediation — Aug 2026
- [x] Apply one factual public service-scope statement and remove language that can imply grading, excavation, hauling, stump extraction, road construction, or construction-ready preparation
- [x] Tighten the public site-visit path, mobile form sequence, and same-day/next-morning response expectation
- [x] Remove remaining public price anchors from educational content without changing private Operations pricing
- [x] Make Stripe payment processing idempotent, retriable on transient internal failures, and visible for reconciliation
- [x] Remove redirected source URLs from the sitemap while preserving redirects and canonical county service pages
- [x] Add reusable verified-evidence controls for project captions and review content without inventing testimonials or ratings
- [x] Add a local-profile facts-sheet workflow and evidence-led AI-search measurement guidance
- [x] Replace unsafe Pricing Intelligence auto-overwrite behavior with source-aware, unit-correct, review-only benchmarks
- [x] Align the pricing-agent schedule, dashboard freshness status, and partial-run reporting
- [x] Add owner-only release checks for sensitive Operations procedures and payment webhooks
- [x] Run regression, build, public-route, sitemap, and authorization validation after remediation
- [x] Document legal-review and external-account follow-ups that cannot be safely automated

## Land Management Terminology Correction — Aug 2026
- [x] Inventory all remaining Land Clearing references across public copy, Operations, AI, metadata, and structured data
- [x] Replace all customer-facing Land Clearing terminology with Land Management without breaking stable URLs
- [x] Validate public pages, metadata, and Operations labels for prohibited terminology
- [x] Increment the web application version for the published terminology correction

## Land Management Service Experience — Aug 2026
- [x] Refresh Land Management imagery to show broader property stewardship and management outcomes
- [x] Route on-site searches for the retired service term to the Land Management service
- [x] Add a concise Land Management category explanation to the Services page
- [x] Add regression coverage and validate the updated service experience
- [x] Keep Forestry Mulching as the first homepage service and Land Management second
- [x] Replace visible Schedule a Free Quote calls to action with Request a Site Visit
- [x] Increment the public app version for the published Land Management service-experience update

## Quote Portal Contact Correction — Aug 2026
- [x] Replace the outdated quote-portal email with quotes@nolandearthworks.com
- [x] Verify no stale quote-portal contact email remains in customer-facing quote workflow copy
- [x] Increment the app version for the published quote-portal contact correction

## Site Visit Location Validation & Homepage Heading — Aug 2026
- [x] Warn when the selected service county conflicts with the geocoded property county
- [x] Require a complete manual address and approved county when address lookup is unavailable
- [x] Preserve the out-of-area path while routing ambiguous or failed-geocode requests to Owner Review
- [x] Show the Owner Review location decision in Operations without losing a legitimate lead
- [x] Change the homepage heading to Forestry Mulching & Land Management
- [x] Add regression coverage, validate the request flow, and increment the app version
- [x] Require an estimated acreage amount before a Site Visit Request can be submitted

## Homepage Call-to-Action Cleanup — Aug 2026
- [x] Remove the redundant Plan a site visit link from the homepage hero
- [x] Retain the primary Request a Site Visit button and validate the homepage action area
- [x] Increment the public app version for the homepage call-to-action cleanup

## Selective Mulching Terminology Refinement — Aug 2026
- [x] Confirm customer-facing Selective Clearing references are already absent; Selective Mulching terminology is in use
- [x] Review remaining customer-facing clearing references and retain only accurate scope or search-continuity uses
- [x] Validate terminology; no unnecessary version increment was needed because no customer-facing copy changed

## Quote Performance & County Differentiation — Aug 2026
- [x] Measure the current quote-page mobile performance and critical loading path
- [x] Implement a low-risk quote-page performance improvement that preserves the form flow
- [x] Add factual county-specific differentiation without expanding generic boilerplate
- [x] Validate mobile performance and county-page indexability after publication

## Perplexity, Service LCP & Google Ads — Aug 2026
- [x] Run authenticated Perplexity visibility checks for priority forestry-mulching queries
- [x] Identify the remaining service-page LCP tradeoff and retain GA4 tracking coverage by user decision
- [x] Review Google Ads account and in-app integration readiness without changing live campaigns
- [x] Document verified results and required follow-up access

## Direct Google Ads Publishing Safeguards — Aug 2026
- [ ] Gather Google Ads API access details and account identifiers securely
- [ ] Add draft-only campaign creation with an explicit review stage
- [ ] Preserve scheduling, spend tracking, and approval before any live publication
- [ ] Complete Google Ads API Center setup from the user’s local browser because the connected browser injects an ad blocker
- [x] Retain the current manual Google Ads copy-and-paste workflow and defer API publishing by user decision

## Selective Mulching Terminology Refinement — Aug 2026
- [x] Replace customer-facing Selective Clearing references with Selective Mulching
- [x] Retain only legacy redirects and invisible internal compatibility keys for the retired term
- [x] Validate canonical routing and app terminology, then increment the published version

## Selective Mulching Education & Request Guidance — Aug 2026
- [x] Add a concise FAQ explaining Selective Mulching compared with traditional clearing
- [x] Use authentic equipment-in-action imagery on the Selective Mulching service page
- [x] Add a Request a Site Visit service tooltip that explains mulching and clearing terminology
- [x] Add regression coverage, validate the public experience, and increment the app version

## Free Quote Terminology Cleanup — Aug 2026
- [x] Inventory all customer-facing Free Quote wording, labels, and calls to action
- [x] Replace visible Free Quote terminology with Request a Site Visit language
- [x] Validate the cleanup and increment the published app version

## Public Process Workflow Correction — Aug 2026
- [x] Replace inaccurate Process-section claims with the actual qualification, visit, proposal, scheduling, work, and follow-up sequence
- [x] Remove fixed completion and scheduling promises from the public workflow
- [x] Add regression coverage, validate the public section, and increment the published app version

## Our Commitment Service Coverage — Aug 2026
- [x] Add Forestry Mulching to the public Our Commitment statement
- [x] Validate the commitment wording alongside the corrected Process workflow

## Cross-Site Consistency Audit — Aug 2026
- [x] Inventory public and Operations terminology, calls to action, scope language, contact details, and metadata
- [x] Identify and prioritize confirmed inconsistencies
- [x] Apply safe consistency corrections and validate the active site

## Site Visit Submission Feedback — Aug 2026
- [x] Add a subtle accessible loading state while a Site Visit Request is being sent
- [x] Improve the visible success confirmation after a Site Visit Request is submitted
- [x] Add regression coverage, validate the form feedback, and increment the app version

## Companion App Website Alignment — Aug 2026
- [x] Audit Noland Field against current Land Management terminology, service options, location safeguards, acreage, and request feedback
- [x] Update applicable companion app workflows and customer-facing field labels
- [x] Validate the companion source and native Android integration
- [x] Build, sign, publish, and verify the aligned companion APK update

## Google Search Console Canonical Notification Investigation — Aug 2026
- [x] Identify the URLs and patterns reported as duplicate without a user-selected canonical
- [x] Audit live canonical tags, redirects, sitemap references, and competing URL variants
- [x] Apply only evidence-backed canonical or routing corrections and validate the result

## Full-Site Trailing-Slash Canonical Audit — Aug 2026
- [x] Test every public sitemap URL with its trailing-slash variant in production
- [x] Review any non-redirecting or incorrect redirect responses for public page URLs
- [x] Harden global canonical routing only where gaps remain, then add regression coverage
- [x] Validate complete production redirect coverage and document the result

## Sitemap, Internal Link, and Canonical Validation — Aug 2026
- [x] Verify every XML sitemap entry uses the canonical HTTPS no-trailing-slash URL form
- [x] Crawl public internal links and identify broken or redirect-related destinations
- [x] Verify every public sitemap page emits the expected self-referencing no-slash canonical tag
- [x] Correct verified sitemap, link, or canonical defects and validate production behavior
- [x] Prevent stale production SPA HTML from retaining a prior frontend bundle after publication

## Operations Quotes Audible New-Request Alert — Aug 2026
- [x] Identify the lead and website-quote refresh paths on Operations Quotes
- [x] Add a user-controlled sound alert for genuinely new incoming requests
- [x] Add regression coverage and validate the alert behavior
- [x] Test the Sound control in an authenticated Operations Quotes browser session

## Operations Quotes Visual New-Request Alert — Aug 2026
- [x] Add a visible, dismissible new-request banner tied to the automatic alert detection
- [x] Submit and observe a clearly labeled temporary live intake event with Sound On
- [x] Remove the temporary event, add regression coverage, and validate the final behavior

## Operations Quotes Browser Notifications — Aug 2026
- [x] Choose background-tab notification scope and permission behavior
- [x] Add browser-notification permission control and automatic delivery for new requests
- [ ] Validate browser notification behavior and graceful blocked-permission fallback

## Tennessee Parcel ID Property Lookup — Aug 2026
- [x] Verify Tennessee Property Viewer lookup access, county coverage, and available parcel fields
- [x] Add Parcel ID lookup with editable property-detail prefill to Operations Quotes and field workflows
- [x] Validate Tennessee parcel results and unavailable-data fallback behavior

## Tennessee Parcel Lookup Enrichment — Aug 2026
- [x] Confirm official owner, mailing-address, and Property Viewer map fields and Parcel ID format rules
- [x] Add owner and available mailing-address prefill to editable quote details
- [x] Add Property Viewer map access or a small parcel map preview for verified results
- [x] Add county-aware Parcel ID input validation and regression coverage
- [x] Retain the official public lookup scope; mailing details remain available through the official TPAD record instead of unsupported server-side retrieval

## Parcel ID Lookup Rollout — Aug 2026
- [x] Add official Parcel ID lookup with editable property prefill to Noland Field
- [x] Add privacy-conscious official Parcel ID auto-fill to the public Request a Site Visit form
- [x] Preserve public county, service-area, and owner-data disclosure safeguards
- [x] Validate both workflows and build the updated Noland Field APK release

## Internal Parcel-Acreage Site Visit Cost Estimate — Aug 2026
- [x] Review internal cost settings and determine a safe preliminary site-visit cost model
- [x] Show a clearly labeled internal estimate in Operations Quotes when a Parcel ID supplies acreage
- [x] Validate the estimate and confirm no customer-facing pricing is introduced

## Site Visit Request Attachments — Aug 2026
- [x] Add secure optional photo and work-area document uploads to the public Site Visit form
- [x] Store attachment metadata with the request and expose it in Operations review
- [x] Validate file type, size, quantity, and failed-upload handling

## Site Visit Form Service-Area Layout — Aug 2026
- [x] Relocate the crowded service-area reference from the address field area
- [x] Preserve clear county eligibility guidance and validate the responsive form layout

## Site Visit Request Wizard and Attachment Previews — Aug 2026
- [x] Convert the public Site Visit form into a multi-step wizard with visible progress
- [x] Preserve step-level validation, location safeguards, Parcel ID lookup, and attachments
- [x] Add image thumbnails and document preview states with removal controls
- [x] Add regression coverage for wizard steps and attachment preview states
- [x] Validate the full responsive wizard flow and publish it

## Site Visit Wizard Review and Drag-Drop Uploads — Aug 2026
- [x] Add a final editable review step summarizing all request information before submission
- [x] Add accessible multi-file drag-and-drop uploads while preserving file limits and previews
- [x] Add regression coverage for the review step and drag-and-drop upload path
- [x] Validate the enhanced wizard flow and publish it

## Twilio Toll-Free Verification Resubmission — Aug 2026
- [ ] Review the rejected verification submission and business or opt-in mismatch details
- [ ] Correct the business identity, website, opt-in evidence, and alert-only messaging description
- [ ] Review the corrected submission with Jon and resubmit after approval
- [ ] Restore a usable Twilio login or verification page after the Console landing page failed to render
- [ ] Complete Twilio’s required human-verification challenge in Jon’s browser before Console actions can continue

## Operations Dashboard Owner SMS Alerts Layout — Aug 2026
- [x] Compact the Owner SMS Alerts panel while retaining current status and recent history access
- [x] Validate the Operations Dashboard layout and publish the change

## Noland Field Parcel ID Map Error — Aug 2026
- [x] Fix the Google Maps load error displayed after Parcel ID property lookup in the Android companion app
- [x] Validate the map fallback with regression coverage and a production web-bundle build
- [x] Bump, build, and publish the authorized Noland Field v0.4.6 Android companion app release

## Noland Field Parcel Boundary Overlay — Aug 2026
- [x] Return official Tennessee Property Viewer parcel-boundary geometry after an authenticated Parcel ID lookup
- [x] Draw the selected parcel boundary around the draggable location pin in the companion app map
- [x] Validate the official parcel-boundary overlay with regression coverage and a production web-bundle build
- [x] Bump, build, and publish the authorized Noland Field v0.4.7 update with the parcel boundary overlay

## Quote Classification Field Guide — Aug 2026
- [x] Add a shared practical guide for vegetation density, terrain, and site access classifications
- [x] Add the classification aid to Operations quoting and Noland Field
- [x] Validate and publish the Operations classification guide
- [x] Bump, build, and publish the authorized Noland Field v0.4.8 classification guide update

## Automatic Field-Condition Price Adjustments — Aug 2026
- [x] Apply selected Vegetation Density, Terrain, and Site Access conditions automatically to internal estimate pricing
- [x] Show the adjustment basis and revised recommended price in Operations and Noland Field
- [x] Validate the pricing calculation and publish the Operations update
- [ ] Bump, build, and publish the companion app price-adjustment update after Jon authorizes an APK build

## Market Benchmark Timestamp Consistency — Aug 2026
- [x] Correct the mismatch between the Market Benchmarks refresh status and individual service update dates
- [x] Validate and publish the corrected AI Pricing benchmark status display

## Market Benchmark Review and Approval — Aug 2026
- [x] Expose pending market-research suggestions and owner approval controls in AI Pricing
- [x] Refresh approved dates and benchmark values immediately after owner approval
- [x] Validate and publish the improved benchmark review workflow

## AI Pricing Auto-Approval — Aug 2026
- [x] Add an explicit AI Pricing auto-approve setting for successful research runs
- [x] Automatically promote validated pricing research into internal approved benchmarks when enabled
- [x] Enable the setting for Jon, validate the workflow, and publish the update

## Linear-Foot Market Benchmarks — Aug 2026
- [x] Move Fence Line Clearing and Trail Cutting into a dedicated Linear Foot benchmark section
- [x] Validate and publish the reorganized AI Pricing Market Benchmarks panel

## Adjusted Linear-Foot Benchmarks — Aug 2026
- [x] Apply selected Vegetation, Terrain, and Site Access multipliers to Linear Foot benchmark base rates
- [x] Add calculation tooltips that explain the linear-foot rate adjustment basis
- [x] Validate and publish the adjusted Linear Foot benchmark experience

## Equipment-Aware Rural Route Planner — Aug 2026
- [x] Add job-site address and Tennessee Parcel ID destination planning to the Route Planner
- [x] Add the saved Ram 5500, BigTex gooseneck, and loaded CAT 299D3 equipment profile
- [x] Add rural-road, bridge, turnaround, and unpaved-access route review prompts with a clear verification disclaimer
- [x] Validate and publish the expanded Route Planner

## Advanced Rural Route Planning — Aug 2026
- [x] Add saved and selectable custom vehicle profiles for truck, trailer, equipment, and towing conditions
- [x] Calculate a transparent towing-adjusted travel-time estimate from the selected profile and route context
- [x] Add an unpaved-road reference layer with coverage and verification limitations
- [x] Validate and publish the enhanced Route Planner

## Route Restriction Reference Alerts — Aug 2026
- [x] Retrieve route-adjacent mapped weight, height, and clearance restriction tags
- [x] Add map indicators and a clear route review warning panel for mapped restrictions
- [x] Validate and publish the restriction-aware Route Planner

## Quote Discount Line Items — Aug 2026
- [x] Review existing volume and customer discount settings and quote persistence
- [x] Define controlled, non-stacking volume and customer discount rules
- [x] Suggest eligible volume and customer discounts as editable quote line items
- [x] Apply approved discount items to quote totals and customer-facing quote outputs
- [x] Validate and publish the quote discount workflow

## Quote Whole-Dollar Ceiling Rounding — Aug 2026
- [x] Add shared whole-dollar ceiling rounding for quote amounts and persisted quote line items
- [x] Apply whole-dollar formatting to quote editor, details, and portal displays
- [x] Validate and publish the quote whole-dollar rounding update

## Noland Field Quote Configuration Parity — Aug 2026
- [x] Align companion quote calculations with active Operations pricing, condition adjustments, and whole-dollar rounding
- [x] Align eligible volume and customer discount suggestions with Operations settings
- [x] Validate the Operations-to-companion pricing and discount configuration parity in source
- [x] Bump, build, and publish the authorized Noland Field v0.4.9 parity update

## Noland Field Signing Identity Recovery — Aug 2026
- [x] Audit Git ignore rules, repository history, and release artifacts for the original Android signing identity
- [x] Document the required replacement-install path after the original signing identity could not be recovered
- [x] Sign and publish the authorized Noland Field v0.4.9 parity update

## Noland Field v0.4.9 Replacement Signing — Aug 2026
- [x] Create a new personal-use Android signing identity for the authorized one-time replacement install
- [x] Sign, verify, and publish Noland Field v0.4.9 with the new identity
- [x] Document the one-time uninstall and replacement-install steps for Jon

## Marketing Post Variation and Lead Routing — Aug 2026
- [x] Enforce varied post language across Operations marketing drafts
- [x] Use approved rotating hashtags, exclude #LandClearing, and include #LandManagement when relevant
- [x] Direct marketing post leads to nolandearthworks.com
- [x] Validate and publish the updated marketing post workflow

## Noland Field Estimate Event Serialization — Aug 2026
- [x] Prevent the Generate AI Estimate button event from being serialized into the estimate request
- [x] Validate the corrected estimate trigger with full regression coverage and a companion production bundle build
- [x] Bump, build, and publish the authorized Noland Field v0.4.10 companion app correction

## Noland Field Client Selection — Aug 2026
- [x] Expose authenticated Operations client records to the Noland Field New Quote workflow
- [x] Add searchable client selection and contact prefilling to New Field Quote
- [x] Validate the client-selection source update with focused and full regression coverage plus companion and Operations production bundles
- [x] Build and publish the companion client-selection APK after Jon authorizes the release
- [x] Bump, sign, verify, and publish Noland Field v0.4.11 using the established replacement signing identity

## Noland Field Voice Quote Microphone Access — Aug 2026
- [x] Diagnose the Android microphone permission and voice-capture failure
- [x] Add a clear permission recovery path and resilient voice-capture error handling
- [x] Validate the corrected voice quote source with 360 regression tests, companion production bundle, and merged Android manifest verification
- [x] Build and publish the corrected companion update after Jon authorizes it
- [x] Bump, sign, verify, and publish Noland Field v0.4.12 using the established replacement signing identity

## Quote Editing Total Cents Validation — Aug 2026
- [x] Trace and correct the non-integer total-cents value submitted while editing a quote
- [x] Add regression coverage and validate the repaired quote editing workflow

## Multiple Quote Discounts — Aug 2026
- [x] Allow multiple eligible discount line items on a quote without corrupting quote totals
- [x] Validate combined discount calculations and publish the Operations quote editor update

## Quote Pre-Discount Subtotal — Aug 2026
- [x] Show the original pre-discount subtotal, combined discounts, and final total in quote editing
- [x] Validate and publish the quote summary update

## Edit Quote Single-Panel Layout — Aug 2026
- [x] Remove the Edit Quote dialog’s internal scrolling panel and use a single-page form layout
- [x] Validate and publish the quote editor layout refinement

## Edit Quote Compact Single-Screen View — Aug 2026
- [x] Consolidate the primary Edit Quote components into a compact single-screen layout
- [x] Move secondary quote details behind clearly labeled progressive-disclosure controls
- [x] Validate and publish the compact Edit Quote view

## Edit Quote Mobile Responsiveness — Aug 2026
- [x] Make the compact Edit Quote controls and grids stack cleanly on mobile devices
- [x] Validate responsive desktop and mobile quote editing and publish the update

## Edit Quote Dual-Column Form — Aug 2026
- [x] Arrange all primary Edit Quote sections into a consistent dual-column desktop form
- [x] Validate desktop dual-column and mobile stacked quote editing before publishing

## Edit Quote Layout Collapse — Aug 2026
- [x] Repair the narrow, overlapping Edit Quote dialog layout shown in the reported screenshot
- [x] Validate and publish stable desktop and mobile Edit Quote sizing

## New and Edit Quote Width — Aug 2026
- [x] Substantially widen the New Quote and Edit Quote workspace on desktop
- [x] Validate and publish the widened quote form layout

## Centered Quote Dialog — Aug 2026
- [x] Replace the full-screen New Quote and Edit Quote panel with a centered fixed-size two-column dialog
- [x] Validate and publish centered desktop and responsive mobile quote dialog placement

## Quote Workspace Usability — Aug 2026
- [x] Replace the cramped quote dialog with a centered workspace where all sections remain readable and accessible
- [x] Validate and publish the usable New Quote and Edit Quote workspace

## Desktop-First Quote Workspace — Aug 2026
- [x] Remove mobile-width constraints from New Quote and Edit Quote and make the desktop workspace wide
- [x] Validate and publish the desktop-first quote workspace

## Remove Twilio Integrations — Aug 2026
- [x] Remove Twilio SMS alert code, Operations settings, and UI references throughout the website
- [x] Validate lead and quote workflows without Twilio and publish the cleanup
- [x] Resolve TypeScript errors introduced while removing Twilio and revalidate the cleanup

## SEO and AI Visibility Audit Response Handling — Aug 2026
- [x] Fix the Service Unavailable response being parsed as JSON during SEO and AI Visibility audits
- [x] Validate and publish resilient SEO and AI Visibility audit error handling

## Quote Email Template Enhancement — Aug 2026
- [x] Improve public and field quote email notifications with professional formatting and complete request details
- [x] Add regression coverage and validate all updated quote email delivery templates

## Post-Recovery Website and Cloud Service Audit — Aug 2026
- [x] Audit recovered website routes, integrations, schedules, and cloud-dependent features for missing or degraded behavior
- [x] Verify critical public, Operations, and companion-app support paths after the environment move
- [x] Document and prioritize recovery fixes with verified evidence

## Integration Recovery Repairs — Aug 2026
- [x] Replace the retired Google Place ID and restore verified live reviews
- [x] Repair Noland Field update delivery for the private GitHub repository
- [x] Remove Jobber code, routes, settings, tests, and references throughout the project
- [x] Verify Send Portal to Client email generation and delivery behavior
- [x] Validate and publish the integration recovery update

## Phased Work and Day-Rate Quote Controls — Aug 2026
- [x] Add Phase, Full Operating Day, and Half Operating Day line-item types to native Operations quotes
- [x] Add reusable draft day-rate and one-day trial-phase terms to contract templates
- [x] Add a clearly labeled internal sample phased forestry mulching quote in Operations
- [x] Add regression coverage and validate the enhanced quote workflow

## Live Phase and Day-Rate Quote Breakdown — Aug 2026
- [x] Add a real-time line-item cost breakdown for phases, operating-day work, discounts, and amounts due
- [x] Distinguish approved-now work from optional future phases without hiding the all-phases total
- [x] Add regression coverage and validate the live quote breakdown

## Quote Draft Save and Cost Distribution Visual — Aug 2026
- [x] Add explicit draft-save controls that preserve in-progress quotes without closing the builder
- [x] Add a visual chart comparing approved work and optional future-phase costs
- [x] Add regression coverage and validate the enhanced quote workflow

## Quote List Status Badges — Aug 2026
- [x] Add clear visual Draft, Sent, and Approved badges to native Operations quote list rows
- [x] Add regression coverage and validate the quote-list status treatment

## Resizable Quote Workspace — Aug 2026
- [x] Add bottom-right corner drag resizing to New Quote and Edit Quote windows
- [x] Make quote columns, line items, breakdown, and footer controls adapt to the resized workspace
- [x] Add regression coverage and validate the resizable quote workspace
