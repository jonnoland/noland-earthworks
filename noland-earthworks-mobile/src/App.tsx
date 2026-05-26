import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

// Routes where BottomNav should be hidden (they have their own PageHeader back button)
const HIDE_BOTTOM_NAV = ["/new-quote"];

function AppShell() {
  const location = useLocation();
  const hideNav =
    HIDE_BOTTOM_NAV.includes(location.pathname) ||
    location.pathname.startsWith("/quotes/");

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "oklch(0.13 0 0)",
        color: "oklch(0.94 0.01 80)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Network status banner — slides in when offline */}
      <NetworkBanner />

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
      {!hideNav && <BottomNav />}
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
