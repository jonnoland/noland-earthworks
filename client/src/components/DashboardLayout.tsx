/**
 * DashboardLayout — Noland Earthworks Operations Dashboard
 * OwnRops-aligned sidebar layout with collapsible nav and Jobber integration
 * Color system: #0b0e14 background, #d97706 amber primary, #141820 card
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
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
  BarChart3,
  TrendingUp,
  Settings,
  Bell,
  Phone,
  Menu,
  X,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Navigation structure — mirrors OwnRops dashboard ────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Home",          href: "/ops" },
  { icon: HardHat,         label: "Crews",         href: "/ops/crews",         placeholder: true },
  { icon: CalendarDays,    label: "Schedule",       href: "/ops/schedule" },
];

const navDivider1 = true;

const navItems2 = [
  { icon: Users,           label: "Clients",       href: "/ops/clients",       placeholder: true },
  { icon: Target,          label: "Leads",         href: "/ops/leads" },
  { icon: FileText,        label: "Quotes",        href: "/ops/quotes",        placeholder: true },
  { icon: Briefcase,       label: "Jobs",          href: "/ops/jobs" },
  { icon: DollarSign,      label: "Invoices",      href: "/ops/invoices",      placeholder: true },
  { icon: MessageSquare,   label: "Conversations", href: "/ops/conversations", placeholder: true },
  { icon: Star,            label: "Reviews",       href: "/ops/reviews",       placeholder: true },
];

const navDivider2 = true;

const navItems3 = [
  { icon: ClipboardCheck,  label: "Timesheets",    href: "/ops/timesheets",    placeholder: true },
  { icon: BarChart3,       label: "Scoreboard",    href: "/ops/scoreboard",    placeholder: true },
  { icon: TrendingUp,      label: "Reports",       href: "/ops/reports" },
  { icon: Settings,        label: "Settings",      href: "/ops/settings" },
];

const allNavItems = [...navItems, ...navItems2, ...navItems3];

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);       // mobile drawer
  const [collapsed, setCollapsed] = useState(false);           // desktop collapse
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "JN";

  const handlePlaceholder = (label: string) => {
    toast.info(`${label} — coming soon`);
  };

  // Determine active route
  const isActive = (href: string) => {
    if (href === "/ops") return location === "/ops" || location === "/ops/";
    return location === href || location.startsWith(href + "/");
  };

  // Render a single nav link
  const NavLink = ({ item }: { item: typeof allNavItems[0] }) => {
    const active = isActive(item.href);

    if (item.placeholder) {
      return (
        <div
          className={cn("ops-sidebar-item", active && "active")}
          onClick={() => handlePlaceholder(item.label)}
        >
          <item.icon
            className={cn("h-5 w-5 flex-shrink-0", active ? "text-primary" : "")}
            aria-hidden="true"
          />
          {!collapsed && <span className="flex-1">{item.label}</span>}
        </div>
      );
    }

    return (
      <Link href={item.href}>
        <div className={cn("ops-sidebar-item", active && "active")}>
          <item.icon
            className={cn("h-5 w-5 flex-shrink-0", active ? "text-primary" : "")}
            aria-hidden="true"
          />
          {!collapsed && <span className="flex-1">{item.label}</span>}
        </div>
      </Link>
    );
  };

  // Sidebar inner content (shared between desktop & mobile)
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "flex h-36 shrink-0 items-center overflow-hidden border-b border-sidebar-border",
        mobile ? "justify-between px-4" : collapsed ? "justify-center px-2" : "justify-center px-2"
      )}>
        <Link href="/">
          <div className="flex items-center overflow-hidden">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/noland-earthworks-logo_3844d4ef.jpg"
              alt="Noland Earthworks"
              className="object-contain border-0 h-32 max-w-[560px]"
            />
          </div>
        </Link>
        {mobile && (
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-0.5">
          {navItems.map(item => <NavLink key={item.href} item={item} />)}
          <div className="my-2 border-t border-border" />
          {navItems2.map(item => <NavLink key={item.href} item={item} />)}
          <div className="my-2 border-t border-border" />
          {navItems3.map(item => <NavLink key={item.href} item={item} />)}
        </div>
      </nav>

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <div className="border-t border-border p-2">
          <button
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200", collapsed && "rotate-180")}
              aria-hidden="true"
            />
            {!collapsed && <span className="ml-3">Collapse</span>}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden max-w-[100vw]">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to content
      </a>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          "hidden flex-shrink-0 border-r border-border bg-background lg:flex lg:flex-col",
          "transition-[width] duration-200",
          collapsed ? "w-[60px]" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay ── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Mobile Drawer ── */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border flex flex-col",
          "transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent mobile />
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground p-1"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}
          {title && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-foreground leading-none truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          )}
          {!title && <div className="flex-1" />}

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Phone */}
            <a
              href="tel:6154064819"
              className="hidden sm:flex p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              aria-label="Phone"
            >
              <Phone className="h-4 w-4" />
            </a>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-lg shadow-2xl z-50 p-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Notifications</p>
                  {[
                    { msg: "New lead submitted via website", time: "5m ago", dot: "bg-primary" },
                    { msg: "Job #1042 marked complete", time: "1h ago", dot: "bg-green-500" },
                    { msg: "Invoice #892 overdue by 3 days", time: "3h ago", dot: "bg-destructive" },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.dot}`} />
                      <div>
                        <p className="text-xs text-foreground">{n.msg}</p>
                        <p className="text-[10px] text-muted-foreground">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-secondary/50 transition-colors"
                onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">{userInitials}</span>
                </div>
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-2xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-foreground">{user?.name ?? "Jon Noland"}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email ?? "jonnoland@nolandearthworks.com"}</p>
                  </div>
                  <Link href="/ops/settings">
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:text-foreground hover:bg-secondary/50 transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      Settings
                    </button>
                  </Link>
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-secondary/50 transition-colors border-t border-border mt-1 flex items-center gap-2"
                    onClick={() => { handleLogout(); setUserOpen(false); }}
                  >
                    <LogOut className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-3 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-6 [&>*]:w-full [&>*]:max-w-full"
          style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
