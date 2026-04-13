/**
 * Timesheets — crew time entry management
 * Week navigation, total hours, Pending/Approved/Rejected/All filter tabs, Export Payroll CSV
 * Wired to tRPC ops.timesheets procedures
 */
import { useState, useMemo } from "react";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeek(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
};

export default function Timesheets() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    crewMemberId: "",
    crewId: "",
    clockIn: "",
    clockOut: "",
    notes: "",
  });
  const utils = trpc.useUtils();

  const queryInput = useMemo(() => ({ weekStart, status: statusFilter }), [weekStart, statusFilter]);

  const { data: entries = [], isLoading } = trpc.ops.timesheets.list.useQuery(queryInput);
  const { data: crewList = [] } = trpc.ops.crews.list.useQuery();

  const allMembers = useMemo(() => crewList.flatMap((c) => c.members.map((m) => ({ ...m, crewName: c.name }))), [crewList]);

  const createMutation = trpc.ops.timesheets.create.useMutation({
    onSuccess: () => {
      setShowAddModal(false);
      setForm({ crewMemberId: "", crewId: "", clockIn: "", clockOut: "", notes: "" });
      utils.ops.timesheets.list.invalidate();
      toast.success("Time entry added.");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const updateStatusMutation = trpc.ops.timesheets.updateStatus.useMutation({
    onSuccess: () => utils.ops.timesheets.list.invalidate(),
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const deleteMutation = trpc.ops.timesheets.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      utils.ops.timesheets.list.invalidate();
      toast.success("Entry deleted.");
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function goToCurrentWeek() {
    setWeekStart(getWeekStart(new Date()));
  }

  const totalMinutes = entries.reduce((s, e) => s + (e.entry.durationMinutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  function exportCSV() {
    const rows = [
      ["Member", "Crew", "Clock In", "Clock Out", "Duration", "Status", "Notes"],
      ...entries.map((e) => [
        e.memberName ?? "",
        e.crewName ?? "",
        e.entry.clockIn ? new Date(e.entry.clockIn).toLocaleString() : "",
        e.entry.clockOut ? new Date(e.entry.clockOut).toLocaleString() : "",
        formatDuration(e.entry.durationMinutes),
        e.entry.status,
        e.entry.notes ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${weekStart.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <OpsDashboardLayout title="Timesheets" subtitle="Crew time tracking and payroll approval">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            {formatWeek(weekStart)}
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-white/50">
            Total: <span className="text-white font-semibold">{totalHours}h</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/60 hover:text-white text-xs"
            onClick={exportCSV}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 bg-white/5 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
              statusFilter === tab.key
                ? "bg-amber-500 text-black"
                : "text-white/50 hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/30 text-sm">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <Clock className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No time entries for this week.</p>
            <button className="mt-2 text-amber-400 text-xs hover:underline" onClick={() => setShowAddModal(true)}>
              Add an entry
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Member</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden sm:table-cell">Crew</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Clock In</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden md:table-cell">Clock Out</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Duration</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.entry.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{row.memberName ?? "—"}</p>
                    <p className="text-xs text-white/30">{row.memberRole ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-white/60">{row.crewName ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    {row.entry.clockIn ? new Date(row.entry.clockIn).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-white/60">
                    {row.entry.clockOut ? new Date(row.entry.clockOut).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{formatDuration(row.entry.durationMinutes)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", STATUS_COLORS[row.entry.status])}>
                      {row.entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {row.entry.status === "pending" && (
                        <>
                          <button
                            className="text-white/30 hover:text-green-400 transition-colors p-1"
                            title="Approve"
                            onClick={() => updateStatusMutation.mutate({ id: row.entry.id, status: "approved" })}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="text-white/30 hover:text-red-400 transition-colors p-1"
                            title="Reject"
                            onClick={() => updateStatusMutation.mutate({ id: row.entry.id, status: "rejected" })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        className="text-white/30 hover:text-red-400 transition-colors p-1"
                        title="Delete"
                        onClick={() => setDeleteId(row.entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Add Time Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/30 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Crew Member</label>
                <select
                  value={form.crewMemberId}
                  onChange={(e) => {
                    const member = allMembers.find((m) => String(m.id) === e.target.value);
                    setForm({ ...form, crewMemberId: e.target.value, crewId: member ? String(member.crewId) : form.crewId });
                  }}
                  className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                >
                  <option value="">Select member...</option>
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.crewName})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Clock In</label>
                  <Input
                    type="datetime-local"
                    value={form.clockIn}
                    onChange={(e) => setForm({ ...form, clockIn: e.target.value })}
                    className="bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Clock Out (optional)</label>
                  <Input
                    type="datetime-local"
                    value={form.clockOut}
                    onChange={(e) => setForm({ ...form, clockOut: e.target.value })}
                    className="bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Notes (optional)</label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Job site, task..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="ghost" className="flex-1 text-white/60" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
                disabled={!form.crewMemberId || !form.clockIn || createMutation.isPending}
                onClick={() => {
                  const member = allMembers.find((m) => String(m.id) === form.crewMemberId);
                  createMutation.mutate({
                    crewMemberId: Number(form.crewMemberId),
                    crewId: member ? member.crewId : Number(form.crewId),
                    clockIn: new Date(form.clockIn),
                    clockOut: form.clockOut ? new Date(form.clockOut) : undefined,
                    notes: form.notes || undefined,
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Time Entry</h3>
            <p className="text-white/60 text-sm mb-5">This time entry will be permanently removed.</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-white/60" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deleteId })}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </OpsDashboardLayout>
  );
}
