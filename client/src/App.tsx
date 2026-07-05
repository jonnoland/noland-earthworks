import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import AIChatWidget from "./components/AIChatWidget";
import OwnerRoute from "./components/OwnerRoute";
import SmsToastNotifier from "./components/SmsToastNotifier";
import { lazy, Suspense } from "react";

// ── Ops dashboard (lazy-loaded — never sent to public visitors) ──────────────
const OpsDashboard       = lazy(() => import("./pages/ops/Dashboard"));
const OpsJobs            = lazy(() => import("./pages/ops/Jobs"));
const OpsLeads           = lazy(() => import("./pages/ops/Leads"));
const OpsPricing         = lazy(() => import("./pages/ops/Pricing"));
const OpsSchedule        = lazy(() => import("./pages/ops/Schedule"));
const OpsReports         = lazy(() => import("./pages/ops/Reports"));
const OpsSettings        = lazy(() => import("./pages/ops/Settings"));
const OpsClients         = lazy(() => import("./pages/ops/Clients"));
const OpsQuotes          = lazy(() => import("./pages/ops/Quotes"));
const OpsInvoices        = lazy(() => import("./pages/ops/Invoices"));
const OpsCrews           = lazy(() => import("./pages/ops/Crews"));
const CrewPricing        = lazy(() => import("./pages/ops/CrewPricing"));
const OpsConversations   = lazy(() => import("./pages/ops/Conversations"));
const OpsProspecting     = lazy(() => import("./pages/ops/Prospecting"));
const OpsReviews         = lazy(() => import("./pages/ops/Reviews"));
const OpsTimesheets      = lazy(() => import("./pages/ops/Timesheets"));
const OpsScoreboard      = lazy(() => import("./pages/ops/Scoreboard"));
const OpsDistanceQuotes  = lazy(() => import("./pages/ops/DistanceQuotes"));
const OpsQuoteAnalytics  = lazy(() => import("./pages/ops/QuoteAnalytics"));
const OpsTasksPage       = lazy(() => import("./pages/ops/Tasks"));
const OpsEquipment       = lazy(() => import("./pages/ops/Equipment"));
const OpsFieldFix        = lazy(() => import("./pages/ops/FieldFix"));
const OpsPayments        = lazy(() => import("./pages/ops/Payments"));
const OpsTeam            = lazy(() => import("./pages/ops/Team"));
const OpsRegister        = lazy(() => import("./pages/ops/Register"));
const CostEstimator      = lazy(() => import("./pages/ops/CostEstimator"));
const OpsSocialPosts     = lazy(() => import("./pages/ops/SocialPosts"));
const OpsAds             = lazy(() => import("./pages/ops/Ads"));
const OpsSeo             = lazy(() => import("./pages/ops/Seo"));
const OpsChatSessions    = lazy(() => import("./pages/ops/ChatSessions"));
const OpsGallery         = lazy(() => import("./pages/ops/Gallery"));
const ClientsHub         = lazy(() => import("./pages/ops/ClientsHub"));
const CrewsHub           = lazy(() => import("./pages/ops/CrewsHub"));
const ReportsHub         = lazy(() => import("./pages/ops/ReportsHub"));
const MarketingHub       = lazy(() => import("./pages/ops/MarketingHub"));
const EquipmentHub       = lazy(() => import("./pages/ops/EquipmentHub"));
const PricingHub         = lazy(() => import("./pages/ops/PricingHub"));
const OpsResources       = lazy(() => import("./pages/ops/Resources"));
const OpsRentals         = lazy(() => import("./pages/ops/Rentals"));

// ── Customer payment portal (lazy-loaded) ────────────────────────────────────
const PaymentPortal  = lazy(() => import("./pages/portal/PaymentPortal"));
const PaymentSuccess = lazy(() => import("./pages/portal/PaymentSuccess"));
const PaymentCancel  = lazy(() => import("./pages/portal/PaymentCancel"));

