/**
 * Google Analytics Page — Noland Earthworks Ops
 * Shows key GA4 metrics: sessions, users, bounce rate, top pages, traffic sources
 */

import DashboardLayout from "@/components/DashboardLayout";
import {
  Users, Globe, TrendingUp, Clock, ExternalLink, AlertCircle,
  BarChart2, ArrowUpRight, ArrowDownRight, FileText,
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
        Google Analytics not connected
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-6">
        Connect your GA4 property to see sessions, users, top pages, and traffic sources in your ops dashboard.
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-start gap-2 bg-secondary/40 border border-border rounded-md p-3 text-left max-w-sm">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">Credentials required</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Add <code className="font-mono bg-secondary px-1 rounded">GOOGLE_ANALYTICS_PROPERTY_ID</code> and connect your Google account via Settings &rarr; Integrations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/ops/settings?tab=integrations" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors">
            Go to Integrations
          </a>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Open Google Analytics <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

const CONNECTED = false;

export default function GoogleAnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Google Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Website traffic — last 30 days</p>
          </div>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-md px-3 py-1.5 hover:bg-secondary/80 transition-colors">
            Open GA4 <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {!CONNECTED ? (
          <NotConnectedState />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Sessions"    value="3,241"  subtext="Total visits"        icon={Globe}      trend="up"   trendLabel="+18% vs last month" color="blue"   />
              <MetricCard label="Users"       value="2,108"  subtext="Unique visitors"      icon={Users}      trend="up"   trendLabel="+14% vs last month" color="orange" />
              <MetricCard label="Bounce Rate" value="42%"    subtext="Single-page sessions" icon={TrendingUp} trend="down" trendLabel="-3pts improvement"  color="green"  />
              <MetricCard label="Avg Session" value="2m 18s" subtext="Time on site"         icon={Clock}      trend="up"   trendLabel="+12s vs last month" color="purple" />
            </div>

            {/* Top pages */}
            <div className="ops-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Top Pages</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Page</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Sessions</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Bounce</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { page: "/",                              sessions: "1,240", bounce: "38%", time: "2m 44s" },
                      { page: "/services/forestry-mulching",   sessions: "612",   bounce: "31%", time: "3m 12s" },
                      { page: "/services/land-clearing",       sessions: "488",   bounce: "35%", time: "2m 58s" },
                      { page: "/service-areas/maury-county",   sessions: "312",   bounce: "44%", time: "1m 52s" },
                      { page: "/about",                        sessions: "289",   bounce: "52%", time: "1m 38s" },
                      { page: "/contact",                      sessions: "300",   bounce: "22%", time: "3m 05s" },
                    ].map(row => (
                      <tr key={row.page} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-mono text-foreground">{row.page}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.sessions}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.bounce}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Traffic sources */}
            <div className="ops-card p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Traffic Sources</h3>
              <div className="space-y-2">
                {[
                  { source: "Organic Search", pct: 58, sessions: "1,880" },
                  { source: "Paid Search (Google Ads)", pct: 22, sessions: "713"  },
                  { source: "Direct", pct: 12, sessions: "389"  },
                  { source: "Social (Facebook/Instagram)", pct: 6, sessions: "195"  },
                  { source: "Referral", pct: 2, sessions: "64"   },
                ].map(s => (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-48 shrink-0">{s.source}</span>
                    <div className="flex-1 bg-secondary/60 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{s.sessions}</span>
                    <span className="text-[11px] text-muted-foreground/60 w-8 text-right shrink-0">{s.pct}%</span>
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
