/**
 * AdminLayout — OwnrOps-style dark sidebar layout for the admin console.
 * Only accessible to the site owner (enforced server-side via adminProcedure).
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  Calendar,
  UserCheck,
  TrendingUp,
  FileText,
  Briefcase,
  Receipt,
  MessageSquare,
  Star,
  Clock,
  BarChart2,
  PieChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/admin", icon: Home },
  { label: "Crews", path: "/admin/crews", icon: Users },
  { label: "Schedule", path: "/admin/schedule", icon: Calendar },
  { label: "Clients", path: "/admin/clients", icon: UserCheck },
  { label: "Leads", path: "/admin/leads", icon: TrendingUp },
  { label: "Quotes", path: "/admin/quotes", icon: FileText },
  { label: "Jobs", path: "/admin/jobs", icon: Briefcase },
  { label: "Invoices", path: "/admin/invoices", icon: Receipt },
  { label: "Conversations", path: "/admin/conversations", icon: MessageSquare },
  { label: "Reviews", path: "/admin/reviews", icon: Star },
  { label: "Timesheets", path: "/admin/timesheets", icon: Clock },
  { label: "Scoreboard", path: "/admin/scoreboard", icon: BarChart2 },
  { label: "Reports", path: "/admin/reports", icon: PieChart },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  // Auto-connect Jobber: if not connected, redirect to OAuth immediately
  // Skip on /admin/settings to avoid redirect loops during the connect flow
  const isSettingsPage = location === "/admin/settings";
  const { data: connStatus } = trpc.jobber.connectionStatus.useQuery(undefined, {
    enabled: !isSettingsPage,
    retry: false,
  });
  const { data: authUrlData } = trpc.jobber.getAuthUrl.useQuery(undefined, {
    enabled: !isSettingsPage && connStatus !== undefined && !connStatus?.connected,
    retry: false,
  });
  useEffect(() => {
    if (isSettingsPage) return;
    if (connStatus && !connStatus.connected && authUrlData?.url) {
      // Not connected — redirect to Jobber OAuth
      window.location.href = authUrlData.url;
    }
  }, [connStatus, authUrlData, isSettingsPage]);

  const isActive = (path: string) => {
    if (path === "/admin") return location === "/admin";
    return location.startsWith(path);
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      style={{
        width: mobile ? "240px" : collapsed ? "64px" : "220px",
        minWidth: mobile ? "240px" : collapsed ? "64px" : "220px",
        background: "#0f1117",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: mobile ? "fixed" : "sticky",
        top: 0,
        left: 0,
        zIndex: mobile ? 50 : 10,
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflowX: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed && !mobile ? "1rem 0" : "1rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !mobile ? "center" : "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          minHeight: "60px",
        }}
      >
        {(!collapsed || mobile) && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "#E07B2A",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              N
            </div>
            <span style={{ color: "#F0EDE6", fontWeight: 700, fontSize: "14px", whiteSpace: "nowrap" }}>
              Noland Admin
            </span>
          </div>
        )}
        {collapsed && !mobile && (
          <div
            style={{
              width: "28px",
              height: "28px",
              background: "#E07B2A",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            N
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(240,237,230,0.4)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{ background: "none", border: "none", color: "rgba(240,237,230,0.4)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "0.5rem 0", overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              href={path}
              onClick={() => mobile && setMobileOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: collapsed && !mobile ? "0.65rem 0" : "0.65rem 1rem",
                justifyContent: collapsed && !mobile ? "center" : "flex-start",
                color: active ? "#E07B2A" : "rgba(240,237,230,0.65)",
                background: active ? "rgba(224,123,42,0.1)" : "transparent",
                borderLeft: active ? "3px solid #E07B2A" : "3px solid transparent",
                textDecoration: "none",
                fontSize: "13.5px",
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <Icon size={17} className="flex-shrink-0" />
              {(!collapsed || mobile) && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.75rem 0" }}>
        <button
          onClick={() => logout.mutate()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: collapsed && !mobile ? "0.65rem 0" : "0.65rem 1rem",
            justifyContent: collapsed && !mobile ? "center" : "flex-start",
            color: "rgba(240,237,230,0.5)",
            background: "none",
            border: "none",
            cursor: "pointer",
            width: "100%",
            fontSize: "13.5px",
            whiteSpace: "nowrap",
          }}
        >
          <LogOut size={17} />
          {(!collapsed || mobile) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#161b27", color: "#F0EDE6" }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40,
            }}
          />
          <Sidebar mobile />
        </>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Bar */}
        <header
          style={{
            height: "60px",
            background: "#0f1117",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 1.5rem",
            gap: "1rem",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          {/* Mobile menu toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            style={{ background: "none", border: "none", color: "#F0EDE6", cursor: "pointer" }}
          >
            <Menu size={20} />
          </button>
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#F0EDE6", flex: 1 }}>
            {title ?? "Dashboard"}
          </h1>
          <span style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>
            Noland Earthworks Admin
          </span>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