// ── Public pages (eagerly loaded — fast first paint for visitors) ─────────────
import Home from "./pages/Home";
import LandClearingPage from "./pages/LandClearing";
import ForestryMulchingPage from "./pages/ForestryMulching";
import VegetationManagementPage from "./pages/VegetationManagement";
import PropertyMaintenancePage from "./pages/PropertyMaintenance";
import RightOfWayClearingPage from "./pages/RightOfWayClearing";
import PostClearSeedingPage from "./pages/PostClearSeeding";
import FenceLineClearingPage from "./pages/FenceLineClearing";
import MulchRedistributionPage from "./pages/MulchRedistribution";
import SelectiveClearingPage from "./pages/SelectiveClearing";
import TrailCuttingPage from "./pages/TrailCutting";
import QuotePage from "./pages/Quote";
import AboutPage from "./pages/About";
import PricingPage from "./pages/Pricing";
import FaqPage from "./pages/Faq";
import TermsOfServicePage from "./pages/TermsOfService";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import BlogPage from "./pages/Blog";
import CostOfLandClearing from "./pages/blog/CostOfLandClearing";
import ForestryMulchingVsBulldozing from "./pages/blog/ForestryMulchingVsBulldozing";
import SignsVegetationManagement from "./pages/blog/SignsVegetationManagement";
import BestTimeToClearLand from "./pages/blog/BestTimeToClearLand";
import SitePreparationBeforeBuilding from "./pages/blog/SitePreparationBeforeBuilding";
import LandManagementWilliamsonCounty from "./pages/blog/LandManagementWilliamsonCounty";
import LandManagementDevelopersFarmers from "./pages/blog/LandManagementDevelopersFarmers";
import LandManagementDavidsonCounty from "./pages/blog/LandManagementDavidsonCounty";
import LandManagementRutherfordCounty from "./pages/blog/LandManagementRutherfordCounty";
import LandManagementMauryCounty from "./pages/blog/LandManagementMauryCounty";
import LandManagementMarshallCounty from "./pages/blog/LandManagementMarshallCounty";
import ForestryMulchingVsBushHogging from "./pages/blog/ForestryMulchingVsBushHogging";
import HowToPrepareForLandClearing from "./pages/blog/HowToPrepareForLandClearing";
import PastureReclamationTennessee from "./pages/blog/PastureReclamationTennessee";
import LandManagementLincolnCounty from "./pages/blog/LandManagementLincolnCounty";
import LandManagementWilsonCounty from "./pages/blog/LandManagementWilsonCounty";
import LandManagementMontgomeryCounty from "./pages/blog/LandManagementMontgomeryCounty";
import LandManagementGilesCounty from "./pages/blog/LandManagementGilesCounty";
import LandManagementSumnerCounty from "./pages/blog/LandManagementSumnerCounty";
import LandManagementBedfordCounty from "./pages/blog/LandManagementBedfordCounty";
import LandManagementCheathamCounty from "./pages/blog/LandManagementCheathamCounty";
import LandManagementLawrenceCounty from "./pages/blog/LandManagementLawrenceCounty";
import LandManagementDicksonCounty from "./pages/blog/LandManagementDicksonCounty";
import LandManagementHickmanCounty from "./pages/blog/LandManagementHickmanCounty";
import LandManagementRobertsonCounty from "./pages/blog/LandManagementRobertsonCounty";
import LandManagementTrousdaleCounty from "./pages/blog/LandManagementTrousdaleCounty";
import LandManagementBentonCounty from "./pages/blog/LandManagementBentonCounty";
import LandManagementCannonCounty from "./pages/blog/LandManagementCannonCounty";
import LandManagementCarrollCounty from "./pages/blog/LandManagementCarrollCounty";
import LandManagementChesterCounty from "./pages/blog/LandManagementChesterCounty";
import LandManagementDecaturCounty from "./pages/blog/LandManagementDecaturCounty";
import LandManagementGibsonCounty from "./pages/blog/LandManagementGibsonCounty";
import LandManagementHardinCounty from "./pages/blog/LandManagementHardinCounty";
import LandManagementHendersonCounty from "./pages/blog/LandManagementHendersonCounty";
import LandManagementHenryCounty from "./pages/blog/LandManagementHenryCounty";
import LandManagementHoustonCounty from "./pages/blog/LandManagementHoustonCounty";
import LandManagementHumphreysCounty from "./pages/blog/LandManagementHumphreysCounty";
import LandManagementLewisCounty from "./pages/blog/LandManagementLewisCounty";
import LandManagementMadisonCounty from "./pages/blog/LandManagementMadisonCounty";
import LandManagementMooreCounty from "./pages/blog/LandManagementMooreCounty";
import LandManagementPerryCounty from "./pages/blog/LandManagementPerryCounty";
import LandManagementStewartCounty from "./pages/blog/LandManagementStewartCounty";
import LandManagementWayneCounty from "./pages/blog/LandManagementWayneCounty";
import LandManagementWeakleyCounty from "./pages/blog/LandManagementWeakleyCounty";
import GalleryPage from "./pages/Gallery";
import {
  DavidsonCountyPage,
  WilliamsonCountyPage,
  RutherfordCountyPage,
  WilsonCountyPage,
  SumnerCountyPage,
  RobertsonCountyPage,
  CheathamCountyPage,
  DicksonCountyPage,
  MauryCountyPage,
  WayneCountyPage,
  CannonCountyPage,
  BedfordCountyPage,
  MontgomeryCountyPage,
  LewisCountyPage,
  PerryCountyPage,
  BentonCountyPage,
  HickmanCountyPage,
  HoustonCountyPage,
  HumphreysCountyPage,
  StewartCountyPage,
  MarshallCountyPage,
  GilesCountyPage,
  LincolnCountyPage,
  MooreCountyPage,
  LawrenceCountyPage,
  TrousdaleCountyPage,
  CarrollCountyPage,
  ChesterCountyPage,
  DecaturCountyPage,
  GibsonCountyPage,
  HardinCountyPage,
  HendersonCountyPage,
  HenryCountyPage,
  MadisonCountyPage,
  WeakleyCountyPage,
} from "./pages/CountyPages";

