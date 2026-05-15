/**
 * Google Search Console Page — Noland Earthworks Ops
 * Shows key GSC metrics: impressions, clicks, average position, top queries
 */

import DashboardLayout from "@/components/DashboardLayout";
import {
  Search, MousePointerClick, Eye, TrendingUp, ExternalLink, AlertCircle,
  BarChart2, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

function MetricCard({
  label, value, subtext, icon: Icon, trend, trendLabel, color = "orange",
}: {
  label: string; value: string; subtext?: string; icon: React.ElementType;
  trend?: "up" | "down"; trendLabel?: string; color?: "orange" | "blue" | "green" | "purple";
}) {
  const colorMap = {
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    blue:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green:  "text-green-400 bg-green-500/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === "up" ? "text-green-400" : "text-red-400";
  return (
    <div className="ops-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-md border ${colorMap[color]}`}><Icon className="w-3.5 h-3.5" /></div>
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
        {subtext && <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
      {trendLabel && trend && (
        <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />{trendLabel}
        </div>
      )}
    </div>
  );
}

function NotConnectedState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-secondary/60 border border-border flex items-center justify-center mb-4">
        <BarChart2 className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Search Console not connected
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-6">
        Connect Google Search Console to see which search queries are driving traffic to nolandearthworks.com and how your pages rank.
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-start gap-2 bg-secondary/40 border border-border rounded-md p-3 text-left max-w-sm">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">Credentials required</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Connect your Google account via Settings &rarr; Integrations. Search Console uses the same Google OAuth credentials as Google Analytics.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/ops/settings?tab=integrations" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
            Go to Integrations
          </a>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Open Search Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

const CONNECTED = false;

export default function SearchConsolePage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Search Console
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Organic search performance — last 28 days</p>
          </div>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-md px-3 py-1.5 hover:bg-secondary/80 transition-colors">
            Open Search Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {!CONNECTED ? (
          <NotConnectedState />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Impressions"    value="18,440" subtext="Search result views"  icon={Eye}               trend="up"   trendLabel="+22% vs last period" color="blue"   />
              <MetricCard label="Clicks"         value="892"    subtext="Organic clicks"        icon={MousePointerClick} trend="up"   trendLabel="+16% vs last period" color="orange" />
              <MetricCard label="Avg CTR"        value="4.8%"   subtext="Click-through rate"   icon={TrendingUp}        trend="up"   trendLabel="+0.6pts"             color="green"  />
              <MetricCard label="Avg Position"   value="6.2"    subtext="Google ranking"        icon={Search}            trend="up"   trendLabel="-1.4 positions (better)" color="purple" />
            </div>

            {/* Top queries */}
            <div className="ops-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Top Search Queries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Query</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Clicks</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Impressions</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">CTR</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { query: "forestry mulching tennessee",           clicks: "148", impressions: "2,840", ctr: "5.2%", pos: "3.1" },
                      { query: "land clearing middle tennessee",        clicks: "112", impressions: "2,210", ctr: "5.1%", pos: "4.2" },
                      { query: "forestry mulching near me",             clicks: "98",  impressions: "3,120", ctr: "3.1%", pos: "7.8" },
                      { query: "land clearing maury county tn",         clicks: "84",  impressions: "1,440", ctr: "5.8%", pos: "2.9" },
                      { query: "brush clearing columbia tn",            clicks: "72",  impressions: "1,680", ctr: "4.3%", pos: "5.4" },
                      { query: "veteran owned land clearing tennessee", clicks: "61",  impressions: "980",   ctr: "6.2%", pos: "3.6" },
                      { query: "forestry mulcher rental tennessee",     clicks: "44",  impressions: "2,100", ctr: "2.1%", pos: "9.2" },
                      { query: "noland earthworks",                     clicks: "38",  impressions: "420",   ctr: "9.0%", pos: "1.2" },
                    ].map(row => (
                      <tr key={row.query} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="py-2.5 px-3 text-xs text-foreground">{row.query}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.clicks}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.impressions}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.ctr}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.pos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top pages by impressions */}
            <div className="ops-card p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Top Pages by Impressions</h3>
              <div className="space-y-2">
                {[
                  { page: "/services/forestry-mulching",   impressions: 5840, pct: 100 },
                  { page: "/services/land-clearing",       impressions: 4210, pct: 72  },
                  { page: "/",                             impressions: 3120, pct: 53  },
                  { page: "/service-areas/maury-county",   impressions: 2440, pct: 42  },
                  { page: "/service-areas/williamson",     impressions: 1880, pct: 32  },
                ].map(s => (
                  <div key={s.page} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-56 shrink-0 truncate">{s.page}</span>
                    <div className="flex-1 bg-secondary/60 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-14 text-right shrink-0">{s.impressions.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
