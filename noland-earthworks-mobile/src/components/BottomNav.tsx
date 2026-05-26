import { NavLink } from "react-router-dom";
import { Home, PlusCircle, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/new-quote", icon: PlusCircle, label: "New Quote" },
  { to: "/quotes", icon: FileText, label: "My Quotes" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  return (
    <nav
      className="safe-bottom no-select"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "oklch(0.16 0 0)",
        borderTop: "1px solid oklch(0.25 0 0)",
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
              style={{ color: isActive ? "oklch(0.65 0.18 50)" : "oklch(0.60 0.01 80)" }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
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