// Minimal loading fallback for lazy routes
function OpsLoading() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#121212", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "rgba(240,237,230,0.4)", fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", letterSpacing: "0.1em" }}>
        Loading...
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Main pages */}
      <Route path="/" component={Home} />
      <Route path="/quote" component={QuotePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />

      {/* Gallery */}
      <Route path="/gallery" component={GalleryPage} />

      {/* Blog / Resources */}
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/cost-of-land-management-tennessee" component={CostOfLandClearing} />
      <Route path="/blog/cost-of-land-management-tennessee" component={() => { window.location.replace("/blog/cost-of-land-management-tennessee"); return null; }} />
      <Route path="/blog/forestry-mulching-vs-bulldozing" component={ForestryMulchingVsBulldozing} />
      <Route path="/blog/signs-you-need-vegetation-management" component={SignsVegetationManagement} />
      <Route path="/blog/best-time-to-clear-land-tennessee" component={BestTimeToClearLand} />
      <Route path="/blog/site-preparation-before-building-tennessee" component={SitePreparationBeforeBuilding} />
      <Route path="/blog/land-management-developers-farmers-middle-tennessee" component={LandManagementDevelopersFarmers} />
      <Route path="/blog/land-management-williamson-county" component={LandManagementWilliamsonCounty} />
      <Route path="/blog/land-management-davidson-county" component={LandManagementDavidsonCounty} />
      <Route path="/blog/land-management-rutherford-county" component={LandManagementRutherfordCounty} />
      <Route path="/blog/land-management-maury-county" component={LandManagementMauryCounty} />
      <Route path="/blog/land-management-marshall-county" component={LandManagementMarshallCounty} />
      <Route path="/blog/land-management-williamson-county" component={() => { window.location.replace("/blog/land-management-williamson-county"); return null; }} />
      <Route path="/blog/land-management-davidson-county" component={() => { window.location.replace("/blog/land-management-davidson-county"); return null; }} />
      <Route path="/blog/land-management-rutherford-county" component={() => { window.location.replace("/blog/land-management-rutherford-county"); return null; }} />
      <Route path="/blog/forestry-mulching-vs-bush-hogging" component={ForestryMulchingVsBushHogging} />
      <Route path="/blog/how-to-prepare-for-land-management" component={HowToPrepareForLandClearing} />
      <Route path="/blog/pasture-reclamation-tennessee" component={PastureReclamationTennessee} />
      <Route path="/blog/land-management-lincoln-county" component={LandManagementLincolnCounty} />
      <Route path="/blog/land-management-wilson-county" component={LandManagementWilsonCounty} />
      <Route path="/blog/land-management-montgomery-county" component={LandManagementMontgomeryCounty} />
      <Route path="/blog/land-management-giles-county" component={LandManagementGilesCounty} />
      <Route path="/blog/land-management-sumner-county" component={LandManagementSumnerCounty} />
      <Route path="/blog/land-management-bedford-county" component={LandManagementBedfordCounty} />
      <Route path="/blog/land-management-cheatham-county" component={LandManagementCheathamCounty} />
      <Route path="/blog/land-management-lawrence-county" component={LandManagementLawrenceCounty} />
      <Route path="/blog/land-management-dickson-county" component={LandManagementDicksonCounty} />
      <Route path="/blog/land-management-hickman-county" component={LandManagementHickmanCounty} />
      <Route path="/blog/land-management-robertson-county" component={LandManagementRobertsonCounty} />
      <Route path="/blog/land-management-trousdale-county" component={LandManagementTrousdaleCounty} />
      <Route path="/blog/land-management-benton-county" component={LandManagementBentonCounty} />
      <Route path="/blog/land-management-cannon-county" component={LandManagementCannonCounty} />
      <Route path="/blog/land-management-carroll-county" component={LandManagementCarrollCounty} />
      <Route path="/blog/land-management-chester-county" component={LandManagementChesterCounty} />
      <Route path="/blog/land-management-decatur-county" component={LandManagementDecaturCounty} />
      <Route path="/blog/land-management-gibson-county" component={LandManagementGibsonCounty} />
      <Route path="/blog/land-management-hardin-county" component={LandManagementHardinCounty} />
      <Route path="/blog/land-management-henderson-county" component={LandManagementHendersonCounty} />
      <Route path="/blog/land-management-henry-county" component={LandManagementHenryCounty} />
      <Route path="/blog/land-management-houston-county" component={LandManagementHoustonCounty} />
      <Route path="/blog/land-management-humphreys-county" component={LandManagementHumphreysCounty} />
      <Route path="/blog/land-management-lewis-county" component={LandManagementLewisCounty} />
      <Route path="/blog/land-management-madison-county" component={LandManagementMadisonCounty} />
      <Route path="/blog/land-management-moore-county" component={LandManagementMooreCounty} />
      <Route path="/blog/land-management-perry-county" component={LandManagementPerryCounty} />
      <Route path="/blog/land-management-stewart-county" component={LandManagementStewartCounty} />
      <Route path="/blog/land-management-wayne-county" component={LandManagementWayneCounty} />
      <Route path="/blog/land-management-weakley-county" component={LandManagementWeakleyCounty} />

      {/* Service pages */}
      <Route path="/services/land-management" component={LandClearingPage} />
      <Route path="/services/land-management" component={() => { window.location.replace("/services/land-management"); return null; }} />
      <Route path="/services/forestry-mulching" component={ForestryMulchingPage} />
      <Route path="/services/vegetation-management" component={VegetationManagementPage} />
      <Route path="/services/property-maintenance" component={PropertyMaintenancePage} />
      <Route path="/services/right-of-way-clearing" component={RightOfWayClearingPage} />
      <Route path="/services/trail-cutting" component={TrailCuttingPage} />
      {/* Add-On service pages */}
      <Route path="/services/add-ons/post-clear-seeding" component={PostClearSeedingPage} />
      <Route path="/services/add-ons/fence-line-clearing" component={FenceLineClearingPage} />
      <Route path="/services/add-ons/mulch-redistribution" component={MulchRedistributionPage} />
      <Route path="/services/add-ons/selective-clearing" component={SelectiveClearingPage} />

      {/* County landing pages */}
      <Route path="/service-areas/davidson-county" component={DavidsonCountyPage} />
      <Route path="/service-areas/williamson-county" component={WilliamsonCountyPage} />
      <Route path="/service-areas/rutherford-county" component={RutherfordCountyPage} />
      <Route path="/service-areas/wilson-county" component={WilsonCountyPage} />
      <Route path="/service-areas/sumner-county" component={SumnerCountyPage} />
      <Route path="/service-areas/robertson-county" component={RobertsonCountyPage} />
      <Route path="/service-areas/cheatham-county" component={CheathamCountyPage} />
      <Route path="/service-areas/dickson-county" component={DicksonCountyPage} />
      <Route path="/service-areas/maury-county" component={MauryCountyPage} />
      <Route path="/service-areas/wayne-county" component={WayneCountyPage} />
      <Route path="/service-areas/cannon-county" component={CannonCountyPage} />
      <Route path="/service-areas/bedford-county" component={BedfordCountyPage} />
      <Route path="/service-areas/montgomery-county" component={MontgomeryCountyPage} />
      <Route path="/service-areas/lewis-county" component={LewisCountyPage} />
      <Route path="/service-areas/perry-county" component={PerryCountyPage} />
      <Route path="/service-areas/benton-county" component={BentonCountyPage} />
      <Route path="/service-areas/hickman-county" component={HickmanCountyPage} />
      <Route path="/service-areas/houston-county" component={HoustonCountyPage} />
      <Route path="/service-areas/humphreys-county" component={HumphreysCountyPage} />
      <Route path="/service-areas/stewart-county" component={StewartCountyPage} />
      <Route path="/service-areas/marshall-county" component={MarshallCountyPage} />
      <Route path="/service-areas/giles-county" component={GilesCountyPage} />
      <Route path="/service-areas/lincoln-county" component={LincolnCountyPage} />
      <Route path="/service-areas/moore-county" component={MooreCountyPage} />
      <Route path="/service-areas/lawrence-county" component={LawrenceCountyPage} />
      <Route path="/service-areas/trousdale-county" component={TrousdaleCountyPage} />
      <Route path="/service-areas/carroll-county" component={CarrollCountyPage} />
      <Route path="/service-areas/chester-county" component={ChesterCountyPage} />
      <Route path="/service-areas/decatur-county" component={DecaturCountyPage} />
      <Route path="/service-areas/gibson-county" component={GibsonCountyPage} />
      <Route path="/service-areas/hardin-county" component={HardinCountyPage} />
      <Route path="/service-areas/henderson-county" component={HendersonCountyPage} />
      <Route path="/service-areas/henry-county" component={HenryCountyPage} />
      <Route path="/service-areas/madison-county" component={MadisonCountyPage} />
      <Route path="/service-areas/weakley-county" component={WeakleyCountyPage} />

      {/* Ops dashboard — owner only, lazy-loaded */}
      <Route path="/ops">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsDashboard /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/jobs">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsJobs /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/leads">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsLeads /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/pricing">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsPricing /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/schedule">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsSchedule /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/reports">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsReports /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/settings">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsSettings /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/clients/detail">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsClients /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/quotes">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsQuotes /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/invoices">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsInvoices /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/crews">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsCrews /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/crews/:id/pricing">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><CrewPricing /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/prospecting">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsProspecting /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/conversations">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsChatSessions /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/reviews">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsReviews /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/timesheets">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsTimesheets /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/scoreboard">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsScoreboard /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/tasks">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsTasksPage /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/equipment">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsEquipment /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/field-fix">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsFieldFix /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/distance-quotes/analytics">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsQuoteAnalytics /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/distance-quotes">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsDistanceQuotes /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/team">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsTeam /></OwnerRoute></Suspense>
      </Route>
      {/* Public — no auth required, employees register here */}
      <Route path="/ops/register">
        <Suspense fallback={<OpsLoading />}><OpsRegister /></Suspense>
      </Route>
      <Route path="/ops/cost-estimator">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><CostEstimator /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/social-posts">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsSocialPosts /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/ads">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsAds /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/seo">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsSeo /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/chat-sessions">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsChatSessions /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/payments">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsPayments /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/gallery">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsGallery /></OwnerRoute></Suspense>
      </Route>
      {/* Hub tab-wrapper routes */}
      <Route path="/ops/clients">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><ClientsHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/clients/:tab">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><ClientsHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/crews-hub">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><CrewsHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/reports-hub">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><ReportsHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/marketing">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><MarketingHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/equipment-hub">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><EquipmentHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/pricing-hub">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><PricingHub /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/resources">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsResources /></OwnerRoute></Suspense>
      </Route>
      <Route path="/ops/rentals">
        <Suspense fallback={<OpsLoading />}><OwnerRoute><OpsRentals /></OwnerRoute></Suspense>
      </Route>

      {/* Customer payment portal — lazy-loaded */}
      <Route path="/portal">
        <Suspense fallback={<OpsLoading />}><PaymentPortal /></Suspense>
      </Route>
      <Route path="/portal/success">
        <Suspense fallback={<OpsLoading />}><PaymentSuccess /></Suspense>
      </Route>
      <Route path="/portal/cancel">
        <Suspense fallback={<OpsLoading />}><PaymentCancel /></Suspense>
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <ScrollToTop />
          <AIChatWidget />
          <SmsToastNotifier />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
