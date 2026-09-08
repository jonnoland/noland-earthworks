import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, ClipboardList, LoaderCircle, MapPin, RefreshCw, Save } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";

type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

const statusDisplay: Record<JobStatus, { label: string; color: string; background: string }> = {
  scheduled: { label: "Scheduled", color: "oklch(0.83 0.16 82)", background: "oklch(0.83 0.16 82 / 0.14)" },
  in_progress: { label: "In Progress", color: "oklch(0.72 0.17 150)", background: "oklch(0.72 0.17 150 / 0.14)" },
  completed: { label: "Completed", color: "oklch(0.66 0.12 145)", background: "oklch(0.66 0.12 145 / 0.14)" },
  cancelled: { label: "Cancelled", color: "oklch(0.68 0.16 25)", background: "oklch(0.68 0.16 25 / 0.14)" },
};

function formatSchedule(date: Date | string | null) {
  if (!date) return "Schedule not set";
  return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function jobLabel(job: { scheduledDate: Date | string | null; status: JobStatus }) {
  if (job.status === "in_progress") return "Current job";
  if (job.status === "completed") return "Completed";
  return job.scheduledDate ? formatSchedule(job.scheduledDate) : "Schedule not set";
}

export default function Jobs() {
  const utils = trpc.useUtils();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [savedId, setSavedId] = useState<number | null>(null);
  const { data: jobs, isLoading, isFetching, refetch } = trpc.fieldQuote.mobileJobs.useQuery({ limit: 75 }, { retry: false });
  const saveNotes = trpc.fieldQuote.mobileUpdateJobNotes.useMutation({
    onSuccess: async (job) => {
      setSavedId(job.id);
      setNoteDrafts((current) => ({ ...current, [job.id]: job.internalNotes ?? "" }));
      await utils.fieldQuote.mobileJobs.invalidate();
    },
  });

  const activeJobs = jobs?.filter((job) => job.status === "scheduled" || job.status === "in_progress") ?? [];
  const recentJobs = jobs?.filter((job) => job.status === "completed" || job.status === "cancelled") ?? [];

  const toggleJob = (job: { id: number; internalNotes: string | null }) => {
    setSavedId(null);
    setExpandedId((current) => current === job.id ? null : job.id);
    setNoteDrafts((current) => current[job.id] === undefined ? { ...current, [job.id]: job.internalNotes ?? "" } : current);
  };

  const renderJob = (job: NonNullable<typeof jobs>[number]) => {
    const expanded = expandedId === job.id;
    const status = statusDisplay[job.status as JobStatus];
    const noteDraft = noteDrafts[job.id] ?? job.internalNotes ?? "";
    const hasChanged = noteDraft !== (job.internalNotes ?? "");
    const isSaving = saveNotes.isPending && saveNotes.variables?.id === job.id;

    return (
      <article key={job.id} style={{ background: "var(--ne-clay)", border: "1px solid var(--ne-border)", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => toggleJob(job)}
          aria-expanded={expanded}
          style={{ width: "100%", border: 0, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left", padding: "15px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}
        >
          <div style={{ marginTop: 2, color: "var(--ne-amber)", flexShrink: 0 }}><CalendarDays size={20} /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ color: "var(--ne-cream)", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.clientName}</strong>
              <span style={{ color: status.color, background: status.background, borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{status.label}</span>
            </div>
            <p style={{ color: "var(--ne-muted)", fontSize: 12, margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.serviceType || "Land Management"}{job.acreage ? ` · ${job.acreage} acres` : ""}</p>
            <p style={{ color: "var(--ne-amber)", fontSize: 12, fontWeight: 600, margin: "7px 0 0" }}>{jobLabel(job)}</p>
          </div>
          <div style={{ color: "var(--ne-muted)", paddingTop: 3 }}>{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
        </button>

        {expanded && (
          <div style={{ borderTop: "1px solid var(--ne-border)", padding: "14px 16px 16px" }}>
            {job.propertyAddress && <p style={{ display: "flex", alignItems: "flex-start", gap: 7, color: "var(--ne-muted)", fontSize: 13, lineHeight: 1.45, margin: "0 0 12px" }}><MapPin size={15} style={{ color: "var(--ne-amber)", flexShrink: 0, marginTop: 2 }} />{job.propertyAddress}</p>}
            <label htmlFor={`field-notes-${job.id}`} style={{ display: "block", color: "var(--ne-cream)", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", marginBottom: 7 }}>FIELD NOTES <span style={{ color: "var(--ne-muted)", fontWeight: 400, letterSpacing: 0 }}>— syncs with Operations</span></label>
            <textarea
              id={`field-notes-${job.id}`}
              value={noteDraft}
              onChange={(event) => { setSavedId(null); setNoteDrafts((current) => ({ ...current, [job.id]: event.target.value })); }}
              placeholder="Access, conditions, hazards, customer requests, or work completed..."
              maxLength={5000}
              rows={5}
              style={{ boxSizing: "border-box", width: "100%", resize: "vertical", borderRadius: 10, border: "1px solid var(--ne-border)", background: "var(--ne-ground)", color: "var(--ne-cream)", padding: "11px 12px", fontFamily: "inherit", fontSize: 13, lineHeight: 1.45 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
              <span style={{ color: savedId === job.id ? "oklch(0.72 0.17 150)" : "var(--ne-muted)", fontSize: 11 }}>{savedId === job.id ? "Field notes saved" : `${noteDraft.length}/5,000`}</span>
              <button
                type="button"
                disabled={!hasChanged || isSaving}
                onClick={() => saveNotes.mutate({ id: job.id, internalNotes: noteDraft })}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, border: 0, borderRadius: 8, padding: "9px 12px", background: hasChanged ? "var(--ne-amber)" : "var(--ne-border)", color: hasChanged ? "var(--ne-soil)" : "var(--ne-muted)", fontSize: 12, fontWeight: 700, cursor: hasChanged ? "pointer" : "not-allowed" }}
              >
                {isSaving ? <LoaderCircle size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Save size={14} />}
                {isSaving ? "Saving..." : "Save field notes"}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="Jobs" />
      <div className="scroll-area" style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: 88 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, color: "var(--ne-cream)", fontSize: 16, fontWeight: 700 }}>Schedule & field notes</p>
            <p style={{ margin: "4px 0 0", color: "var(--ne-muted)", fontSize: 12 }}>Synced from Operations</p>
          </div>
          <button type="button" onClick={() => refetch()} aria-label="Refresh jobs" style={{ border: "1px solid var(--ne-border)", background: "var(--ne-clay)", color: "var(--ne-amber)", borderRadius: 9, padding: 9, cursor: "pointer" }}><RefreshCw size={17} style={{ animation: isFetching ? "spin 0.8s linear infinite" : undefined }} /></button>
        </div>

        {isLoading && <div style={{ display: "grid", gap: 12 }}>{[1, 2, 3].map((key) => <div key={key} style={{ height: 90, borderRadius: 14, background: "var(--ne-clay)" }} />)}</div>}
        {!isLoading && activeJobs.length === 0 && recentJobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--ne-muted)" }}><ClipboardList size={28} style={{ marginBottom: 10, color: "var(--ne-amber)" }} /><p style={{ margin: 0 }}>No Operations jobs have been scheduled yet.</p></div>
        )}
        {activeJobs.length > 0 && <><p style={{ color: "var(--ne-amber)", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", margin: "0 0 8px" }}>CURRENT & SCHEDULED</p>{activeJobs.map(renderJob)}</>}
        {recentJobs.length > 0 && <><p style={{ color: "var(--ne-muted)", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", margin: activeJobs.length ? "22px 0 8px" : "0 0 8px" }}>RECENT JOBS</p>{recentJobs.map(renderJob)}</>}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
