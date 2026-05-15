/**
 * Google Ads Analytics Page — Noland Earthworks Ops
 * Shows key Google Ads metrics: impressions, clicks, CTR, spend, conversions
 * Data is pulled from Google Ads API once credentials are connected
 */

import DashboardLayout from "@/components/DashboardLayout";
import {
  TrendingUp, MousePointerClick, Eye, DollarSign, Target,
  ExternalLink, AlertCircle, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, subtext, icon: Icon, trend, trendLabel, color = "orange",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  color?: "orange" | "blue" | "green" | "purple";
}) {
  const colorMap = {
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    blue:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green:  "text-green-400 bg-green-500/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="ops-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-md border ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </div>
        {subtext && <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>}
      </div>
      {trendLabel && trend && (
        <div className={`flex items-center gap-1 text-[11px] font-medium ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          {trendLabel}
        </div>
      )}
    </div>
  );
}

// ─── Not connected state ──────────────────────────────────────────────────────

function NotConnectedState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-secondary/60 border border-border flex items-center justify-center mb-4">
        <BarChart2 className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Google Ads not connected
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-6">
        Connect your Google Ads account to see impressions, clicks, spend, and conversion data directly in your ops dashboard.
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-start gap-2 bg-secondary/40 border border-border rounded-md p-3 text-left max-w-sm">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">Credentials required</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Add <code className="font-mono bg-secondary px-1 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code>, <code className="font-mono bg-secondary px-1 rounded">GOOGLE_ADS_CLIENT_ID</code>, and <code className="font-mono bg-secondary px-1 rounded">GOOGLE_ADS_CLIENT_SECRET</code> to your Secrets, then connect via Settings &rarr; Integrations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/ops/settings?tab=integrations"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            Go to Integrations
          </a>
          <a
            href="https://ads.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Open Google Ads <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign row ─────────────────────────────────────────────────────────────

function CampaignRow({ name, status, impressions, clicks, ctr, spend }: {
  name: string; status: "active" | "paused"; impressions: string; clicks: string; ctr: string; spend: string;
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === "active" ? "bg-green-400" : "bg-muted-foreground"}`} />
          <span className="text-xs font-medium text-foreground">{name}</span>
        </div>
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{impressions}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{clicks}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{ctr}</td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground text-right">{spend}</td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CONNECTED = false; // Set to true once Google Ads credentials are wired

export default function GoogleAdsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Google Ads
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Campaign performance — last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            {CONNECTED && (
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors">
                <RefreshCw className="w-3 h-3" />Refresh
              </button>
            )}
            <a
              href="https://ads.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-md px-3 py-1.5 hover:bg-secondary/80 transition-colors"
            >
              Open Google Ads <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {!CONNECTED ? (
          <NotConnectedState />
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard label="Impressions"  value="24,810"  subtext="Ad views"           icon={Eye}               trend="up"   trendLabel="+12% vs last month" color="blue"   />
              <MetricCard label="Clicks"       value="1,043"   subtext="Link clicks"         icon={MousePointerClick} trend="up"   trendLabel="+8% vs last month"  color="orange" />
              <MetricCard label="CTR"          value="4.2%"    subtext="Click-through rate"  icon={TrendingUp}        trend="up"   trendLabel="+0.4pts"            color="green"  />
              <MetricCard label="Spend"        value="$612"    subtext="Total ad spend"      icon={DollarSign}        trend="down" trendLabel="-$48 vs last month" color="purple" />
              <MetricCard label="Conversions"  value="18"      subtext="Quote form fills"    icon={Target}            trend="up"   trendLabel="+3 vs last month"   color="orange" />
            </div>

            {/* Campaign table */}
            <div className="ops-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Active Campaigns</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Campaign</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Impressions</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Clicks</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">CTR</th>
                      <th className="text-right text-[11px] text-muted-foreground font-medium px-3 py-2 uppercase tracking-wider">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CampaignRow name="Forestry Mulching — Middle TN"   status="active" impressions="14,220" clicks="612" ctr="4.3%" spend="$380" />
                    <CampaignRow name="Land Clearing — Nashville Area"  status="active" impressions="7,840"  clicks="298" ctr="3.8%" spend="$182" />
                    <CampaignRow name="Brush Hogging — Columbia TN"     status="paused" impressions="2,750"  clicks="133" ctr="4.8%" spend="$50"  />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost per conversion */}
            <div className="ops-card p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Cost Efficiency</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">Cost per Click</p>
                  <p className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$0.59</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Cost per Conversion</p>
                  <p className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>$34</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Conversion Rate</p>
                  <p className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.7%</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Avg. Position</p>
                  <p className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1.8</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
