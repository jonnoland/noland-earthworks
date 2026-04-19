/**
 * Schedule Page — Noland Earthworks
 * Live data from tRPC: list, create, delete schedule entries
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, X, Calendar, RefreshCw, ExternalLink, AlertCircle, CheckCircle2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// Color palette per job type
const JOB_TYPE_COLORS: Record<string, string> = {
  forestry_mulching:  "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  land_clearing:      "border-sky-500/40 bg-sky-500/15 text-sky-300",
  brush_hogging:      "border-orange-500/40 bg-orange-500/15 text-orange-300",
  lot_clearing:       "border-violet-500/40 bg-violet-500/15 text-violet-300",
  row_clearing:       "border-pink-500/40 bg-pink-500/15 text-pink-300",
  fire_mitigation:    "border-red-500/40 bg-red-500/15 text-red-300",
  storm_cleanup:      "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
};
const DEFAULT_JOB_COLOR = "border-amber-500/40 bg-amber-500/15 text-amber-300";

function getJobTypeColor(jobType?: string | null): string {
  if (!jobType) return DEFAULT_JOB_COLOR;
  const key = jobType.toLowerCase().replace(/[\s-]+/g, "_");
  return JOB_TYPE_COLORS[key] ?? DEFAULT_JOB_COLOR;
}

const CREW_COLORS = [
  "bg-primary/20 border-primary/40 text-primary",
  "bg-blue-500/20 border-blue-500/40 text-blue-400",
  "bg-purple-500/20 border-purple-500/40 text-purple-400",
  "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
  "bg-green-500/20 border-green-500/40 text-green-400",
  "bg-pink-500/20 border-pink-500/40 text-pink-400",
];

function getWeekStart(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface EntryFormData {
  title: string;
  crewName: string;
  date: string;
  startHour: number;
  endHour: number;
  notes: string;
}

const emptyForm: EntryFormData = {
  title: "", crewName: "Crew A", date: "", startHour: 7, endHour: 17, notes: "",
};

// ─── Jobber Visits Section ─────────────────────────────────────────────────────────────

function JobberVisitsSection() {
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.visits.useQuery({ first: 50 }, { retry: false });

  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: Array<{
    id: string;
    title?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    status?: string | null;
    job?: {
      id?: string;
      jobNumber?: number | null;
      title?: string | null;
      client?: { name?: string | null } | null;
    } | null;
    assignedUsers?: { nodes?: Array<{ id: string; name?: string | null }> } | null;
  }> = (data as any)?.nodes ?? [];

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  const formatDateTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <div className="px-6 pb-6">
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/10 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Jobber Visits</span>
            {!isLoading && !notConnected && (
              <span className="text-[10px] bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded-full">
                {totalCount} visits
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh Jobber visits"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <a
              href="https://secure.getjobber.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Jobber
            </a>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not connected */}
        {!isLoading && notConnected && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <AlertCircle className="w-6 h-6 text-yellow-500/60" />
            <p className="text-xs text-muted-foreground">
              Connect Jobber in{" "}
              <a href="/ops/settings" className="text-primary hover:underline">Settings</a>{" "}
              to see live visits.
            </p>
          </div>
        )}

        {/* Visits grid */}
        {!isLoading && !notConnected && (
          <>
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Calendar className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No visits found in Jobber.</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nodes.map(visit => (
                  <div
                    key={visit.id}
                    className={cn(
                      "rounded-lg border p-3 flex flex-col gap-1.5",
                      visit.status === "COMPLETE"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate flex-1">
                        {visit.title || visit.job?.title || "Visit"}
                      </span>
                      {visit.status === "COMPLETE" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : (
                        <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">
                          Scheduled
                        </span>
                      )}
                    </div>
                    {visit.job?.client?.name && (
                      <p className="text-[10px] text-muted-foreground">{visit.job.client.name}</p>
                    )}
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div>Start: {formatDateTime(visit.startAt)}</div>
                      {visit.endAt && <div>End: {formatDateTime(visit.endAt)}</div>}
                    </div>
                    {visit.assignedUsers?.nodes && visit.assignedUsers.nodes.length > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        Assigned: {visit.assignedUsers.nodes.map(u => u.name).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── DnD sub-components ──────────────────────────────────────────────────────

function DraggableJobBanner({ job }: { job: { id: number; client: string; jobType?: string | null; acres?: string | null } }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `job-${job.id}` });
  const colorClass = getJobTypeColor(job.jobType);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-md border px-2 py-1.5 text-[10px] cursor-grab active:cursor-grabbing select-none flex items-start gap-1",
        colorClass,
        isDragging && "opacity-40"
      )}
    >
      <GripVertical className="w-2.5 h-2.5 opacity-40 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="font-semibold truncate">{job.client}</div>
        <div className="opacity-70 capitalize">{job.jobType?.replace(/_/g, " ") ?? "clearing"}{job.acres ? ` · ${job.acres} ac` : ""}</div>
      </div>
    </div>
  );
}

function DroppableDayCell({ dayKey, children, isToday }: { dayKey: string; children: React.ReactNode; isToday: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${dayKey}` });
  return (
    <td
      ref={setNodeRef}
      className={cn(
        "px-2 py-2 align-top min-w-[110px] transition-colors",
        isToday ? "bg-primary/5" : "",
        isOver ? "bg-amber-500/10 ring-1 ring-inset ring-amber-500/40" : ""
      )}
    >
      {children}
    </td>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Schedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EntryFormData>(emptyForm);
  const [draggingJobId, setDraggingJobId] = useState<number | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{ jobId: number; newStart: Date; newEnd?: Date; newDateKey: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const utils = trpc.useUtils();
  const { data: entries = [], isLoading } = trpc.ops.schedule.list.useQuery();
  const { data: allJobs = [] } = trpc.ops.jobs.list.useQuery();

  // Jobs with a scheduledDate — shown as amber banners on the calendar
  const scheduledJobs = useMemo(() =>
    allJobs.filter(j => j.scheduledDate && j.status !== "completed" && j.status !== "paid"),
  [allJobs]);

  const rescheduleJob = trpc.ops.jobs.update.useMutation({
    onSuccess: () => { utils.ops.jobs.list.invalidate(); toast.success("Job rescheduled"); },
    onError: (e) => toast.error(e.message),
  });

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("job-")) setDraggingJobId(Number(id.replace("job-", "")));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingJobId(null);
    const { active, over } = event;
    if (!over) return;
    const jobId = Number(String(active.id).replace("job-", ""));
    const newDateKey = String(over.id).replace("drop-", "");
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    const oldDateKey = job.scheduledDate ? new Date(job.scheduledDate).toISOString().split("T")[0] : null;
    if (oldDateKey === newDateKey) return;
    const oldStart = job.scheduledDate ? new Date(job.scheduledDate) : null;
    const oldEnd = (job as any).scheduledEndDate ? new Date((job as any).scheduledEndDate) : null;
    const newStart = new Date(newDateKey + "T12:00:00");
    let newEnd: Date | undefined;
    if (oldStart && oldEnd) {
      const diffMs = oldEnd.getTime() - oldStart.getTime();
      newEnd = new Date(newStart.getTime() + diffMs);
    }
    // Show confirmation dialog instead of mutating immediately
    setPendingReschedule({ jobId, newStart, newEnd, newDateKey });
  };

  const confirmReschedule = () => {
    if (!pendingReschedule) return;
    rescheduleJob.mutate({
      id: pendingReschedule.jobId,
      scheduledDate: pendingReschedule.newStart,
      ...(pendingReschedule.newEnd ? { scheduledEndDate: pendingReschedule.newEnd } : {}),
    });
    setPendingReschedule(null);
  };

  const createEntry = trpc.ops.schedule.create.useMutation({
    onSuccess: () => { utils.ops.schedule.list.invalidate(); toast.success("Entry added"); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEntry = trpc.ops.schedule.delete.useMutation({
    onSuccess: () => { utils.ops.schedule.list.invalidate(); toast.success("Entry removed"); },
    onError: (e) => toast.error(e.message),
  });

  const closeModal = () => { setShowModal(false); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEntry.mutate({
      title: form.title,
      crewName: form.crewName,
      date: new Date(form.date + "T12:00:00"),
      startHour: form.startHour,
      endHour: form.endHour,
      notes: form.notes || undefined,
    });
  };

  // Build week days
  const weekDays = useMemo(() => {
    const start = getWeekStart(weekOffset);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, key: formatDateKey(d), label: formatDayLabel(d), dayName: d.toLocaleDateString("en-US", { weekday: "short" }) };
    });
  }, [weekOffset]);

  const weekLabel = `${weekDays[0].label} – ${weekDays[5].label}`;

  // Map job date ranges to day keys visible in the current week
  const jobDayMap = useMemo(() => {
    const map: Record<string, typeof scheduledJobs> = {};
    for (const day of weekDays) map[day.key] = [];
    for (const job of scheduledJobs) {
      const start = new Date(job.scheduledDate!);
      const end = (job as any).scheduledEndDate ? new Date((job as any).scheduledEndDate) : start;
      for (const day of weekDays) {
        const d = new Date(day.key + "T12:00:00");
        if (d >= new Date(start.toDateString()) && d <= new Date(end.toDateString())) {
          map[day.key].push(job);
        }
      }
    }
    return map;
  }, [scheduledJobs, weekDays]);

  // Get unique crew names from entries + defaults
  const crewNames = useMemo(() => {
    const fromEntries = Array.from(new Set(entries.map(e => e.crewName)));
    const defaults = ["Crew A", "Crew B", "Crew C"];
    const all = Array.from(new Set([...defaults, ...fromEntries]));
    return all.sort();
  }, [entries]);

  // Map entries to date keys
  const entryMap = useMemo(() => {
    const map: Record<string, Record<string, typeof entries>> = {};
    for (const crew of crewNames) {
      map[crew] = {};
      for (const day of weekDays) {
        map[crew][day.key] = [];
      }
    }
    for (const entry of entries) {
      const key = formatDateKey(new Date(entry.date));
      if (map[entry.crewName] && map[entry.crewName][key] !== undefined) {
        map[entry.crewName][key].push(entry);
      }
    }
    return map;
  }, [entries, crewNames, weekDays]);

  const getCrewColor = (crewName: string) => {
    const idx = crewNames.indexOf(crewName) % CREW_COLORS.length;
    return CREW_COLORS[idx];
  };

  const today = formatDateKey(new Date());

  return (
    <DashboardLayout title="Schedule" subtitle="Weekly crew calendar">
      <div className="p-6 space-y-5">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="p-2 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground px-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {weekLabel}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="p-2 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)}
                className="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors">
                Today
              </button>
            )}
          </div>
          <button onClick={() => { setForm({ ...emptyForm, date: weekDays[0].key }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all">
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="ops-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs w-28">Crew</th>
                    {weekDays.map(day => (
                      <th key={day.key} className={cn(
                        "text-center px-2 py-3 text-xs font-medium",
                        day.key === today ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div>{day.dayName}</div>
                        <div className={cn("text-[10px] mt-0.5", day.key === today ? "text-primary font-bold" : "text-muted-foreground/60")}>
                          {day.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Scheduled jobs row — draggable banners */}
                  {weekDays.some(d => (jobDayMap[d.key] ?? []).length > 0) && (
                    <tr className="border-b border-amber-500/20 bg-amber-500/5">
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Jobs</span>
                      </td>
                      {weekDays.map(day => {
                        const dayJobs = jobDayMap[day.key] ?? [];
                        return (
                          <DroppableDayCell key={day.key} dayKey={day.key} isToday={day.key === today}>
                            {dayJobs.length > 0 ? (
                              <div className="space-y-1">
                                {dayJobs.map(job => (
                                  <DraggableJobBanner key={job.id} job={job} />
                                ))}
                              </div>
                            ) : null}
                          </DroppableDayCell>
                        );
                      })}
                    </tr>
                  )}
                  {/* Empty droppable row when no jobs visible this week */}
                  {!weekDays.some(d => (jobDayMap[d.key] ?? []).length > 0) && scheduledJobs.length > 0 && (
                    <tr className="border-b border-amber-500/10">
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-semibold text-amber-400/50 uppercase tracking-wider">Jobs</span>
                      </td>
                      {weekDays.map(day => (
                        <DroppableDayCell key={day.key} dayKey={day.key} isToday={day.key === today}>
                          <div className="h-8" />
                        </DroppableDayCell>
                      ))}
                    </tr>
                  )}
                  {crewNames.map((crew, ci) => (
                    <tr key={crew} className={cn("border-b border-border/50", ci % 2 === 0 ? "" : "bg-secondary/5")}>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-md border", getCrewColor(crew))}>
                          {crew}
                        </span>
                      </td>
                      {weekDays.map(day => {
                        const dayEntries = entryMap[crew]?.[day.key] ?? [];
                        return (
                          <td key={day.key} className={cn(
                            "px-2 py-2 align-top min-w-[110px]",
                            day.key === today ? "bg-primary/5" : ""
                          )}>
                            {dayEntries.length === 0 ? (
                              <button
                                onClick={() => { setForm({ ...emptyForm, crewName: crew, date: day.key }); setShowModal(true); }}
                                className="w-full h-12 rounded-md border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center group"
                              >
                                <Plus className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/50" />
                              </button>
                            ) : (
                              <div className="space-y-1">
                                {dayEntries.map(entry => (
                                  <div key={entry.id} className={cn("rounded-md border px-2 py-1.5 text-[10px] group relative", getCrewColor(crew))}>
                                    <div className="font-semibold truncate pr-4">{entry.title}</div>
                                    <div className="opacity-70">{entry.startHour}:00 – {entry.endHour}:00</div>
                                    <button
                                      onClick={() => { if (confirm("Remove this entry?")) deleteEntry.mutate({ id: entry.id }); }}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/20"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DragOverlay>
            {draggingJobId !== null && (() => {
              const job = allJobs.find(j => j.id === draggingJobId);
              if (!job) return null;
              const colorClass = getJobTypeColor(job.jobType);
              return (
                <div className={cn(
                  "rounded-md border px-2 py-1.5 text-[10px] shadow-xl cursor-grabbing flex items-start gap-1 w-32",
                  colorClass
                )}>
                  <GripVertical className="w-2.5 h-2.5 opacity-40 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{job.client}</div>
                    <div className="opacity-70 capitalize">{job.jobType?.replace(/_/g, " ") ?? "clearing"}</div>
                  </div>
                </div>
              );
            })()}
          </DragOverlay>
          </DndContext>
        )}

        {/* Upcoming entries list */}
        {entries.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">All Scheduled Entries</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.slice(0, 9).map(entry => (
                <div key={entry.id} className="ops-card p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{entry.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.crewName} · {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {entry.startHour}:00–{entry.endHour}:00
                    </div>
                  </div>
                  <button onClick={() => { if (confirm("Remove this entry?")) deleteEntry.mutate({ id: entry.id }); }}
                    className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Jobber Visits Section ── */}
      <JobberVisitsSection />

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Add Schedule Entry
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Bear Creek Day 1"
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Crew</label>
                  <input value={form.crewName} onChange={e => setForm(f => ({ ...f, crewName: e.target.value }))} placeholder="Crew A"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Start Hour</label>
                  <input type="number" min={0} max={23} value={form.startHour} onChange={e => setForm(f => ({ ...f, startHour: Number(e.target.value) }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">End Hour</label>
                  <input type="number" min={0} max={23} value={form.endHour} onChange={e => setForm(f => ({ ...f, endHour: Number(e.target.value) }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" disabled={createEntry.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {createEntry.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reschedule confirmation dialog */}
      {pendingReschedule && (() => {
        const job = allJobs.find(j => j.id === pendingReschedule.jobId);
        const newDateLabel = pendingReschedule.newStart.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="ops-card w-full max-w-sm p-6 shadow-2xl">
              <h2 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Confirm Reschedule
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Move <span className="font-semibold text-foreground">{job?.client ?? "this job"}</span> to{" "}
                <span className="font-semibold text-primary">{newDateLabel}</span>?
                {pendingReschedule.newEnd && (
                  <span className="block text-xs mt-1 text-muted-foreground/70">
                    End date will shift to maintain the same duration.
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingReschedule(null)}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReschedule}
                  disabled={rescheduleJob.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {rescheduleJob.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
