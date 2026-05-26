import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
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
    // Splash screen while reading token from Capacitor Preferences
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "oklch(0.13 0 0)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: "oklch(0.65 0.18 50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="oklch(0.13 0 0)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      </div>
    );
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
