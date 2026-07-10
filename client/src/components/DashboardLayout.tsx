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
  Images,
  BotMessageSquare,
  BookOpen,
  Truck,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Changelog entries — edit this array to update the changelog ─────────────
const CHANGELOG: { version: string; date: string; items: string[] }[] = [
  {
    version: "1.0.27",
    date: "Jul 10, 2026",
    items: [
      "Homepage: 'Why Primary?' benefits panel is now tap-to-toggle — stays open until you tap outside or press Close (mobile-friendly)",
      "Homepage: 'Get a Free Estimate' CTA button now links directly to the quote form with Forestry Mulching pre-selected",
      "Homepage: Stronger ambient amber glow on the Forestry Mulching primary card (28px rest, 48px hover)",
    ],
  },
  {
    version: "1.0.26",
    date: "Jul 10, 2026",
    items: [
      "Homepage: Forestry Mulching badge now pulses with an amber glow animation to draw attention",
      "Homepage: 'Get a Free Estimate' CTA button added to Forestry Mulching card on hover",
      "Homepage: 'Why Primary?' expandable button on Forestry Mulching card reveals 5 key benefits",
    ],
  },
  {
    version: "1.0.25",
    date: "Jul 10, 2026",
    items: [
      "Homepage: Forestry Mulching service card now shows a 'Primary Service' badge in the top-right corner",
      "Homepage: Forestry Mulching card has a persistent amber border and subtle glow to distinguish it from other service cards",
      "Homepage: Amber top accent bar on Forestry Mulching card is always visible (not hover-only) and slightly thicker",
    ],
  },
  {
    version: "1.0.24",
    date: "Jul 10, 2026",
    items: [
      "SEO: All meta descriptions, FAQ answers, and JSON-LD author schema updated to Land Management terminology",
      "SEO: Blog post CostOfLandClearing metaDescription corrected from 'Land clearing' to 'Land management'",
      "SEO: FAQ answers updated — 'land clearing method' and 'land clearing' exclusions now read 'land management'",
      "SEO: BlogPostLayout author JSON-LD knowsAbout array updated to remove 'land clearing' entry",
    ],
  },
  {
    version: "1.0.23",
    date: "Jul 10, 2026",
    items: [
      "Branding: Forestry Mulching confirmed as primary service across all pages, nav, and AI prompts",
      "Branding: All 'Land Clearing' references updated to 'Land Management' site-wide",
      "Services: Post-Clear Seeding removed from all service listings, add-on menus, calculators, and AI prompts",
      "SEO: /services/add-ons/post-clear-seeding now redirects to Forestry Mulching page",
      "AI: All server-side prompts updated to reflect correct service terminology",
    ],
  },
  {
    version: "1.0.22",
    date: "Jul 9, 2026",
    items: [
      "Prospecting: Regenerate button in AI Draft Outreach modal — get a new message variation instantly",
      "Prospecting: Bulk promote now uses a sequential carousel — review and edit each draft before confirming",
      "Prospecting: Queue progress bar shows position (e.g. Draft 2 of 5) and prospect name during bulk review",
      "Prospecting: Quick-Edit modal now includes a Notes field for extra context before promoting",
      "DB: notes column added to prospecting_leads table",
    ],
  },
  {
    version: "1.0.21",
    date: "Jul 10, 2026",
    items: [
      "Prospecting: AI draft outreach message auto-generated when promoting a prospect to a lead",
      "Prospecting: Bulk select mode — select multiple prospects, promote or dismiss in one action",
      "Prospecting: Quick-edit modal on each card — adjust estimated acreage and margin tier before promoting",
    ],
  },
  {
    version: "1.0.20",
    date: "Jul 9, 2026",
    items: [
      "AI quoting accuracy: 7 issues fixed across the full stack",
      "Prospecting cost floor corrected to $1,047/day — margin tier thresholds recalibrated",
      "Cost Estimator minimum job floor raised from $800 to $1,800",
      "AI Quote panel now pulls live rates from your DB pricing settings",
      "Draft Proposal pricing tightened — ballpark ranges now DB-driven",
      "Lead Qualifier: first click expands structured site inputs (acreage, density, terrain, access)",
      "Morning Brief now includes avg revenue per job, estimated gross margin %, and high-margin prospect count",
      "Prospecting: Add to Leads button — one click promotes a prospect into your lead pipeline",
      "Prospecting: Margin tier filter row (All / High / Medium / Low) added below status filters",
      "Prospecting: High Margin stat card added to stats row — click to filter instantly",
    ],
  },
  {
    version: "1.0.19",
    date: "Jul 9, 2026",
    items: [
      "Prospecting scan now scores each prospect with a margin tier (High / Medium / Low)",
      "HIGH MARGIN badge (green) highlights 3+ acre, dense-vegetation jobs at 55%+ estimated margin",
      "MED MARGIN badge (amber) marks 1-3 acre or moderate-condition jobs at 35-54% margin",
      "LOW MARGIN badge (gray) flags under-1-acre or high-uncertainty jobs",
      "Estimated acreage shown on each prospect card when inferred from the post",
      "High-margin prospect cards highlighted with green border for quick scanning",
    ],
  },
  {
    version: "1.0.18",
    date: "Jul 8, 2026",
    items: [
      "AI Quote prompt updated with current 2025 per-acre rates and cost floor awareness",
      "Proposal draft now includes optional ballpark range when acreage is known",
      "Prospecting scan now explicitly rejects suburban lots under 1 acre",
      "Pricing unified across AI Quote, Lead Qualifier, and Field Quote tools",
      "Cost Estimator: Save to Lead button persists estimate to a lead record",
    ],
  },
  {
    version: "1.0.17",
    date: "Jul 7, 2026",
    items: [
      "Added Rentals tab under Field Work — opens nolandequip rental site in new tab",
      "Added Zapier/Facebook Lead Ads webhook integration with setup guide in Settings",
      "Webhook API key auto-generated, stored securely, and regeneratable",
    ],
  },
  {
    version: "1.0.16",
    date: "Jul 4, 2026",
    items: [
      "Added Send via Messenger button to Facebook prospect Reach Out modal",
      "Prospecting scan now captures poster Facebook profile URL for Messenger deep links",
      "Messenger button shows disabled state with tooltip when profile URL is unavailable",
    ],
  },
  {
    version: "1.0.15",
    date: "Jul 4, 2026",
    items: [
      "Added Post on Facebook button to prospect Reach Out modal for FB and FB Marketplace leads",
      "Added Facebook Marketplace source label and color to prospecting tab",
    ],
  },
  {
    version: "1.0.14",
    date: "Jul 4, 2026",
    items: [
      "Added version indicator to sidebar (desktop and mobile) showing build timestamp",
      "Added Vegetation Management, Right-of-Way Clearing, Trail Cutting, and Stump Grinding to all service dropdowns",
    ],
  },
  {
    version: "1.0.13",
    date: "Jul 4, 2026",
    items: [
      "AI Quote panel in Lead Detail: editable fields, Save to Lead, and Email Draft copy button",
      "Fixed Gemini JSON schema compatibility for AI quote generation",
    ],
  },
  {
    version: "1.0.12",
    date: "Jul 4, 2026",
    items: [
      "Added AI Quote Estimate button to Lead Detail panel",
      "Quote uses lead data, Middle TN market rates, and terrain/density modifiers",
    ],
  },
  {
    version: "1.0.11",
    date: "Jul 4, 2026",
    items: [
      "Public /pricing estimate tool: added Trail Cutting, ROW Clearing, Stump Grinding Only",
      "Service-specific add-on filtering on public estimate form",
    ],
  },
  {
    version: "1.0.10",
    date: "Jul 4, 2026",
    items: [
      "Cost Estimator loading animation with 8 sequential status steps",
      "Added mobilization miles, ROW width, fence line LF, and universal add-ons to Cost Estimator",
    ],
  },
];

