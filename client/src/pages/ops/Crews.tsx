/**
 * Crews page — field crew management matching OwnrOps layout.
 * Crew cards show Day Rate, Cost/Day, Profit/Day, margin %, Jobs today,
 * Clocked In count, and a team section with clock-in toggles.
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
  createdAt: Date;
  updatedAt: Date;
  members: CrewMember[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function marginPct(dayRate: number, costPerDay: number): number {
  if (dayRate === 0) return 0;
  return Math.round(((dayRate - costPerDay) / dayRate) * 100);
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
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                clockedInCount > 0 ? "bg-green-500" : "bg-zinc-500"
              }`}
            />
            <span className="font-semibold text-white text-lg">{crew.name}</span>
          </div>
          <p className="text-zinc-400 text-sm ml-4">{crew.equipmentType}</p>

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
            {/* Pricing detail */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Cost/Day</p>
                <p className="text-lg font-semibold text-white">{fmt(crew.costPerDay)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Profit/Day</p>
                <p className={`text-lg font-semibold ${profitPerDay >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmt(profitPerDay)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Link href={`/ops/crews/${crew.id}/pricing`} className="flex-1 min-w-[120px]">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-700 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
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
                Edit Pricing
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
                      className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
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

            {/* View Schedule link */}
            <Link
              href="/ops/schedule"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400 transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              View Schedule
            </Link>
          </div>
        )}
      </div>

      {/* Edit Pricing Modal */}
      <Dialog open={showEditPricing} onOpenChange={setShowEditPricing}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Edit Pricing — {crew.name}</DialogTitle>
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
              {updatePricing.isPending ? "Saving..." : "Save Pricing"}
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

  // Count jobs scheduled for today per crew (by crewName matching)
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

  // Summary stats
  const totalClockedIn = crewList.reduce(
    (sum, c) => sum + c.members.filter((m) => m.clockedIn).length,
    0
  );
  const totalMembers = crewList.reduce((sum, c) => sum + c.members.length, 0);

  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HardHat className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl font-bold text-white">Crews</h1>
            </div>
            <p className="text-sm text-zinc-400">
              {dayOfWeek}, {dateStr} &middot; {jobsTodayCount} job{jobsTodayCount !== 1 ? "s" : ""} today &middot; {totalClockedIn}/{totalMembers} clocked in
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
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : crewList.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {crewList.map((crew) => (
              <CrewCard key={crew.id} crew={crew} jobsToday={jobsTodayCount} />
            ))}
          </div>
        )}
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
