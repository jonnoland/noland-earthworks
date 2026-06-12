/**
 * DashboardLayout — Noland Earthworks Operations Dashboard
 * Style: noland-ops OpsLayout — dark #090909 sidebar, collapsible desktop,
 * mobile overlay, orange active state, all 14 nav items.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  HardHat,
  CalendarDays,
  Users,
  Target,
  FileText,
  Briefcase,
  DollarSign,
  MessageSquare,
  Star,
  ClipboardCheck,
  BarChart2,
  TrendingUp,
  Settings,
  Bell,
  Phone,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  Calculator,
  Share2,
  Globe,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

// ─── Nav items — all 14 pages ─────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/ops",               icon: LayoutDashboard },
  { label: "Crews",         href: "/ops/crews",          icon: HardHat },
  { label: "Schedule",      href: "/ops/schedule",       icon: CalendarDays },
  { label: "Clients",       href: "/ops/clients",        icon: Users },
  { label: "Leads",         href: "/ops/leads",          icon: Target },
  { label: "Quotes",        href: "/ops/quotes",         icon: FileText },
  { label: "Jobs",          href: "/ops/jobs",           icon: Briefcase },
  { label: "Invoices",      href: "/ops/invoices",       icon: DollarSign },
  { label: "Chat Sessions", href: "/ops/chat-sessions",  icon: MessageSquare },
  { label: "Reviews",       href: "/ops/reviews",        icon: Star },
  { label: "Timesheets",    href: "/ops/timesheets",     icon: ClipboardCheck },
  { label: "Scoreboard",    href: "/ops/scoreboard",     icon: BarChart2 },
  { label: "Reports",       href: "/ops/reports",        icon: TrendingUp },
  { label: "Team",          href: "/ops/team",           icon: UserPlus },
  { label: "Cost Estimator", href: "/ops/cost-estimator", icon: Calculator },
  { label: "Ads",           href: "/ops/ads",            icon: Share2 },
  { label: "SEO",           href: "/ops/seo",            icon: Globe },
  { label: "Payments",      href: "/ops/payments",      icon: CreditCard },
  { label: "Settings",      href: "/ops/settings",       icon: Settings },
];

// ─── Jobber reconnect banner ─────────────────────────────────────────────────

function JobberReconnectBanner() {
  const { data, isLoading } = trpc.jobber.connectionStatus.useQuery(undefined, {
    retry: false,
    refetchInterval: 2 * 60 * 1000, // re-check every 2 minutes
  });

  // Don't show while loading or when connected
  if (isLoading || data?.connected) return null;

  const handleReconnect = () => {
    window.location.href = "/api/jobber/connect";
  };

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm shrink-0"
      style={{
        backgroundColor: "rgba(239,68,68,0.12)",
        borderBottom: "1px solid rgba(239,68,68,0.25)",
      }}
    >
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle size={14} className="shrink-0" />
        <span>
          Jobber is disconnected — live data is unavailable.
          {data?.tokenExpired && " The access token expired."}
        </span>
      </div>
      <button
        onClick={handleReconnect}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shrink-0"
      >
        <RefreshCw size={11} />
        Reconnect Jobber
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "JN";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Jobber status pill ───────────────────────────────────────────────────────

function JobberPill({ collapsed }: { collapsed: boolean }) {
  const { data, isLoading } = trpc.jobber.connectionStatus.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60 * 1000,
  });
  const connected = !isLoading && (data as any)?.connected === true;

  return (
    <a
      href="https://secure.getjobber.com/home"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white border border-[#222] rounded-md px-2.5 py-1.5 transition-colors"
      title="Open Jobber"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isLoading ? "bg-muted-foreground animate-pulse" : connected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {!collapsed && (
        <>
          <ExternalLink size={11} className="shrink-0" />
          <span>Jobber</span>
        </>
      )}
    </a>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // Pending team registration count for badge
  const { data: pendingData } = trpc.team.pendingCount.useQuery(undefined, {
    retry: false,
    refetchInterval: 60_000,
  });
  const pendingCount = pendingData?.count ?? 0;

  // Unread chat sessions count for badge
  const { data: chatUnread = 0 } = trpc.chat.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Auth guard
  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-bold text-white">Noland Earthworks</div>
          <div className="text-muted-foreground">Operations Dashboard</div>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/ops") return location === "/ops" || location === "/ops/";
    return location === href || location.startsWith(href + "/");
  };

  const NavLinks = ({ onClickItem }: { onClickItem?: () => void }) => (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const showTeamBadge = item.href === "/ops/team" && pendingCount > 0;
        const showChatBadge = item.href === "/ops/chat-sessions" && chatUnread > 0;
        return (
          <Link key={item.href} href={item.href}>
            <div
              onClick={onClickItem}
              className={`relative flex items-center gap-3 mx-2 my-0.5 px-2 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {showTeamBadge && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {pendingCount}
                </span>
              )}
              {showChatBadge && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-teal-500 text-white text-[10px] font-bold px-1">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] flex">

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col border-r border-[#1e1e1e] bg-[#090909] transition-all duration-200 shrink-0"
        style={{ width: collapsed ? 60 : 180 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center border-b border-[#1e1e1e] shrink-0 overflow-hidden" style={{ height: collapsed ? 56 : 80 }}>
          {collapsed ? (
            <Link href="/">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland_earthworks_logo_3091ee09.png"
                alt="Noland Earthworks"
                className="w-10 h-10 object-contain cursor-pointer"
              />
            </Link>
          ) : (
            <Link href="/">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland_earthworks_logo_3091ee09.png"
                alt="Noland Earthworks"
                className="h-16 w-auto object-contain cursor-pointer px-2"
              />
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Jobber link */}
        <div className="px-3 pb-2 border-t border-[#1e1e1e] pt-2">
          <JobberPill collapsed={collapsed} />
        </div>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-[#1e1e1e]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 px-2 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors text-xs"
          >
            {collapsed ? <ChevronRight size={14} /> : (
              <>
                <ChevronLeft size={14} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[200px] bg-[#090909] border-r border-[#1e1e1e] flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-[#1e1e1e]">
              <div className="flex items-center">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland_earthworks_logo_3091ee09.png"
                  alt="Noland Earthworks"
                  className="h-9 w-auto object-contain"
                />
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-white">
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              <NavLinks onClickItem={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="h-14 border-b border-[#1e1e1e] bg-[#090909] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="md:hidden text-muted-foreground hover:text-white"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            {/* Page title */}
            {title && (
              <div>
                <h1 className="text-sm font-semibold text-white leading-none">{title}</h1>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Phone */}
            <a
              href="tel:6154064819"
              className="hidden sm:flex p-2 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Call"
            >
              <Phone size={16} />
            </a>

            {/* Chat Sessions unread badge — links to /ops/chat-sessions */}
            {chatUnread > 0 && (
              <Link href="/ops/chat-sessions">
                <div className="relative p-2 rounded-md text-teal-400 hover:text-teal-300 hover:bg-white/5 transition-colors cursor-pointer">
                  <MessageSquare size={16} />
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-teal-500 text-white text-[9px] font-bold px-0.5">
                    {chatUnread > 9 ? "9+" : chatUnread}
                  </span>
                </div>
              </Link>
            )}

            {/* User avatar */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 p-1 rounded-md hover:bg-white/5 transition-colors"
                onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
              >
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(user?.name)}
                </div>
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-[#222] rounded-lg shadow-2xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-[#222]">
                    <p className="text-xs font-semibold text-white">{user?.name ?? "Jon Noland"}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email ?? "jonnoland@nolandearthworks.com"}</p>
                  </div>
                  <Link href="/ops/settings">
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      Settings
                    </button>
                  </Link>
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors border-t border-[#222] mt-1 flex items-center gap-2"
                    onClick={async () => { setUserOpen(false); await logout(); window.location.href = "/"; }}
                  >
                    <LogOut size={12} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Jobber disconnected banner — shown on all ops pages when token is expired */}
        <JobberReconnectBanner />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-auto"
        >
          {children}
        </main>

        {/* Mobile bottom nav — first 5 items */}
        <nav className="md:hidden border-t border-[#1e1e1e] bg-[#090909] flex items-center justify-around py-2 shrink-0">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
                  active ? "text-orange-500" : "text-muted-foreground"
                }`}>
                  <Icon size={18} />
                  <span className="text-[10px]">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
