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
