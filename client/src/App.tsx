import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import LandClearingPage from "./pages/LandClearing";
import ForestryMulchingPage from "./pages/ForestryMulching";
import VegetationManagementPage from "./pages/VegetationManagement";
import PropertyMaintenancePage from "./pages/PropertyMaintenance";
import QuotePage from "./pages/Quote";
import AboutPage from "./pages/About";
import PricingPage from "./pages/Pricing";
import TermsOfServicePage from "./pages/TermsOfService";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import AdminHome from "./pages/admin/AdminHome";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminClients from "./pages/admin/AdminClients";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminCrews from "./pages/admin/AdminCrews";
import AdminTimesheets from "./pages/admin/AdminTimesheets";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminConversations from "./pages/admin/AdminConversations";
import AdminScoreboard from "./pages/admin/AdminScoreboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import MaintenancePage from "./pages/Maintenance";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
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
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {/* Main pages */}
      <Route path="/" component={Home} />
      <Route path="/quote" component={QuotePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/maintenance" component={MaintenancePage} />

      {/* Service pages */}
      <Route path="/services/land-clearing" component={LandClearingPage} />
      <Route path="/services/forestry-mulching" component={ForestryMulchingPage} />
      <Route path="/services/vegetation-management" component={VegetationManagementPage} />
      <Route path="/services/property-maintenance" component={PropertyMaintenancePage} />

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

      {/* Admin console — owner-only */}
      <Route path="/admin" component={AdminGuard(AdminHome)} />
      <Route path="/admin/leads" component={AdminGuard(AdminLeads)} />
      <Route path="/admin/quotes" component={AdminGuard(AdminQuotes)} />
      <Route path="/admin/jobs" component={AdminGuard(AdminJobs)} />
      <Route path="/admin/clients" component={AdminGuard(AdminClients)} />
      <Route path="/admin/invoices" component={AdminGuard(AdminInvoices)} />
      <Route path="/admin/schedule" component={AdminGuard(AdminSchedule)} />
      <Route path="/admin/crews" component={AdminGuard(AdminCrews)} />
      <Route path="/admin/timesheets" component={AdminGuard(AdminTimesheets)} />
      <Route path="/admin/reviews" component={AdminGuard(AdminReviews)} />
      <Route path="/admin/conversations" component={AdminGuard(AdminConversations)} />
      <Route path="/admin/scoreboard" component={AdminGuard(AdminScoreboard)} />
      <Route path="/admin/reports" component={AdminGuard(AdminReports)} />
      <Route path="/admin/settings" component={AdminGuard(AdminSettings)} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** HOC that blocks non-owners from admin pages */
function AdminGuard(Component: React.ComponentType) {
  return function GuardedAdmin() {
    const { user, loading } = useAuth();
    if (loading) {
      return (
        <div style={{ minHeight: "100vh", background: "#0f1623", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,230,0.4)", fontSize: "14px" }}>
          Checking access...
        </div>
      );
    }
    if (!user) {
      window.location.href = getLoginUrl();
      return null;
    }
    // Only the owner (role === 'admin') can access
    if (user.role !== "admin") {
      return (
        <div style={{ minHeight: "100vh", background: "#0f1623", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "48px" }}>🔒</div>
          <div style={{ color: "#F0EDE6", fontSize: "20px", fontWeight: 700 }}>Access Denied</div>
          <div style={{ color: "rgba(240,237,230,0.45)", fontSize: "14px" }}>This page is restricted to the site owner.</div>
          <a href="/" style={{ color: "#E07B2A", fontSize: "14px", textDecoration: "underline" }}>Return to site</a>
        </div>
      );
    }
    return <Component />;
  };
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
