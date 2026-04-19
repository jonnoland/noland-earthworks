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
