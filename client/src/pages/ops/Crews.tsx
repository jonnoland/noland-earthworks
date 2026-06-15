/**
 * Crews page — field crew management matching OwnrOps layout.
 * Features:
 *   - Header with today's date, jobs today, clocked-in count
 *   - Crew cards: Day Rate, margin badge, Jobs/Clocked In/Profit stats
 *   - Crew card expanded: cost summary breakdown + team + actions
 *   - Today's jobs panel with empty state and View Schedule CTA
 *   - Bottom quick-action bar: Schedule + Timesheets
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  HardHat,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  CalendarDays,
  UserPlus,
  X,
  Clock,
  TrendingUp,
  DollarSign,
  Wrench,
  Fuel,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type CrewMember = {
  id: number;
  crewId: number;
  name: string;
  role: string | null;
  clockedIn: boolean;
  clockedInAt: Date | null;
  createdAt: Date;
};

type Crew = {
  id: number;
  name: string;
  equipmentType: string;
  dayRate: number;
  costPerDay: number;
  // Detailed pricing fields
  hoursPerDay: number;
  crewMemberCount: number;
  memberWageCents: number;
  burdenPct: number;
  equipmentItems: string;
  machineBurnRateGph: number;
  fuelPriceCents: number;
  truckFuelPerDayCents: number;
  teethCostPerSetCents: number;
  daysPerSet: number;
  annualMajorWearCents: number;
  miscConsumablesPerDayCents: number;
  overheadItems: string;
  workingDaysPerMonth: number;
  targetMarginPct: number;
  acresPerDay: number;
  isActive: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  members: CrewMember[];
};

type Job = {
  id: number;
  title: string;
  client: string;
  scheduledDate: Date | null;
  status: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function marginPct(dayRate: number, costPerDay: number): number {
  if (dayRate === 0) return 0;
  return Math.round(((dayRate - costPerDay) / dayRate) * 100);
}

/** Compute a cost breakdown from the detailed pricing fields stored in cents */
function computeCostBreakdown(crew: Crew) {
  const laborPerDay =
    Math.round(
      (crew.hoursPerDay * crew.crewMemberCount * crew.memberWageCents * (1 + crew.burdenPct / 100)) / 100
    );

  const equipItems: { name: string; monthlyCostCents: number }[] = (() => {
    try { return JSON.parse(crew.equipmentItems); } catch { return []; }
  })();
  const equipPerDay = crew.workingDaysPerMonth > 0
    ? Math.round(equipItems.reduce((s, i) => s + i.monthlyCostCents, 0) / crew.workingDaysPerMonth / 100)
    : 0;

  const fuelPerDay = Math.round(
    (crew.hoursPerDay * crew.machineBurnRateGph * crew.fuelPriceCents + crew.truckFuelPerDayCents) / 100
  );

  const wearPerDay = Math.round(
    (crew.daysPerSet > 0 ? crew.teethCostPerSetCents / crew.daysPerSet : 0) / 100 +
    (crew.workingDaysPerMonth > 0 ? (crew.annualMajorWearCents / 12) / crew.workingDaysPerMonth : 0) / 100 +
    crew.miscConsumablesPerDayCents / 100
  );

  const overheadItemsParsed: { name: string; monthlyCostCents: number }[] = (() => {
    try { return JSON.parse(crew.overheadItems); } catch { return []; }
  })();
  const overheadPerDay = crew.workingDaysPerMonth > 0
    ? Math.round(overheadItemsParsed.reduce((s, i) => s + i.monthlyCostCents, 0) / crew.workingDaysPerMonth / 100)
    : 0;

  const total = laborPerDay + equipPerDay + fuelPerDay + wearPerDay + overheadPerDay;
  return { laborPerDay, equipPerDay, fuelPerDay, wearPerDay, overheadPerDay, total };
}

