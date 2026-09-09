import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, ClipboardList, LoaderCircle, MapPin, RefreshCw, Save } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { trpc } from "@/lib/trpc";

type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
type MapPoint = { lat: number; lng: number };

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

function getWorkDates(job: { scheduledDate: Date | string | null; scheduledDates?: Array<Date | string> }) {
  return job.scheduledDates?.length ? job.scheduledDates : job.scheduledDate ? [job.scheduledDate] : [];
}

function jobLabel(job: { scheduledDate: Date | string | null; scheduledDates?: Array<Date | string>; status: JobStatus }) {
  if (job.status === "in_progress") return "Current job";
  if (job.status === "completed") return "Completed";
  const dates = getWorkDates(job);
  if (dates.length === 0) return "Schedule not set";
  return dates.length === 1 ? formatSchedule(dates[0]) : `${formatSchedule(dates[0])} +${dates.length - 1} more`;
}

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function parseWorkAreaPolygon(value: string | null | undefined): MapPoint[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((point) => {
      if (!point || typeof point !== "object") return [];
      const { lat, lng } = point as Partial<MapPoint>;
      return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng) ? [{ lat, lng }] : [];
    });
  } catch {
    return [];
  }
}

function JobPropertyMap({
  parcelId,
  parcelCounty,
  workAreaPolygon,
  status,
}: {
  parcelId: string | null | undefined;
  parcelCounty: string | null | undefined;
  workAreaPolygon: string | null | undefined;
  status: JobStatus;
}) {
  const parcelLookup = trpc.fieldQuote.lookupParcel.useMutation();
  const workArea = useMemo(() => parseWorkAreaPolygon(workAreaPolygon), [workAreaPolygon]);

  useEffect(() => {
    if (!parcelId || !parcelCounty) return;
    parcelLookup.mutate({ parcelId, county: parcelCounty });
    // Lookup only when this expanded job's Parcel ID changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelId, parcelCounty]);

  if (!parcelId || !parcelCounty) {
    return <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "0 0 12px" }}>No Parcel ID is linked to this job yet, so a verified property map is not available.</p>;
  }
  if (parcelLookup.isPending) {
    return <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "0 0 12px" }}>Loading official Parcel ID boundary…</p>;
  }
  const parcel = parcelLookup.data?.matches[0];
  if (!parcel?.lat || !parcel?.lng) {
    return <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "0 0 12px" }}>Official Parcel ID map is unavailable right now. Refresh or check the Parcel ID details.</p>;
  }

  const statusColor = status === "in_progress" ? "#3b82f6" : status === "completed" ? "#10b981" : "#f59e0b";
  const parcelBoundaryJson = JSON.stringify(parcel.boundaryRings ?? []);
  const workAreaJson = JSON.stringify(workArea);
  const serverBase = "https://nolandearth-pymczdcn.manus.space";
  const srcdoc = `<!DOCTYPE html><html style="margin:0;padding:0;height:100%"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>(async function(){const script=document.createElement('script');script.src='${serverBase}/api/maps/js?v=weekly&loading=async';script.async=true;document.head.appendChild(script);await new Promise(function(resolve){script.onload=resolve;});let attempts=0;while(typeof google==='undefined'||!google.maps||!google.maps.Map){if(++attempts>100)return;await new Promise(function(resolve){setTimeout(resolve,50);});}const center={lat:${parcel.lat},lng:${parcel.lng}};const map=new google.maps.Map(document.getElementById('map'),{center:center,zoom:17,mapTypeId:'satellite',disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'});const bounds=new google.maps.LatLngBounds();let hasShape=false;const parcelRings=${parcelBoundaryJson};parcelRings.forEach(function(ring){new google.maps.Polygon({map:map,paths:ring,strokeColor:'#49a7e8',strokeOpacity:.95,strokeWeight:2,fillColor:'#49a7e8',fillOpacity:.06});ring.forEach(function(point){bounds.extend(point);});hasShape=true;});const workArea=${workAreaJson};if(workArea.length>=3){new google.maps.Polygon({map:map,paths:workArea,strokeColor:'${statusColor}',strokeOpacity:1,strokeWeight:3,fillColor:'${statusColor}',fillOpacity:.30});workArea.forEach(function(point){bounds.extend(point);});hasShape=true;}new google.maps.Marker({map:map,position:center,title:'Official Parcel ID location',icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#1f2937',strokeWeight:2,scale:6}});if(hasShape){bounds.extend(center);map.fitBounds(bounds,28);}})();<\/script></body></html>`;

  return <div style={{ margin: "0 0 14px", borderRadius: 11, overflow: "hidden", border: "1px solid var(--ne-border)", background: "var(--ne-ground)" }}>
    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--ne-border)", fontSize: 10, lineHeight: 1.35 }}>
      <span style={{ color: "#49a7e8", fontWeight: 800 }}>BLUE</span><span style={{ color: "var(--ne-muted)" }}> official parcel</span>
      {workArea.length >= 3 && <><span style={{ color: "var(--ne-muted)" }}> · </span><span style={{ color: statusColor, fontWeight: 800 }}>COLORED</span><span style={{ color: "var(--ne-muted)" }}> measured work area</span></>}
    </div>
    <iframe title={`Parcel map for ${parcelId}`} srcDoc={srcdoc} sandbox="allow-scripts allow-same-origin" style={{ display: "block", width: "100%", height: 230, border: 0 }} />
  </div>;
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
              <div style={{ borderRadius: 9, padding: "9px 10px", background: "var(--ne-ground)", border: "1px solid var(--ne-border)" }}><p style={{ color: "var(--ne-muted)", fontSize: 9, fontWeight: 800, letterSpacing: ".05em", margin: 0 }}>PROPERTY OWNER</p><p style={{ color: "var(--ne-cream)", fontSize: 12, fontWeight: 700, margin: "4px 0 0", lineHeight: 1.35 }}>{job.parcelOwner || "Not available"}</p></div>
              <div style={{ borderRadius: 9, padding: "9px 10px", background: "var(--ne-ground)", border: "1px solid var(--ne-border)" }}><p style={{ color: "var(--ne-muted)", fontSize: 9, fontWeight: 800, letterSpacing: ".05em", margin: 0 }}>CURRENT QUOTE</p><p style={{ color: "var(--ne-amber)", fontSize: 12, fontWeight: 700, margin: "4px 0 0", lineHeight: 1.35 }}>{job.quoteId ? `#${job.quoteId} · ${formatMoney(job.quoteTotalCents ?? job.totalCents)}` : formatMoney(job.totalCents)}</p>{job.quoteStatus && <p style={{ color: "var(--ne-muted)", fontSize: 10, margin: "3px 0 0", textTransform: "capitalize" }}>{job.quoteStatus}</p>}</div>
            </div>
            {job.parcelId && <p style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 700, margin: "0 0 10px" }}>Parcel {job.parcelId}{job.parcelCounty ? ` · ${job.parcelCounty} County` : ""}</p>}
            <JobPropertyMap parcelId={job.parcelId} parcelCounty={job.parcelCounty} workAreaPolygon={job.workAreaPolygon} status={job.status as JobStatus} />
            {getWorkDates(job).length > 0 && <div style={{ margin: "0 0 14px" }}>
              <p style={{ color: "var(--ne-muted)", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", margin: "0 0 7px" }}>SCHEDULED WORK DATES</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{getWorkDates(job).map((date) => <span key={String(date)} style={{ color: "var(--ne-amber)", background: "oklch(0.83 0.16 82 / 0.12)", border: "1px solid oklch(0.83 0.16 82 / 0.28)", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>{formatSchedule(date)}</span>)}</div>
            </div>}
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
