/**
 * OpsDashboardLayout — Noland Earthworks Precision Dark SaaS
 * Collapsible sidebar (240px expanded / 64px icon-only) + main content area
 * Collapse state persisted in localStorage so it survives page navigation.
 * Orange accent on active nav items, dark layered surfaces.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calculator,
  CalendarDays,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  HelpCircle,
  Zap,
  HardHat,
  Star,
  FileText,
  Receipt,
  Megaphone,
  Wrench,
  BotMessageSquare,
  Image,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";

const TEAM_HREF = "/ops/team";
const COLLAPSE_KEY = "ops-sidebar-collapsed";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/ops" },
    ],
  },
  {
    label: "Field Work",
    items: [
      { icon: Briefcase,    label: "Jobs",      href: "/ops/jobs" },
      { icon: CalendarDays, label: "Schedule",  href: "/ops/schedule" },
      { icon: HardHat,      label: "Crews",     href: "/ops/crews-hub" },
      { icon: Wrench,       label: "Equipment", href: "/ops/equipment-hub" },
    ],
  },
  {
    label: "Sales",
    items: [
      { icon: Users,    label: "Leads",   href: "/ops/leads" },
      { icon: FileText, label: "Quotes",  href: "/ops/quotes" },
      { icon: Receipt,  label: "Clients", href: "/ops/clients" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { icon: Megaphone, label: "Marketing", href: "/ops/marketing" },
      { icon: Star,      label: "Reviews",   href: "/ops/reviews" },
      { icon: Image,     label: "Gallery",   href: "/ops/gallery" },
    ],
  },
  {
    label: "Business",
    items: [
      { icon: BarChart3,        label: "Reports",       href: "/ops/reports-hub" },
      { icon: Calculator,       label: "Pricing",       href: "/ops/pricing-hub" },
      { icon: MessageSquare,    label: "Conversations", href: "/ops/conversations" },
      { icon: BotMessageSquare, label: "Chat Sessions", href: "/ops/chat-sessions" },
      { icon: BookOpen,         label: "Resources",     href: "/ops/resources" },
      { icon: Users,            label: "Team",          href: TEAM_HREF },
    ],
  },
];

const bottomItems = [
  { icon: Settings,   label: "Settings",      href: "/ops/settings", placeholder: false },
  { icon: HelpCircle, label: "Help & Support", href: "#",             placeholder: true },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function OpsDashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  // Mobile slide-in state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Desktop collapse state — persisted in localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const { data: chatUnread = 0 } = trpc.chat.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const { data: smsUnread = 0 } = trpc.ops.conversations.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
    retry: false,
  });

  const { data: teamPendingData } = trpc.team.pendingCount.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: false,
  });
  const teamPending = teamPendingData?.count ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "JN";
  const userCompany = "Noland Earthworks, LLC";

  const handlePlaceholder = (label: string) => {
    toast.info(`${label} — coming soon`);
  };

  // ── Shared nav item renderer ──────────────────────────────────────────────
  const NavItem = ({
    item,
    isActive,
    onClose,
  }: {
    item: { icon: React.ComponentType<{ className?: string }>; label: string; href: string };
    isActive: boolean;
    onClose?: () => void;
  }) => {
    const hasChatBadge  = item.href === "/ops/chat-sessions" && chatUnread > 0;
    const hasSMSBadge   = item.href === "/ops/conversations" && smsUnread > 0;
    const hasTeamBadge  = item.href === TEAM_HREF && teamPending > 0;
    const showActiveDot = isActive && !hasChatBadge && !hasSMSBadge && !hasTeamBadge;

    return (
      <Link href={item.href}>
        <div
          onClick={onClose}
          title={collapsed ? item.label : undefined}
          className={cn(
            "ops-sidebar-item flex items-center rounded-md mb-0.5 transition-all duration-150",
            "text-sm font-medium",
            collapsed ? "justify-center px-0 py-2.5 mx-1" : "gap-3 px-3 py-2.5 mx-0",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
          )}
        >
          <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {hasChatBadge && (
                <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
              {hasSMSBadge && (
                <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
                  {smsUnread > 99 ? "99+" : smsUnread}
                </span>
              )}
              {hasTeamBadge && (
                <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {teamPending > 99 ? "99+" : teamPending}
                </span>
              )}
              {showActiveDot && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </>
          )}
          {/* Collapsed badge dots */}
          {collapsed && (hasChatBadge || hasSMSBadge || hasTeamBadge) && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-400" />
          )}
        </div>
      </Link>
    );
  };

  // ── Sidebar inner content (shared between desktop + mobile) ───────────────
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <div className="mb-1 px-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.label}
                </span>
              </div>
            )}
            {collapsed && <div className="my-1 mx-2 border-t border-sidebar-border/40" />}
            {group.items.map((item) => {
              const isActive = location === item.href || (item.href === "/ops" && location === "/ops");
              return (
                <NavItem key={item.href} item={item} isActive={isActive} onClose={onClose} />
              );
            })}
          </div>
        ))}

        {/* Account section */}
        {!collapsed && (
          <div className="mb-1 px-3 pb-1 mt-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Account
            </span>
          </div>
        )}
        {collapsed && <div className="my-1 mx-2 border-t border-sidebar-border/40" />}

        {bottomItems.map((item) => {
          const isActive = location === item.href;
          if (item.placeholder) {
            return (
              <div
                key={item.href}
                onClick={() => handlePlaceholder(item.label)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "ops-sidebar-item flex items-center rounded-md mb-0.5 cursor-pointer transition-all duration-150",
                  "text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40",
                  collapsed ? "justify-center px-0 py-2.5 mx-1" : "gap-3 px-3 py-2.5 mx-0"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "ops-sidebar-item flex items-center rounded-md mb-0.5 transition-all duration-150",
                  "text-sm font-medium",
                  collapsed ? "justify-center px-0 py-2.5 mx-1" : "gap-3 px-3 py-2.5 mx-0",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center p-2 rounded-md hover:bg-sidebar-accent/40 cursor-pointer transition-colors",
            collapsed ? "justify-center" : "gap-3"
          )}
          title={collapsed ? (user?.name ?? "Account") : undefined}
          onClick={handleLogout}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{userInitials}</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "Jon Noland"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userCompany}</p>
              </div>
              <LogOut className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle — desktop only */}
      <div className="hidden lg:block px-2 pb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-2 py-2 px-2 rounded-md",
            "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40 transition-colors text-xs",
            collapsed ? "justify-center" : ""
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0",
          "bg-sidebar border-r border-sidebar-border",
          "transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center border-b border-sidebar-border shrink-0",
            collapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"
          )}
        >
          {collapsed ? (
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/noland-earthworks-logo_3844d4ef.jpg"
              alt="Noland Earthworks"
              className="h-8 w-8 object-contain rounded-sm"
            />
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/noland-earthworks-logo_3844d4ef.jpg"
                alt="Noland Earthworks"
                className="h-9 w-9 object-contain shrink-0 rounded-sm"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold leading-tight text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <span className="text-primary">Noland</span> Earthworks
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">LLC</span>
              </div>
            </div>
          )}
        </div>

        <SidebarContent />
      </aside>

      {/* ── Mobile slide-in sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-60 shrink-0 lg:hidden",
          "bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile logo + close */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/noland-earthworks-logo_3844d4ef.jpg"
              alt="Noland Earthworks"
              className="h-9 w-9 object-contain shrink-0 rounded-sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold leading-tight text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span className="text-primary">Noland</span> Earthworks
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">LLC</span>
            </div>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile nav — never collapsed */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="mb-1 px-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.label}
                </span>
              </div>
              {group.items.map((item) => {
                const isActive = location === item.href || (item.href === "/ops" && location === "/ops");
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "ops-sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5",
                        "text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                      <span className="flex-1">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="mb-1 px-3 pb-1 mt-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Account</span>
          </div>
          {bottomItems.map((item) => (
            <div key={item.href} onClick={() => item.placeholder ? handlePlaceholder(item.label) : setSidebarOpen(false)}>
              <Link href={item.href}>
                <div className="ops-sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-150 cursor-pointer">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-sidebar-accent/40 cursor-pointer transition-colors" onClick={handleLogout}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "Jon Noland"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{userCompany}</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div className="flex-1">
            {title && (
              <div>
                <h1 className="text-base font-semibold text-foreground leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-secondary/50 border border-border rounded-md px-3 py-1.5 w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search jobs, leads..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
            >
              <Bell className="w-4 h-4" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-2xl z-50 p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Notifications</p>
                <p className="text-xs text-muted-foreground py-3 text-center">No new notifications</p>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary/50 transition-colors"
              onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{userInitials}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-2xl z-50 py-1">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">{user?.name ?? "Jon Noland"}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.email ?? ""}</p>
                </div>
                {["Profile", "Billing", "Team"].map((item) => (
                  <button
                    key={item}
                    className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={() => { handlePlaceholder(item); setUserOpen(false); }}
                  >
                    {item}
                  </button>
                ))}
                <button
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-secondary/50 transition-colors border-t border-border mt-1"
                  onClick={() => { handleLogout(); setUserOpen(false); }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