// ─── Nav groups — 5 sections ─────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",     href: "/ops",              icon: LayoutDashboard },
    ],
  },
  {
    label: "Field Work",
    items: [
      { label: "Jobs",          href: "/ops/jobs",          icon: Briefcase },
      { label: "Schedule",      href: "/ops/schedule",      icon: CalendarDays },
      { label: "Crews",         href: "/ops/crews-hub",     icon: HardHat },
      { label: "Equipment",     href: "/ops/equipment-hub", icon: Settings },
      { label: "Rentals",        href: "/ops/rentals",       icon: Truck },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Leads",         href: "/ops/leads",         icon: Target },
      { label: "Quotes",        href: "/ops/quotes",        icon: FileText },
      { label: "Clients",       href: "/ops/clients",       icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Marketing",     href: "/ops/marketing",     icon: Share2 },
      { label: "Reviews",       href: "/ops/reviews",       icon: Star },
      { label: "Gallery",       href: "/ops/gallery",       icon: Images },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Reports",       href: "/ops/reports-hub",   icon: TrendingUp },
      { label: "Pricing",       href: "/ops/pricing-hub",   icon: Calculator },
      { label: "Conversations", href: "/ops/conversations",  icon: MessageSquare },
      { label: "Chat Sessions", href: "/ops/chat-sessions", icon: BotMessageSquare },
      { label: "Resources",     href: "/ops/resources",     icon: BookOpen },
      { label: "Team",          href: "/ops/team",          icon: UserPlus },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings",      href: "/ops/settings",      icon: Settings },
    ],
  },
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
  const [changelogOpen, setChangelogOpen] = useState(false);

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
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          {!collapsed && (
            <div className="px-4 pb-1 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.label}
              </span>
            </div>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const showTeamBadge = item.href === "/ops/team" && pendingCount > 0;
            const showChatBadge = item.href === "/ops/chat-sessions" && chatUnread > 0;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={onClickItem}
                  className={`relative flex items-center gap-3 my-0.5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${collapsed ? 'mx-1 px-0 justify-center' : 'mx-2 px-3'} ${
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
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-[#0b0e14] flex">

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col border-r border-[#1e1e1e] bg-[#090909] transition-all duration-200 shrink-0"
        style={{ width: collapsed ? 64 : 220 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center border-b border-[#1e1e1e] shrink-0 overflow-hidden" style={{ height: 56 }}>
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

        {/* Version indicator — clickable to open changelog */}
        {!collapsed && (
          <button
            onClick={() => setChangelogOpen(true)}
            className="px-3 pb-2 text-[10px] text-muted-foreground/40 leading-tight hover:text-muted-foreground/70 transition-colors text-left"
            title={`Built: ${new Date(__BUILD_TIME__).toLocaleString()} — Click to view changelog`}
          >
            v{__APP_VERSION__} &middot; {new Date(__BUILD_TIME__).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </button>
        )}
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
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-[#090909] border-r border-[#1e1e1e] flex flex-col">
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
            <button
              onClick={() => { setMobileOpen(false); setChangelogOpen(true); }}
              className="px-4 pb-3 pt-2 text-[10px] text-muted-foreground/40 border-t border-[#1e1e1e] hover:text-muted-foreground/70 transition-colors text-left w-full"
              title={`Built: ${new Date(__BUILD_TIME__).toLocaleString()} — Click to view changelog`}
            >
              v{__APP_VERSION__} &middot; {new Date(__BUILD_TIME__).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </button>
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
          {NAV_GROUPS.flatMap(g => g.items).slice(0, 5).map((item) => {
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

      {/* ─── Changelog Modal ─────────────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
        <DialogContent className="bg-[#0f0f0f] border-[#1e1e1e] text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-semibold">What's New</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded">
                    v{entry.version}
                  </span>
                  <span className="text-[11px] text-zinc-500">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