// ─── Cost Summary Bar ─────────────────────────────────────────────────────────
function CostSummaryBar({ crew }: { crew: Crew }) {
  const { laborPerDay, equipPerDay, fuelPerDay, wearPerDay, overheadPerDay, total } = computeCostBreakdown(crew);

  // Fall back to stored costPerDay if detailed fields are all zero
  const displayTotal = total > 0 ? total : crew.costPerDay;
  const profitPerDay = crew.dayRate - displayTotal;

  const items = [
    { label: "Labor", value: laborPerDay, icon: <UserPlus className="w-3 h-3" />, color: "text-blue-400" },
    { label: "Equipment", value: equipPerDay, icon: <Wrench className="w-3 h-3" />, color: "text-purple-400" },
    { label: "Fuel", value: fuelPerDay, icon: <Fuel className="w-3 h-3" />, color: "text-yellow-400" },
    { label: "Wear", value: wearPerDay, icon: <ShieldAlert className="w-3 h-3" />, color: "text-orange-400" },
    { label: "Overhead", value: overheadPerDay, icon: <Building2 className="w-3 h-3" />, color: "text-red-400" },
  ];

  const hasDetail = total > 0;

  return (
    <div className="mt-4 rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Cost Summary</span>
        <span className="text-xs text-zinc-400 font-semibold">{fmt(displayTotal)}/day</span>
      </div>

      {hasDetail ? (
        <>
          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden mb-3 gap-px">
            {items.map((item) => {
              const pct = displayTotal > 0 ? (item.value / displayTotal) * 100 : 0;
              if (pct < 1) return null;
              const bgMap: Record<string, string> = {
                Labor: "bg-blue-500",
                Equipment: "bg-purple-500",
                Fuel: "bg-yellow-500",
                Wear: "bg-orange-500",
                Overhead: "bg-red-500",
              };
              return (
                <div
                  key={item.label}
                  className={`${bgMap[item.label]} rounded-sm`}
                  style={{ width: `${pct}%` }}
                  title={`${item.label}: ${fmt(item.value)}`}
                />
              );
            })}
          </div>
          {/* Line items */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className={`flex items-center gap-1 ${item.color}`}>
                  {item.icon}
                  <span className="text-[11px]">{item.label}</span>
                </div>
                <span className="text-[11px] text-zinc-300">{fmt(item.value)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-zinc-600 italic">
          Set detailed pricing in{" "}
          <Link href={`/ops/crews/${crew.id}/pricing`} className="text-amber-400 hover:underline">
            View Pricing
          </Link>{" "}
          to see a full cost breakdown.
        </p>
      )}

      {/* Profit summary */}
      {crew.dayRate > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-700/50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-zinc-500">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[11px]">Profit/Day</span>
          </div>
          <span className={`text-xs font-semibold ${profitPerDay >= 0 ? "text-green-400" : "text-red-400"}`}>
            {fmt(profitPerDay)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Crew Card ────────────────────────────────────────────────────────────────
function CrewCard({ crew, jobsToday }: { crew: Crew; jobsToday: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showEditPricing, setShowEditPricing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Operator");
  const [editDayRate, setEditDayRate] = useState(String(crew.dayRate));
  const [editCostPerDay, setEditCostPerDay] = useState(String(crew.costPerDay));
  const utils = trpc.useUtils();

  const profitPerDay = crew.dayRate - crew.costPerDay;
  const margin = marginPct(crew.dayRate, crew.costPerDay);
  const clockedInCount = crew.members.filter((m) => m.clockedIn).length;
  const totalMembers = crew.members.length;

  const updateMeta = trpc.ops.crews.updateMeta.useMutation({
    onSuccess: () => utils.ops.crews.list.invalidate(),
    onError: (e) => toast.error(e.message || "Failed to update crew"),
  });

  const updatePricing = trpc.ops.crews.updatePricing.useMutation({
    onSuccess: () => {
      utils.ops.crews.list.invalidate();
      setShowEditPricing(false);
      toast.success("Pricing updated");
    },
    onError: (e) => toast.error(e.message || "Failed to update pricing"),
  });

  const deleteCrew = trpc.ops.crews.delete.useMutation({
    onSuccess: () => {
      utils.ops.crews.list.invalidate();
      toast.success(`${crew.name} deleted`);
    },
    onError: (e) => toast.error(e.message || "Failed to delete crew"),
  });

  const addMember = trpc.ops.crews.addMember.useMutation({
    onSuccess: () => {
      utils.ops.crews.list.invalidate();
      setShowAddMember(false);
      setNewMemberName("");
      setNewMemberRole("Operator");
      toast.success("Member added");
    },
    onError: (e) => toast.error(e.message || "Failed to add member"),
  });

  const removeMember = trpc.ops.crews.removeMember.useMutation({
    onSuccess: () => utils.ops.crews.list.invalidate(),
    onError: (e) => toast.error(e.message || "Failed to remove member"),
  });

  const toggleClockIn = trpc.ops.crews.toggleClockIn.useMutation({
    onMutate: async ({ id }) => {
      await utils.ops.crews.list.cancel();
      const prev = utils.ops.crews.list.getData();
      utils.ops.crews.list.setData(undefined, (old) =>
        old?.map((c) =>
          c.id === crew.id
            ? {
                ...c,
                members: c.members.map((m) =>
                  m.id === id ? { ...m, clockedIn: !m.clockedIn } : m
                ),
              }
            : c
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.ops.crews.list.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.ops.crews.list.invalidate(),
  });

  return (
    <>
      {/* Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Card header */}
        <div className="p-5">
          {/* Name + equipment type */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                clockedInCount > 0 ? "bg-green-500" : "bg-zinc-500"
              }`}
            />
            <span className="font-semibold text-white text-lg">{crew.name}</span>
            {/* Active/Inactive badge */}
            <button
              onClick={() => updateMeta.mutate({ id: crew.id, isActive: !crew.isActive })}
              title={crew.isActive ? "Mark inactive" : "Mark active"}
              className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${
                crew.isActive
                  ? "bg-green-900/40 text-green-400 border-green-800 hover:bg-green-900/70"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              {crew.isActive ? "Active" : "Inactive"}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-4">
            <Badge variant="outline" className="text-[11px] border-zinc-700 text-zinc-400 bg-zinc-800/50">
              {crew.equipmentType}
            </Badge>
            {/* Color picker */}
            <div className="flex items-center gap-1 ml-auto">
              {["#f59e0b", "#3b82f6", "#a855f7", "#22c55e", "#ef4444", "#ec4899", "#14b8a6", ""].map(c => (
                <button
                  key={c}
                  onClick={() => updateMeta.mutate({ id: crew.id, color: c })}
                  title={c || "No color"}
                  className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${
                    crew.color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c || "#3f3f46" }}
                />
              ))}
            </div>
          </div>

          {/* Day Rate */}
          <div className="mt-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Day Rate</p>
            <p className="text-3xl font-bold text-amber-400">{fmt(crew.dayRate)}</p>
            {crew.dayRate > 0 && (
              <Badge
                className={`mt-1 text-xs ${
                  margin >= 30
                    ? "bg-green-900/60 text-green-400 border-green-800"
                    : margin >= 15
                    ? "bg-yellow-900/60 text-yellow-400 border-yellow-800"
                    : "bg-red-900/60 text-red-400 border-red-800"
                }`}
                variant="outline"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {margin >= 0 ? "+" : ""}{margin}% margin
              </Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-zinc-800">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{jobsToday}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Jobs</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">
                {clockedInCount}/{totalMembers}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Clocked In</p>
            </div>
            <div className="text-center">
              <p className={`text-xl font-bold ${profitPerDay >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(profitPerDay)}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Profit/Day</p>
            </div>
          </div>

          {/* Details toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors py-1"
          >
            {expanded ? (
              <>Hide <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Details <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-zinc-800 p-5 space-y-4">
            {/* Cost summary breakdown */}
            <CostSummaryBar crew={crew} />

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Link href={`/ops/crews/${crew.id}/pricing`} className="flex-1 min-w-[120px]">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-700 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                  View Pricing
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 min-w-[120px] border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={() => {
                  setEditDayRate(String(crew.dayRate));
                  setEditCostPerDay(String(crew.costPerDay));
                  setShowEditPricing(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Rate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </div>

            {/* Team section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Team</p>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>
              {crew.members.length === 0 ? (
                <p className="text-sm text-zinc-600 italic">No team members yet.</p>
              ) : (
                <div className="space-y-2">
                  {crew.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm text-white">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-zinc-500">{member.role}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={member.clockedIn}
                            onCheckedChange={() => toggleClockIn.mutate({ id: member.id })}
                            className="data-[state=checked]:bg-green-600"
                          />
                          <span className="text-xs text-zinc-500 w-12">
                            {member.clockedIn ? "In" : "Off"}
                          </span>
                        </div>
                        <button
                          onClick={() => removeMember.mutate({ id: member.id })}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Rate Modal */}
      <Dialog open={showEditPricing} onOpenChange={setShowEditPricing}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Rate — {crew.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Day Rate (Revenue)</Label>
              <Input
                type="number"
                min={0}
                value={editDayRate}
                onChange={(e) => setEditDayRate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="2361"
              />
              <p className="text-xs text-zinc-500">What you charge per day for this crew.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Cost Per Day (Expenses)</Label>
              <Input
                type="number"
                min={0}
                value={editCostPerDay}
                onChange={(e) => setEditCostPerDay(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="1534"
              />
              <p className="text-xs text-zinc-500">Labor, fuel, and operating costs per day.</p>
            </div>
            {Number(editDayRate) > 0 && (
              <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Profit/Day</span>
                  <span className={Number(editDayRate) - Number(editCostPerDay) >= 0 ? "text-green-400" : "text-red-400"}>
                    {fmt(Number(editDayRate) - Number(editCostPerDay))}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400 mt-1">
                  <span>Margin</span>
                  <span>{marginPct(Number(editDayRate), Number(editCostPerDay))}%</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPricing(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={() =>
                updatePricing.mutate({
                  id: crew.id,
                  dayRate: Number(editDayRate) || 0,
                  costPerDay: Number(editCostPerDay) || 0,
                })
              }
              disabled={updatePricing.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {updatePricing.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete Crew</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="rounded-lg bg-red-950/40 border border-red-900/60 p-3 text-sm text-red-300">
              This will permanently delete <strong>{crew.name}</strong> and all {crew.members.length} team member{crew.members.length !== 1 ? "s" : ""} assigned to it. This cannot be undone.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteCrew.mutate({ id: crew.id });
                setShowDeleteConfirm(false);
              }}
              disabled={deleteCrew.isPending}
            >
              Delete Crew
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Team Member — {crew.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Name</Label>
              <Input
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Jon Noland"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Role</Label>
              <Input
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Operator"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={() =>
                addMember.mutate({
                  crewId: crew.id,
                  name: newMemberName.trim(),
                  role: newMemberRole.trim() || "Operator",
                })
              }
              disabled={!newMemberName.trim() || addMember.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {addMember.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Today's Jobs Panel ───────────────────────────────────────────────────────
function TodaysJobsPanel({ jobs }: { jobs: Job[] }) {
  const today = new Date();
  const todayStr = today.toDateString();
  const todaysJobs = jobs.filter(
    (j) => j.scheduledDate && new Date(j.scheduledDate).toDateString() === todayStr
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Today's Jobs</span>
        </div>
        <span className="text-xs text-zinc-500">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>

      {todaysJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <HardHat className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-zinc-400 font-medium">No jobs scheduled</p>
          <p className="text-zinc-600 text-sm mt-1">Check back tomorrow or view the schedule.</p>
          <Link href="/ops/schedule">
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              View Schedule
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {todaysJobs.map((job) => (
            <div key={job.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{job.title}</p>
                {job.client && (
                  <p className="text-xs text-zinc-500 mt-0.5">{job.client}</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`text-[11px] ${
                  job.status === "completed"
                    ? "border-green-800 text-green-400 bg-green-950/30"
                    : job.status === "in_progress"
                    ? "border-blue-800 text-blue-400 bg-blue-950/30"
                    : "border-zinc-700 text-zinc-400"
                }`}
              >
                {job.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
          <div className="px-5 py-3">
            <Link href="/ops/schedule" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              View full schedule
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Crews() {
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [newEquipmentType, setNewEquipmentType] = useState("Mulcher");
  const [newDayRate, setNewDayRate] = useState("");
  const [newCostPerDay, setNewCostPerDay] = useState("");
  const utils = trpc.useUtils();

  const { data: crewList = [], isLoading } = trpc.ops.crews.list.useQuery();
  const { data: jobsList = [] } = trpc.ops.jobs.list.useQuery();

  const assignCrew = trpc.ops.jobs.assignCrew.useMutation({
    onSuccess: () => {
      utils.ops.jobs.list.invalidate();
      toast.success("Crew assigned.");
    },
    onError: (e) => toast.error(e.message || "Failed to assign crew"),
  });

  const today = new Date();
  const todayStr = today.toDateString();
  const jobsTodayCount = jobsList.filter(
    (j) => j.scheduledDate && new Date(j.scheduledDate).toDateString() === todayStr
  ).length;

  const createCrew = trpc.ops.crews.create.useMutation({
    onSuccess: () => {
      utils.ops.crews.list.invalidate();
      setShowAddCrew(false);
      setNewCrewName("");
      setNewEquipmentType("Mulcher");
      setNewDayRate("");
      setNewCostPerDay("");
      toast.success("Crew created");
    },
    onError: (e) => toast.error(e.message || "Failed to create crew"),
  });

  const totalClockedIn = crewList.reduce(
    (sum, c) => sum + c.members.filter((m) => m.clockedIn).length,
    0
  );
  const totalMembers = crewList.reduce((sum, c) => sum + c.members.length, 0);

  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <DashboardLayout>
      {/* Main content — padded bottom to clear the fixed bottom bar */}
      <div className="p-6 max-w-4xl mx-auto pb-24">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl font-bold text-white">Crews</h1>
            </div>
            <p className="text-sm text-zinc-400">
              {dayOfWeek}, {monthDay} &middot; {jobsTodayCount} job{jobsTodayCount !== 1 ? "s" : ""} today &middot; {totalClockedIn}/{totalMembers} clocked in
            </p>
          </div>
          <Button
            onClick={() => setShowAddCrew(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Crew
          </Button>
        </div>

        {/* Crew cards */}
        {isLoading ? (
          <div className="space-y-4 mb-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : crewList.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center mb-6">
            <HardHat className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No crews yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Add your first crew to start tracking daily rates and clock-in status.
            </p>
            <Button
              onClick={() => setShowAddCrew(true)}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Crew
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            {crewList.map((crew) => (
              <CrewCard key={crew.id} crew={crew} jobsToday={jobsTodayCount} />
            ))}
          </div>
        )}

        {/* Today's jobs panel */}
        <TodaysJobsPanel jobs={jobsList as unknown as Job[]} />

        {/* Job Assignments */}
        {jobsList.length > 0 && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <HardHat className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Assign Crews to Jobs</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {jobsList.map((job) => {
                const assignedCrew = crewList.find((c) => c.id === (job as any).crewId);
                return (
                  <div key={job.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{job.title ?? job.client ?? "Untitled Job"}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {job.client ?? ""}
                        {job.scheduledDate ? ` · ${new Date(job.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                        {" · "}
                        <span className={`capitalize ${
                          job.status === "completed" ? "text-green-400" :
                          job.status === "in_progress" ? "text-blue-400" :
                          "text-zinc-400"
                        }`}>{job.status?.replace("_", " ") ?? ""}</span>
                      </p>
                    </div>
                    <select
                      value={(job as any).crewId ?? ""}
                      onChange={(e) =>
                        assignCrew.mutate({
                          jobId: job.id,
                          crewId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="shrink-0 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500 min-w-[140px]"
                    >
                      <option value="">No crew</option>
                      {crewList.filter((c) => c.isActive).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom quick-action bar — fixed */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <Link href="/ops/schedule" className="flex-1">
          <button className="w-full flex items-center justify-center gap-2 py-4 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors border-r border-zinc-800">
            <CalendarDays className="w-4 h-4" />
            Schedule
          </button>
        </Link>
        <Link href="/ops/timesheets" className="flex-1">
          <button className="w-full flex items-center justify-center gap-2 py-4 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
            <Clock className="w-4 h-4" />
            Timesheets
          </button>
        </Link>
      </div>

      {/* Add Crew Modal */}
      <Dialog open={showAddCrew} onOpenChange={setShowAddCrew}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Crew</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Crew Name</Label>
              <Input
                value={newCrewName}
                onChange={(e) => setNewCrewName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Main Crew"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Equipment Type</Label>
              <Input
                value={newEquipmentType}
                onChange={(e) => setNewEquipmentType(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="Mulcher"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Day Rate ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newDayRate}
                  onChange={(e) => setNewDayRate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="2361"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Cost/Day ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newCostPerDay}
                  onChange={(e) => setNewCostPerDay(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="1534"
                />
              </div>
            </div>
            {Number(newDayRate) > 0 && (
              <div className="rounded-lg bg-zinc-800 p-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Profit/Day</span>
                  <span className={Number(newDayRate) - Number(newCostPerDay) >= 0 ? "text-green-400" : "text-red-400"}>
                    {fmt(Number(newDayRate) - Number(newCostPerDay))}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400 mt-1">
                  <span>Margin</span>
                  <span>{marginPct(Number(newDayRate), Number(newCostPerDay))}%</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCrew(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={() =>
                createCrew.mutate({
                  name: newCrewName.trim(),
                  equipmentType: newEquipmentType.trim() || "Mulcher",
                  dayRate: Number(newDayRate) || 0,
                  costPerDay: Number(newCostPerDay) || 0,
                })
              }
              disabled={!newCrewName.trim() || createCrew.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {createCrew.isPending ? "Creating..." : "Create Crew"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
