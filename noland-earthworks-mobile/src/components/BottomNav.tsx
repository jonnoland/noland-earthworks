import { NavLink } from "react-router-dom";
import { Home, PlusCircle, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/new-quote", icon: PlusCircle, label: "New Quote" },
  { to: "/quotes", icon: FileText, label: "My Quotes" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav({ updateAvailable = false }: { updateAvailable?: boolean }) {
  return (
    <nav
      className="safe-bottom no-select"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(180deg, var(--ne-clay), var(--ne-soil))",
        borderTop: "1px solid var(--ne-border)",
        boxShadow: "0 -10px 28px oklch(0.08 0.015 70 / 0.3)",
        display: "flex",
        zIndex: 50,
      }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          style={{ flex: 1 }}
        >
          {({ isActive }) => (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                isActive ? "text-brand" : "text-muted"
              )}
              style={{ color: isActive ? "var(--ne-amber)" : "var(--ne-muted)" }}
            >
              <span style={{ position: "relative", display: "inline-flex" }}><Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />{to === "/profile" && updateAvailable && <span aria-label="Update available" style={{ position: "absolute", top: -3, right: -5, width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--ne-amber-strong)", border: "1px solid var(--ne-soil)" }} />}</span>
              <span style={{ fontSize: "10px", fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
