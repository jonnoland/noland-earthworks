import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import NetworkBanner from "@/components/NetworkBanner";
import Home from "@/pages/Home";
import NewQuote from "@/pages/NewQuote";
import QuotesList from "@/pages/QuotesList";
import QuoteDetail from "@/pages/QuoteDetail";
import Profile from "@/pages/Profile";
import PinLogin from "@/pages/PinLogin";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { useOfflineFieldQuoteSync } from "@/hooks/useOfflineFieldQuoteSync";
import { useThemePreference } from "@/hooks/useThemePreference";

// Routes where BottomNav should be hidden (they have their own PageHeader back button)
const HIDE_BOTTOM_NAV = ["/new-quote"];

function AppShell() {
  const location = useLocation();
  const hideNav =
    HIDE_BOTTOM_NAV.includes(location.pathname) ||
    location.pathname.startsWith("/quotes/");

  // Fire update toast once per session if a newer version is available
  const updateState = useUpdateCheck();
  const syncState = useOfflineFieldQuoteSync();
  useOfflineFieldQuoteSync();
  const { isTransitioning } = useThemePreference();

  return (
    <div
      className={isTransitioning ? "app-shell appearance-fade" : "app-shell"}
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--ne-ground)",
        color: "var(--ne-cream)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Update + general toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--ne-clay)",
            border: "1px solid var(--ne-border)",
            color: "var(--ne-cream)",
            boxShadow: "var(--ne-shadow)",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 14,
          },
        }}
      />

      {/* Network status banner — slides in when offline */}
      <NetworkBanner syncState={syncState} />

      {/* Main content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-quote" element={<NewQuote />} />
          <Route path="/quotes" element={<QuotesList />} />
          <Route path="/quotes/:id" element={<QuoteDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>

      {/* Bottom navigation — hidden on detail/form pages */}
      {!hideNav && <BottomNav updateAvailable={updateState.updateAvailable} />}
    </div>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <PinLogin />;
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default function App() {
  return <AuthGate />;
}
