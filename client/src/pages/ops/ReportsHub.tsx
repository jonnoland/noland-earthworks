/**
 * ReportsHub — tab wrapper for Reports and Scoreboard
 */
import { useState } from "react";
import Reports from "./Reports";
import Scoreboard from "./Scoreboard";

const TABS = [
  { value: "reports", label: "Reports" },
  { value: "scoreboard", label: "Scoreboard" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function ReportsHub() {
  const [active, setActive] = useState<TabValue>("reports");

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Tab bar */}
      <div className="flex items-center gap-0 px-4 pt-3 border-b border-[#1e1e1e] shrink-0 bg-[#0a0a0a]">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActive(tab.value)}
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

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {active === "reports" && <Reports />}
        {active === "scoreboard" && <Scoreboard />}
      </div>
    </div>
  );
}
