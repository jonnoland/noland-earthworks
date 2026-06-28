/**
 * PricingHub — tab wrapper for Pricing Calculator and Cost Estimator
 */
import { useState } from "react";
import Pricing from "./Pricing";
import CostEstimator from "./CostEstimator";

const TABS = [
  { value: "pricing", label: "Pricing" },
  { value: "estimator", label: "Cost Estimator" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function PricingHub() {
  const [active, setActive] = useState<TabValue>("pricing");

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
        {active === "pricing" && <Pricing />}
        {active === "estimator" && <CostEstimator />}
      </div>
    </div>
  );
}
