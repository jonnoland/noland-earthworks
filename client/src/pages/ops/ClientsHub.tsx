/**
 * ClientsHub — tab wrapper for Clients, Invoices, and Payments
 * Each sub-page renders inside a tab panel. The sidebar links here instead of
 * the individual pages, which remain accessible as direct routes for deep links.
 */
import { useLocation } from "wouter";
import OpsClients from "./Clients";
import OpsInvoices from "./Invoices";
import Payments from "./Payments";

const TABS = [
  { value: "clients", label: "Clients", hash: "" },
  { value: "invoices", label: "Invoices", hash: "#invoices" },
  { value: "payments", label: "Payments", hash: "#payments" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function getActiveTab(hash: string): TabValue {
  if (hash === "#invoices") return "invoices";
  if (hash === "#payments") return "payments";
  return "clients";
}

export default function ClientsHub() {
  const [location, navigate] = useLocation();
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const active = getActiveTab(hash);

  function switchTab(tab: TabValue) {
    const t = TABS.find((t) => t.value === tab);
    navigate("/ops/clients" + (t?.hash ?? ""));
    // Force hash update since wouter may not re-render on hash change
    if (typeof window !== "undefined") {
      window.location.hash = t?.hash.replace("#", "") ?? "";
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-4 pt-3 border-b border-[#1e1e1e] shrink-0 bg-[#0a0a0a]">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => switchTab(tab.value)}
            className={[
              "px-4 pb-2 pt-0 text-sm font-medium border-b-2 transition-colors",
              active === tab.value
                ? "border-amber-400 text-white"
                : "border-transparent text-white/50 hover:text-white/80",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content — only the active tab renders */}
      <div className="flex-1 overflow-auto">
        {active === "clients" && <OpsClients />}
        {active === "invoices" && <OpsInvoices />}
        {active === "payments" && <Payments />}
      </div>
    </div>
  );
}
