/**
 * Schedule Page — Noland Earthworks
 * Primary job source: Jobber (live via tRPC — startAt/endAt dates)
 * Secondary: local schedule entries (manual crew blocks)
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Loader2, X,
  Calendar, RefreshCw, ExternalLink, AlertCircle,
  CheckCircle2, GripVertical, Flag, Briefcase, MapPin,
  Sparkles, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// ─── Color helpers ─────────────────────────────────────────────────────────────

const JOBBER_STATUS_COLORS: Record<string, string> = {
  ACTIVE:              "border-blue-500/40 bg-blue-500/15 text-blue-300",
  QUOTE:               "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
  REQUIRES_INVOICING:  "border-purple-500/40 bg-purple-500/15 text-purple-300",
  COMPLETED:           "border-green-500/40 bg-green-500/15 text-green-300",
  ARCHIVED:            "border-secondary/50 bg-secondary/20 text-muted-foreground",
};

function getJobberStatusColor(status?: string | null): string {
  return JOBBER_STATUS_COLORS[status ?? ""] ?? "border-amber-500/40 bg-amber-500/15 text-amber-300";
}

const CREW_COLORS = [
  "bg-primary/20 border-primary/40 text-primary",
  "bg-blue-500/20 border-blue-500/40 text-blue-400",
  "bg-purple-500/20 border-purple-500/40 text-purple-400",
  "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
  "bg-green-500/20 border-green-500/40 text-green-400",
  "bg-pink-500/20 border-pink-500/40 text-pink-400",
];

// ─── Date helpers ──────────────────────────────────────────────────────────────

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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EntryFormData {
  title: string;
  crewName: string;
  date: string;
  startHour: number;
  endHour: number;
  notes: string;
}

const emptyForm: EntryFormData = {
  title: "", crewName: "", date: "", startHour: 7, endHour: 17, notes: "",
};

// Jobber job shape from the jobs query
interface JobberJob {
  id: string;
  jobNumber?: number | null;
  title?: string | null;
  jobStatus?: string | null;
  jobType?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  total?: number | null;
  client?: { id?: string; name?: string | null; companyName?: string | null } | null;
  property?: { address?: { street1?: string | null; city?: string | null } | null } | null;
}

// ─── Draggable Jobber job banner ───────────────────────────────────────────────

function DraggableJobberBanner({ job }: { job: JobberJob }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `jobber-${job.id}`,
  });
  const colorClass = getJobberStatusColor(job.jobStatus);
  const clientName = job.client?.name || job.client?.companyName || "Unknown";
  const isMultiDay = job.startAt && job.endAt &&
    new Date(job.endAt).toDateString() !== new Date(job.startAt).toDateString();

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
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">
          {job.title || `Job #${job.jobNumber ?? "—"}`}
        </div>
        <div className="opacity-70 truncate">{clientName}</div>
        {isMultiDay && (
          <div className="opacity-50 text-[9px]">multi-day</div>
        )}
      </div>
    </div>
  );
}

// ─── Droppable day cell ────────────────────────────────────────────────────────

function DroppableDayCell({
  dayKey, children, isToday,
}: {
  dayKey: string;
  children: React.ReactNode;
  isToday: boolean;
}) {
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

// ─── Upcoming Jobber jobs list ─────────────────────────────────────────────────

const UPCOMING_STATUS_FILTERS = ["ALL", "ACTIVE", "QUOTE", "REQUIRES_INVOICING"] as const;
type UpcomingStatusFilter = typeof UPCOMING_STATUS_FILTERS[number];

const UPCOMING_STATUS_LABELS: Record<string, string> = {
  ALL: "All",
  ACTIVE: "Active",
  QUOTE: "Quote",
  REQUIRES_INVOICING: "Req. Invoicing",
};

const UPCOMING_STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-blue-400",
  QUOTE: "bg-yellow-400",
  REQUIRES_INVOICING: "bg-purple-400",
};

function UpcomingJobberJobCard({ job }: { job: JobberJob }) {
  const [scheduleNote, setScheduleNote] = useState("");
  const [noteCopied, setNoteCopied] = useState(false);
  const generateNoteMutation = trpc.ops.generateScheduleNote.useMutation({
    onSuccess: (data) => setScheduleNote(data.note as string),
    onError: (err) => toast.error(err.message || "Failed to generate note."),
  });

  const addr = job.property?.address;
  const addrStr = addr?.street1
    ? [addr.street1, addr.city].filter(Boolean).join(", ")
    : null;

  return (
    <div key={job.id} className="ops-card p-3 flex items-start gap-3">
      <div className={cn(
        "mt-1 w-2 h-2 rounded-full shrink-0",
        UPCOMING_STATUS_DOT[job.jobStatus ?? ""] ?? "bg-primary"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="text-xs font-semibold text-foreground truncate flex-1">
            {job.title || `Job #${job.jobNumber ?? "—"}`}
          </div>
          {job.jobStatus && job.jobStatus !== "ACTIVE" && (
            <span className={cn(
              "shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
              JOBBER_STATUS_COLORS[job.jobStatus] ?? "bg-secondary/50 text-muted-foreground"
            )}>
              {UPCOMING_STATUS_LABELS[job.jobStatus] ?? job.jobStatus}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {job.client?.name || job.client?.companyName || "—"}
        </div>
        {addrStr && (
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {addrStr}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-1 font-medium">
          {job.startAt
            ? new Date(job.startAt).toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric",
              })
            : "No date"}
          {job.endAt && job.endAt !== job.startAt &&
            ` – ${new Date(job.endAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          }
        </div>
        {/* AI Schedule Note */}
        <div className="mt-2 pt-2 border-t border-border/50">
          {scheduleNote ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-foreground leading-relaxed">{scheduleNote}</p>
              <button
                className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(scheduleNote);
                  setNoteCopied(true);
                  toast.success("Copied.");
                  setTimeout(() => setNoteCopied(false), 2000);
                }}
              >
                {noteCopied ? <CheckCircle2 className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                {noteCopied ? "Copied" : "Copy note"}
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              onClick={() => generateNoteMutation.mutate({
                jobTitle: job.title || `Job #${job.jobNumber ?? ""}`,
                clientName: job.client?.name || job.client?.companyName || "",
                address: addrStr ?? undefined,
                serviceType: job.jobType ?? undefined,
              })}
              disabled={generateNoteMutation.isPending}
            >
              {generateNoteMutation.isPending ? (
                <><Loader2 className="w-2.5 h-2.5 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-2.5 h-2.5 text-orange-400" />Generate field note</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UpcomingJobberJobs({ jobs }: { jobs: JobberJob[] }) {
  const [statusFilter, setStatusFilter] = useState<UpcomingStatusFilter>("ALL");

  const allUpcoming = useMemo(() => {
    const now = new Date();
    return jobs
      .filter(j => j.startAt && new Date(j.startAt) >= now)
      .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
  }, [jobs]);

  const filtered = useMemo(() => {
    return allUpcoming
      .filter(j => statusFilter === "ALL" || j.jobStatus === statusFilter)
      .slice(0, 12);
  }, [allUpcoming, statusFilter]);

  if (allUpcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Upcoming Jobs
          <span className="ml-2 text-primary normal-case font-normal">{allUpcoming.length} scheduled</span>
        </h3>
        <div className="flex flex-wrap gap-1">
          {UPCOMING_STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                statusFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
              )}
            >
              {UPCOMING_STATUS_LABELS[f] ?? f}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upcoming jobs match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(job => (
            <UpcomingJobberJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Schedule Page ────────────────────────────────────────────────────────

export default function Schedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EntryFormData>(emptyForm);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const utils = trpc.useUtils();

  // ── Local schedule entries (manual crew blocks) ──
  const { data: entries = [], isLoading: entriesLoading } = trpc.ops.schedule.list.useQuery();

  // ── Crews from DB (matches Crews page) ──
  const { data: crewList = [] } = trpc.ops.crews.list.useQuery();

  // ── Jobber jobs (primary job source) ──
  const {
    data: jobberData,
    isLoading: jobberLoading,
    isFetching: jobberFetching,
    refetch: refetchJobber,
    error: jobberError,
  } = trpc.jobber.jobs.useQuery({ first: 200 }, { retry: false });

  const jobberNotConnected =
    !jobberLoading &&
    (jobberError?.message?.includes("not connected") ||
      jobberError?.message?.includes("not authorized") ||
      jobberError?.message?.includes("token") ||
      !jobberData);

  const jobberJobs: JobberJob[] = (jobberData as any)?.nodes ?? [];

  // Jobs that have a startAt date — these are the ones we show on the calendar
  const scheduledJobberJobs = useMemo(
    () => jobberJobs.filter(j => j.startAt),
    [jobberJobs]
  );

  // ── Build week days ──
  const weekDays = useMemo(() => {
    const start = getWeekStart(weekOffset);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        date: d,
        key: formatDateKey(d),
        label: formatDayLabel(d),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });
  }, [weekOffset]);

  const weekLabel = `${weekDays[0].label} – ${weekDays[5].label}`;
  const today = formatDateKey(new Date());

  // ── Map Jobber jobs to calendar day keys ──
  const jobberDayMap = useMemo(() => {
    const map: Record<string, JobberJob[]> = {};
    for (const day of weekDays) map[day.key] = [];

    for (const job of scheduledJobberJobs) {
      const startDate = new Date(job.startAt!);
      // Use endAt if available, otherwise treat as single-day
      const endDate = job.endAt ? new Date(job.endAt) : startDate;

      for (const day of weekDays) {
        // Normalize to midnight for comparison
        const dayDate = new Date(day.key + "T00:00:00");
        const startDay = new Date(startDate.toISOString().split("T")[0] + "T00:00:00");
        const endDay = new Date(endDate.toISOString().split("T")[0] + "T00:00:00");

        if (dayDate >= startDay && dayDate <= endDay) {
          map[day.key].push(job);
        }
      }
    }
    return map;
  }, [scheduledJobberJobs, weekDays]);

  const hasJobsThisWeek = weekDays.some(d => (jobberDayMap[d.key] ?? []).length > 0);

  // ── Crew entries — names sourced from DB crews, falling back to names already used in entries ──
  const crewNames = useMemo(() => {
    const fromDb = crewList.map((c: any) => c.name as string);
    const fromEntries = Array.from(new Set(entries.map(e => e.crewName)));
    // Merge: DB crews first, then any legacy names from existing entries not yet in DB
    const merged = Array.from(new Set([...fromDb, ...fromEntries]));
    return merged.length > 0 ? merged.sort() : ["Jon Noland"];
  }, [crewList, entries]);

  const entryMap = useMemo(() => {
    const map: Record<string, Record<string, typeof entries>> = {};
    for (const crew of crewNames) {
      map[crew] = {};
      for (const day of weekDays) map[crew][day.key] = [];
    }
    for (const entry of entries) {
      const key = formatDateKey(new Date(entry.date));
      if (map[entry.crewName]?.[key] !== undefined) {
        map[entry.crewName][key].push(entry);
      }
    }
    return map;
  }, [entries, crewNames, weekDays]);

  const getCrewColor = (crewName: string) =>
    CREW_COLORS[crewNames.indexOf(crewName) % CREW_COLORS.length];

  // ── Mutations ──
  const createEntry = trpc.ops.schedule.create.useMutation({
    onSuccess: () => {
      utils.ops.schedule.list.invalidate();
      toast.success("Entry added");
      closeModal();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEntry = trpc.ops.schedule.delete.useMutation({
    onSuccess: () => {
      utils.ops.schedule.list.invalidate();
      toast.success("Entry removed");
    },
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

  // ── Drag handlers (Jobber jobs are read-only — no reschedule to DB) ──
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("jobber-")) setDraggingJobId(id.replace("jobber-", ""));
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    setDraggingJobId(null);
    // Jobber jobs can't be rescheduled from here — they're read-only from Jobber
    toast.info("To reschedule a Jobber job, update it in Jobber directly.");
  };

  const isLoading = entriesLoading || jobberLoading;

  return (
    <DashboardLayout title="Schedule" subtitle="Weekly job calendar — live from Jobber">
      <div className="p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-2 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground px-2">
              {weekLabel}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-2 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchJobber()}
              disabled={jobberFetching}
              className="p-2 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
              title="Refresh Jobber jobs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", jobberFetching && "animate-spin")} />
            </button>
            <button
              onClick={() => { setForm({ ...emptyForm, date: weekDays[0].key }); setShowModal(true); }}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Entry
            </button>
          </div>
        </div>

        {/* Jobber not connected warning */}
        {jobberNotConnected && (
          <div className="flex items-center gap-2.5 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Jobber is not connected — job dates will not appear on the calendar.{" "}
              <a href="/ops/settings" className="text-primary hover:underline">Connect in Settings</a>.
            </p>
          </div>
        )}

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
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs w-28">
                        Crew / Jobs
                      </th>
                      {weekDays.map(day => (
                        <th
                          key={day.key}
                          className={cn(
                            "text-center px-2 py-3 text-xs font-medium",
                            day.key === today ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          <div>{day.dayName}</div>
                          <div className={cn(
                            "text-[10px] mt-0.5",
                            day.key === today ? "text-primary font-bold" : "text-muted-foreground/60"
                          )}>
                            {day.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* ── Jobber Jobs row ── */}
                    {!jobberNotConnected && (
                      <tr className={cn(
                        "border-b",
                        hasJobsThisWeek
                          ? "border-blue-500/20 bg-blue-500/5"
                          : "border-border/30"
                      )}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                              Jobs
                            </span>
                          </div>
                          {!hasJobsThisWeek && (
                            <div className="text-[9px] text-muted-foreground/50 mt-0.5">
                              none this week
                            </div>
                          )}
                        </td>
                        {weekDays.map(day => {
                          const dayJobs = jobberDayMap[day.key] ?? [];
                          return (
                            <DroppableDayCell key={day.key} dayKey={day.key} isToday={day.key === today}>
                              {dayJobs.length > 0 ? (
                                <div className="space-y-1">
                                  {dayJobs.map(job => (
                                    <DraggableJobberBanner key={job.id} job={job} />
                                  ))}
                                </div>
                              ) : (
                                <div className="h-8" />
                              )}
                            </DroppableDayCell>
                          );
                        })}
                      </tr>
                    )}

                    {/* ── Crew rows ── */}
                    {crewNames.map((crew, ci) => (
                      <tr
                        key={crew}
                        className={cn(
                          "border-b border-border/50",
                          ci % 2 === 0 ? "" : "bg-secondary/5"
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-[11px] font-semibold px-2 py-1 rounded-md border",
                            getCrewColor(crew)
                          )}>
                            {crew}
                          </span>
                        </td>
                        {weekDays.map(day => {
                          const dayEntries = entryMap[crew]?.[day.key] ?? [];
                          return (
                            <td
                              key={day.key}
                              className={cn(
                                "px-2 py-2 align-top min-w-[110px]",
                                day.key === today ? "bg-primary/5" : ""
                              )}
                            >
                              {dayEntries.length === 0 ? (
                                <button
                                  onClick={() => {
                                    setForm({ ...emptyForm, crewName: crew, date: day.key });
                                    setShowModal(true);
                                  }}
                                  className="w-full h-12 rounded-md border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center group"
                                >
                                  <Plus className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/50" />
                                </button>
                              ) : (
                                <div className="space-y-1">
                                  {dayEntries.map(entry => (
                                    <div
                                      key={entry.id}
                                      className={cn(
                                        "rounded-md border px-2 py-1.5 text-[10px] group relative",
                                        getCrewColor(crew)
                                      )}
                                    >
                                      <div className="font-semibold truncate pr-4">{entry.title}</div>
                                      <div className="opacity-70">{entry.startHour}:00 – {entry.endHour}:00</div>
                                      <button
                                        onClick={() => {
                                          if (confirm("Remove this entry?")) deleteEntry.mutate({ id: entry.id });
                                        }}
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

            {/* Drag overlay */}
            <DragOverlay>
              {draggingJobId !== null && (() => {
                const job = jobberJobs.find(j => j.id === draggingJobId);
                if (!job) return null;
                return (
                  <div className={cn(
                    "rounded-md border px-2 py-1.5 text-[10px] shadow-xl cursor-grabbing flex items-start gap-1 w-36",
                    getJobberStatusColor(job.jobStatus)
                  )}>
                    <GripVertical className="w-2.5 h-2.5 opacity-40 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {job.title || `Job #${job.jobNumber ?? "—"}`}
                      </div>
                      <div className="opacity-70 truncate">
                        {job.client?.name || job.client?.companyName || "—"}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>
        )}

        {/* Upcoming jobs list */}
        {!jobberNotConnected && !jobberLoading && (
          <UpcomingJobberJobs jobs={jobberJobs} />
        )}

        {/* Manual schedule entries list */}
        {entries.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Manual Schedule Entries
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.slice(0, 9).map(entry => (
                <div key={entry.id} className="ops-card p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{entry.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.crewName} · {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {entry.startHour}:00–{entry.endHour}:00
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm("Remove this entry?")) deleteEntry.mutate({ id: entry.id }); }}
                    className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Jobber link */}
        {!jobberNotConnected && (
          <div className="flex justify-end">
            <a
              href="https://secure.getjobber.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Jobber
            </a>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Add Schedule Entry</h2>
              <button onClick={closeModal} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Bear Creek Day 1"
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Crew</label>
                  <select
                    value={form.crewName}
                    onChange={e => setForm(f => ({ ...f, crewName: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  >
                    <option value="" disabled>Select crew...</option>
                    {crewNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Start Hour</label>
                  <input
                    type="number" min={0} max={23}
                    value={form.startHour}
                    onChange={e => setForm(f => ({ ...f, startHour: Number(e.target.value) }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">End Hour</label>
                  <input
                    type="number" min={0} max={23}
                    value={form.endHour}
                    onChange={e => setForm(f => ({ ...f, endHour: Number(e.target.value) }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEntry.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {createEntry.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
