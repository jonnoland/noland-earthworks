import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import OwnerRoute from "./components/OwnerRoute";
import OpsDashboard from "./pages/ops/Dashboard";
import OpsJobs from "./pages/ops/Jobs";
import OpsLeads from "./pages/ops/Leads";
import OpsPricing from "./pages/ops/Pricing";
import OpsSchedule from "./pages/ops/Schedule";
import OpsReports from "./pages/ops/Reports";
import OpsSettings from "./pages/ops/Settings";
import OpsClients from "./pages/ops/Clients";
import OpsQuotes from "./pages/ops/Quotes";
import OpsInvoices from "./pages/ops/Invoices";
import OpsCrews from "./pages/ops/Crews";
import CrewPricing from "./pages/ops/CrewPricing";
import OpsConversations from "./pages/ops/Conversations";
import OpsReviews from "./pages/ops/Reviews";
import OpsTimesheets from "./pages/ops/Timesheets";
import OpsScoreboard from "./pages/ops/Scoreboard";
import OpsDistanceQuotes from "./pages/ops/DistanceQuotes";
import Home from "./pages/Home";
import LandClearingPage from "./pages/LandClearing";
import ForestryMulchingPage from "./pages/ForestryMulching";
import VegetationManagementPage from "./pages/VegetationManagement";
import PropertyMaintenancePage from "./pages/PropertyMaintenance";
import RightOfWayClearingPage from "./pages/RightOfWayClearing";
import QuotePage from "./pages/Quote";
import AboutPage from "./pages/About";
import PricingPage from "./pages/Pricing";
import TermsOfServicePage from "./pages/TermsOfService";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import BlogPage from "./pages/Blog";
import CostOfLandClearing from "./pages/blog/CostOfLandClearing";
import ForestryMulchingVsBulldozing from "./pages/blog/ForestryMulchingVsBulldozing";
import SignsVegetationManagement from "./pages/blog/SignsVegetationManagement";
import BestTimeToClearLand from "./pages/blog/BestTimeToClearLand";
import SitePreparationBeforeBuilding from "./pages/blog/SitePreparationBeforeBuilding";
import LandClearingWilliamsonCounty from "./pages/blog/LandClearingWilliamsonCounty";
import LandClearingDavidsonCounty from "./pages/blog/LandClearingDavidsonCounty";
import LandClearingRutherfordCounty from "./pages/blog/LandClearingRutherfordCounty";
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

function Router() {
  return (
    <Switch>
      {/* Main pages */}
      <Route path="/" component={Home} />
      <Route path="/quote" component={QuotePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />

      {/* Gallery */}
      <Route path="/gallery" component={GalleryPage} />

      {/* Blog / Resources */}
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/cost-of-land-clearing-tennessee" component={CostOfLandClearing} />
      <Route path="/blog/forestry-mulching-vs-bulldozing" component={ForestryMulchingVsBulldozing} />
      <Route path="/blog/signs-you-need-vegetation-management" component={SignsVegetationManagement} />
      <Route path="/blog/best-time-to-clear-land-tennessee" component={BestTimeToClearLand} />
      <Route path="/blog/site-preparation-before-building-tennessee" component={SitePreparationBeforeBuilding} />
      <Route path="/blog/land-clearing-williamson-county" component={LandClearingWilliamsonCounty} />
      <Route path="/blog/land-clearing-davidson-county" component={LandClearingDavidsonCounty} />
      <Route path="/blog/land-clearing-rutherford-county" component={LandClearingRutherfordCounty} />

      {/* Service pages */}
      <Route path="/services/land-clearing" component={LandClearingPage} />
      <Route path="/services/forestry-mulching" component={ForestryMulchingPage} />
      <Route path="/services/vegetation-management" component={VegetationManagementPage} />
      <Route path="/services/property-maintenance" component={PropertyMaintenancePage} />
      <Route path="/services/right-of-way-clearing" component={RightOfWayClearingPage} />

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

      {/* Ops dashboard — owner only */}
      <Route path="/ops">
        <OwnerRoute><OpsDashboard /></OwnerRoute>
      </Route>
      <Route path="/ops/jobs">
        <OwnerRoute><OpsJobs /></OwnerRoute>
      </Route>
      <Route path="/ops/leads">
        <OwnerRoute><OpsLeads /></OwnerRoute>
      </Route>
      <Route path="/ops/pricing">
        <OwnerRoute><OpsPricing /></OwnerRoute>
      </Route>
      <Route path="/ops/schedule">
        <OwnerRoute><OpsSchedule /></OwnerRoute>
      </Route>
      <Route path="/ops/reports">
        <OwnerRoute><OpsReports /></OwnerRoute>
      </Route>
      <Route path="/ops/settings">
        <OwnerRoute><OpsSettings /></OwnerRoute>
      </Route>
      <Route path="/ops/clients">
        <OwnerRoute><OpsClients /></OwnerRoute>
      </Route>
      <Route path="/ops/quotes">
        <OwnerRoute><OpsQuotes /></OwnerRoute>
      </Route>
      <Route path="/ops/invoices">
        <OwnerRoute><OpsInvoices /></OwnerRoute>
      </Route>
      <Route path="/ops/crews">
        <OwnerRoute><OpsCrews /></OwnerRoute>
      </Route>
      <Route path="/ops/crews/:id/pricing">
        <OwnerRoute><CrewPricing /></OwnerRoute>
      </Route>
      <Route path="/ops/conversations">
        <OwnerRoute><OpsConversations /></OwnerRoute>
      </Route>
      <Route path="/ops/reviews">
        <OwnerRoute><OpsReviews /></OwnerRoute>
      </Route>
      <Route path="/ops/timesheets">
        <OwnerRoute><OpsTimesheets /></OwnerRoute>
      </Route>
      <Route path="/ops/scoreboard">
        <OwnerRoute><OpsScoreboard /></OwnerRoute>
      </Route>
      <Route path="/ops/distance-quotes">
        <OwnerRoute><OpsDistanceQuotes /></OwnerRoute>
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
