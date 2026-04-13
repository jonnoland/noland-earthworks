/**
 * Scoreboard — business performance summary
 * 4 KPI cards (revenue, jobs completed, avg job value, lead conversion rate)
 * Monthly performance table and recent wins — derived from live jobs/leads data
 */
import { useMemo } from "react";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-[#161616] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <div className="flex items-center justify-between mt-1">
        {sub && <p className="text-xs text-white/40">{sub}</p>}
        {trend && (
          <span className={cn("text-xs font-medium", trend.positive ? "text-green-400" : "text-red-400")}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  estimate: "Estimate",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
  paid: "Paid",
};

const STATUS_COLORS: Record<string, string> = {
  estimate: "bg-white/10 text-white/50",
  scheduled: "bg-blue-500/15 text-blue-300",
  in_progress: "bg-amber-400/15 text-amber-400",
  completed: "bg-green-500/15 text-green-400",
  invoiced: "bg-purple-500/15 text-purple-300",
  paid: "bg-green-600/20 text-green-300",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  land_clearing: "Land Clearing",
  forestry_mulching: "Forestry Mulching",
  brush_removal: "Brush Removal",
  stump_grinding: "Stump Grinding",
  wildfire_mitigation: "Wildfire Mitigation",
};

export default function Scoreboard() {
  const { data: jobList = [], isLoading: loadingJobs } = trpc.ops.jobs.list.useQuery();
  const { data: leadList = [], isLoading: loadingLeads } = trpc.ops.leads.list.useQuery();

  const stats = useMemo(() => {
    const completedJobs = jobList.filter((j) => j.status === "completed" || j.status === "invoiced" || j.status === "paid");
    const paidJobs = jobList.filter((j) => j.status === "paid");

    const totalRevenue = paidJobs.reduce((s, j) => {
      const price = parseFloat(j.totalPrice?.replace(/[^0-9.]/g, "") ?? "0");
      return s + (isNaN(price) ? 0 : price);
    }, 0);

    const avgJobValue = completedJobs.length > 0
      ? completedJobs.reduce((s, j) => {
          const price = parseFloat(j.totalPrice?.replace(/[^0-9.]/g, "") ?? "0");
          return s + (isNaN(price) ? 0 : price);
        }, 0) / completedJobs.length
      : 0;

    const wonLeads = leadList.filter((l) => l.stage === "won" || l.stage === "converted").length;
    const totalLeads = leadList.length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Jobs by type breakdown
    const byType: Record<string, number> = {};
    for (const job of jobList) {
      byType[job.jobType] = (byType[job.jobType] ?? 0) + 1;
    }

    // Recent completed jobs (last 10)
    const recentWins = [...completedJobs]
      .sort((a, b) => {
        const da = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        const db = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);

    // Pipeline by stage
    const byStage: Record<string, number> = {};
    for (const lead of leadList) {
      byStage[lead.stage] = (byStage[lead.stage] ?? 0) + 1;
    }

    return { totalRevenue, completedJobs: completedJobs.length, avgJobValue, conversionRate, byType, recentWins, byStage, totalLeads, wonLeads };
  }, [jobList, leadList]);

  const isLoading = loadingJobs || loadingLeads;

  return (
    <OpsDashboardLayout title="Scoreboard" subtitle="Business performance at a glance">
      {isLoading ? (
        <div className="p-10 text-center text-white/30 text-sm">Loading data...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              icon={DollarSign}
              label="Total Revenue"
              value={stats.totalRevenue > 0 ? `$${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              sub="Paid jobs only"
              color="bg-green-500/10 text-green-400"
            />
            <KpiCard
              icon={Briefcase}
              label="Jobs Completed"
              value={stats.completedJobs}
              sub={`${jobList.length} total jobs`}
              color="bg-amber-400/10 text-amber-400"
            />
            <KpiCard
              icon={TrendingUp}
              label="Avg Job Value"
              value={stats.avgJobValue > 0 ? `$${stats.avgJobValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              sub="Completed jobs"
              color="bg-blue-500/10 text-blue-400"
            />
            <KpiCard
              icon={Target}
              label="Lead Conversion"
              value={`${stats.conversionRate}%`}
              sub={`${stats.wonLeads} of ${stats.totalLeads} leads`}
              color="bg-purple-500/10 text-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Wins */}
            <div className="lg:col-span-2 bg-[#111] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Recent Completed Jobs
                </h3>
              </div>
              {stats.recentWins.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm">No completed jobs yet.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-5 py-2.5 text-xs text-white/40 font-medium">Job</th>
                      <th className="text-left px-5 py-2.5 text-xs text-white/40 font-medium hidden sm:table-cell">Type</th>
                      <th className="text-left px-5 py-2.5 text-xs text-white/40 font-medium">Value</th>
                      <th className="text-left px-5 py-2.5 text-xs text-white/40 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentWins.map((job) => (
                      <tr key={job.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm text-white font-medium truncate max-w-[180px]">{job.title}</p>
                          <p className="text-xs text-white/40 truncate">{job.client}</p>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell text-xs text-white/50">
                          {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
                        </td>
                        <td className="px-5 py-3 text-sm text-white">
                          {job.totalPrice ? `$${job.totalPrice.replace(/[^0-9.]/g, "")}` : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[job.status])}>
                            {STATUS_LABELS[job.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right column — breakdowns */}
            <div className="space-y-4">
              {/* Jobs by type */}
              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  Jobs by Type
                </h3>
                {Object.keys(stats.byType).length === 0 ? (
                  <p className="text-white/30 text-xs">No jobs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.byType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-xs text-white/60">{JOB_TYPE_LABELS[type] ?? type}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${Math.round((count / jobList.length) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/40 w-4 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Lead pipeline */}
              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Lead Pipeline
                </h3>
                {Object.keys(stats.byStage).length === 0 ? (
                  <p className="text-white/30 text-xs">No leads yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.byStage)
                      .sort((a, b) => b[1] - a[1])
                      .map(([stage, count]) => (
                        <div key={stage} className="flex items-center justify-between">
                          <span className="text-xs text-white/60 capitalize">{stage.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-400 rounded-full"
                                style={{ width: `${Math.round((count / stats.totalLeads) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/40 w-4 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </OpsDashboardLayout>
  );
}
