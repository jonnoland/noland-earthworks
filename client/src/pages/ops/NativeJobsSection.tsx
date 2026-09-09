/**
 * NativeJobsSection — Jobs tab in Operations.
 *
 * Shows all native jobs created from converted quotes in a two-column layout:
 * table on the left and a slide-out detail panel on the right.
 *
 * Actions:
 *   - Filter by status (All / Scheduled / In Progress / Completed / Cancelled)
 *   - Search by client name, address, service type
 *   - View job details in slide-out panel
 *   - Update status (Scheduled → In Progress → Completed)
 *   - Edit scheduled date and internal notes
 *   - Generate invoice (HTML, opens in new tab + optional email)
 *   - Mark invoice as paid
 *   - Delete job
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, RefreshCw, X, MapPin, Phone, Mail, User,
  Calendar, CheckCircle, Clock, XCircle, FileText,
  DollarSign, Trash2, Edit2, ExternalLink, ChevronRight,
  Briefcase, Send, Download
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NativeJob {
  id: number;
  quoteId: number | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  propertyAddress: string | null;
  serviceType: string | null;
  acreage: string | null;
  parcelId: string | null;
  parcelCounty: string | null;
  parcelOwner: string | null;
  parcelDeededAcreage: string | null;
  propertyViewerUrl: string | null;
  workAreaPolygon: string | null;
  workAreaMeasuredAt: Date | null;
  quoteTitle?: string | null;
  quoteStatus?: string | null;
  quoteTotalCents?: number | null;
  totalCents: number;
  lineItems: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledDate: Date | null;
  scheduledDates?: Date[];
  completedAt: Date | null;
  internalNotes: string | null;
  invoicedCents: number | null;
  invoicedAt: Date | null;
  paidCents: number | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
}

interface GeneratedInvoiceResult {
  totalCents: number;
  emailSent: boolean;
  emailSendError?: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function JobStatusBadge({ status, paidAt, invoicedAt }: { status: string; paidAt?: Date | null; invoicedAt?: Date | null }) {
  if (paidAt) return <Badge className="bg-green-600 text-white text-xs">Paid</Badge>;
  if (invoicedAt) return <Badge className="bg-amber-600 text-white text-xs">Invoiced</Badge>;
  if (status === "completed") return <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>;
  if (status === "in_progress") return <Badge className="bg-blue-500 text-white text-xs">In Progress</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-600 text-white text-xs">Cancelled</Badge>;
  return <Badge className="bg-zinc-500 text-white text-xs">Scheduled</Badge>;
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getScheduledDates(job: Pick<NativeJob, "scheduledDate" | "scheduledDates">): Date[] {
  return job.scheduledDates?.length
    ? job.scheduledDates.map((date) => new Date(date))
    : job.scheduledDate
      ? [new Date(job.scheduledDate)]
      : [];
}

function fmtScheduledDates(job: Pick<NativeJob, "scheduledDate" | "scheduledDates">, compact = false) {
  const dates = getScheduledDates(job);
  if (dates.length === 0) return "—";
  if (compact && dates.length > 1) return `${fmtDate(dates[0])} +${dates.length - 1}`;
  return dates.map((date) => fmtDate(date)).join(", ");
}

type WorkAreaPoint = { lat: number; lng: number };

function parseWorkAreaPolygon(value: string | null): WorkAreaPoint[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((point) => {
      if (!point || typeof point !== "object") return [];
      const { lat, lng } = point as Partial<WorkAreaPoint>;
      return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)
        ? [{ lat, lng }]
        : [];
    });
  } catch {
    return [];
  }
}

function DispatchWorkAreaMap({ polygon }: { polygon: string | null }) {
  const points = useMemo(() => parseWorkAreaPolygon(polygon), [polygon]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const center = useMemo(() => points.reduce(
    (value, point) => ({ lat: value.lat + point.lat / points.length, lng: value.lng + point.lng / points.length }),
    { lat: 0, lng: 0 },
  ), [points]);

  useEffect(() => {
    if (!map || points.length < 3) return;
    polygonRef.current?.setMap(null);
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    polygonRef.current = new window.google.maps.Polygon({
      paths: points,
      strokeColor: "#f97316",
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: "#f97316",
      fillOpacity: 0.24,
      map,
    });
    map.fitBounds(bounds, 28);
    return () => { polygonRef.current?.setMap(null); };
  }, [map, points]);

  if (points.length < 3) return null;
  return (
    <MapView
      className="h-48 w-full overflow-hidden rounded border border-orange-500/30"
      initialCenter={center}
      initialZoom={17}
      onMapReady={(readyMap) => {
        readyMap.setMapTypeId("satellite");
        setMap(readyMap);
      }}
    />
  );
}

function escapeMapHtml(value: string | null | undefined) {
  return (value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function workAreaCenter(points: WorkAreaPoint[]): WorkAreaPoint | null {
  if (points.length === 0) return null;
  return points.reduce(
    (value, point) => ({ lat: value.lat + point.lat / points.length, lng: value.lng + point.lng / points.length }),
    { lat: 0, lng: 0 },
  );
}

function dispatchMapStatusStyle(status: NativeJob["status"]) {
  if (status === "in_progress") return { label: "Active / in progress", color: "#3b82f6", lightColor: "#93c5fd" };
  if (status === "completed") return { label: "Completed", color: "#10b981", lightColor: "#86efac" };
  return { label: "Pending / scheduled", color: "#f59e0b", lightColor: "#fcd34d" };
}

function ActiveJobsDispatchMap({ jobs, onJobSelect }: { jobs: NativeJob[]; onJobSelect: (job: NativeJob) => void }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const lastMapFeatureSelectionRef = useRef(0);
  const parcelBoundaryMutation = trpc.parcel.boundary.useMutation();

  useEffect(() => {
    if (!map) return;
    let cancelled = false;
    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = [];
    polygonsRef.current.forEach((polygon) => polygon.setMap(null));
    polygonsRef.current = [];
    infoWindowRef.current?.close();

    const bounds = new window.google.maps.LatLngBounds();
    let mappedLocations = 0;
    const extendBounds = (location: WorkAreaPoint | google.maps.LatLng) => {
      bounds.extend(location);
      mappedLocations += 1;
    };
    const fitToActiveJobs = () => {
      if (cancelled || mappedLocations === 0) return;
      if (mappedLocations === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, 52);
      }
    };
    const openJobInfo = (job: NativeJob, position: WorkAreaPoint | google.maps.LatLng, locationSource: "parcel" | "work_area" | "address", hasParcelBoundary: boolean) => {
      if (cancelled) return;
      lastMapFeatureSelectionRef.current = Date.now();
      const statusStyle = dispatchMapStatusStyle(job.status);
      const workArea = parseWorkAreaPolygon(job.workAreaPolygon);
      const scheduledLabel = fmtScheduledDates(job, true);
      const locationLabel = locationSource === "parcel" ? "Official Parcel ID location" : locationSource === "work_area" ? "Field-measured work-area location" : "Address geocode fallback";
      const quoteSummary = job.quoteId
        ? `Quote #${job.quoteId}${job.quoteTitle ? ` · ${escapeMapHtml(job.quoteTitle)}` : ""}${job.quoteStatus ? ` · ${escapeMapHtml(job.quoteStatus)}` : ""} · ${fmt(job.quoteTotalCents ?? job.totalCents)}`
        : `Job total · ${fmt(job.totalCents)}`;
      const infoContent = `<div style="background:#111827;border:1px solid #374151;border-radius:8px;padding:10px 12px;min-width:225px;font-family:system-ui,sans-serif;color:#f9fafb;"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeMapHtml(job.clientName)}</div><div style="font-size:11px;color:${statusStyle.lightColor};margin-bottom:4px;">${statusStyle.label} · ${escapeMapHtml(scheduledLabel)}</div>${job.serviceType ? `<div style="font-size:11px;color:#d1d5db;margin-bottom:4px;">${escapeMapHtml(job.serviceType)}</div>` : ""}${job.acreage ? `<div style="font-size:11px;color:#d1d5db;margin-bottom:4px;">${escapeMapHtml(job.acreage)} acres</div>` : ""}${job.parcelOwner ? `<div style="font-size:10px;color:#e5e7eb;margin-bottom:4px;">Owner: ${escapeMapHtml(job.parcelOwner)}</div>` : ""}${job.parcelId ? `<div style="font-size:10px;color:#7dd3fc;margin-bottom:4px;">Parcel ${escapeMapHtml(job.parcelId)}</div>` : ""}<div style="font-size:10px;color:#fde68a;margin-bottom:4px;">${quoteSummary}</div><div style="font-size:10px;color:${locationSource === "address" ? "#fcd34d" : "#bfdbfe"};margin-bottom:4px;">${locationLabel}</div>${hasParcelBoundary ? '<div style="font-size:10px;color:#7dd3fc;">Blue outline: official parcel boundary</div>' : ""}${workArea.length >= 3 ? `<div style="font-size:10px;color:${statusStyle.lightColor};">${statusStyle.label} work area</div>` : ""}</div>`;
      if (!infoWindowRef.current) infoWindowRef.current = new window.google.maps.InfoWindow({ disableAutoPan: false });
      infoWindowRef.current.setContent(infoContent);
      infoWindowRef.current.setPosition(position);
      infoWindowRef.current.open({ map });
      onJobSelect(job);
    };
    const addMarker = (job: NativeJob, position: WorkAreaPoint | google.maps.LatLng, locationSource: "parcel" | "work_area" | "address", hasParcelBoundary: boolean) => {
      if (cancelled) return;
      const statusStyle = dispatchMapStatusStyle(job.status);
      const pin = document.createElement("div");
      pin.style.cssText = `width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${statusStyle.color};border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.55);cursor:pointer;`;
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: `${job.clientName} — ${statusStyle.label}`,
        content: pin,
      });
      marker.addListener("click", () => {
        openJobInfo(job, position, locationSource, hasParcelBoundary);
      });
      markersRef.current.push(marker);
    };

    const geocodeAddress = (job: NativeJob) => new Promise<void>((resolve) => {
      if (!job.propertyAddress) { resolve(); return; }
      new window.google.maps.Geocoder().geocode({ address: job.propertyAddress }, (results, status) => {
        if (!cancelled && status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          extendBounds(location);
          addMarker(job, location, "address", false);
        }
        resolve();
      });
    });

    const resolveJobLocation = async (job: NativeJob) => {
      const points = parseWorkAreaPolygon(job.workAreaPolygon);
      let hasLoadedParcelBoundary = false;
      if (points.length >= 3) {
        const statusStyle = dispatchMapStatusStyle(job.status);
        const polygon = new window.google.maps.Polygon({
          paths: points,
          strokeColor: statusStyle.color,
          strokeOpacity: 1,
          strokeWeight: 3,
          fillColor: statusStyle.color,
          fillOpacity: 0.28,
          clickable: true,
          map,
        });
        polygon.addListener("click", (event: google.maps.PolyMouseEvent) => {
          event.domEvent?.stopPropagation();
          const position = event.latLng ?? workAreaCenter(points);
          if (position) openJobInfo(job, position, "work_area", hasLoadedParcelBoundary);
        });
        polygonsRef.current.push(polygon);
        points.forEach((point) => bounds.extend(point));
      }

      if (job.parcelId && job.parcelCounty) {
        try {
          const parcel = await parcelBoundaryMutation.mutateAsync({ parcelId: job.parcelId, county: job.parcelCounty });
          if (cancelled) return;
          const rings = parcel.boundaryRings ?? [];
          hasLoadedParcelBoundary = rings.length > 0;
          const parcelCenter = parcel.centroid ?? workAreaCenter(rings[0] ?? []) ?? null;
          rings.forEach((ring) => {
            ring.forEach((point) => bounds.extend(point));
            const polygon = new window.google.maps.Polygon({
              paths: ring,
              strokeColor: "#38bdf8",
              strokeOpacity: 1,
              strokeWeight: 2,
              fillColor: "#38bdf8",
              fillOpacity: 0.08,
              clickable: true,
              map,
            });
            polygon.addListener("click", (event: google.maps.PolyMouseEvent) => {
              event.domEvent?.stopPropagation();
              const position = event.latLng ?? parcelCenter;
              if (position) openJobInfo(job, position, "parcel", true);
            });
            polygonsRef.current.push(polygon);
          });
          if (parcelCenter) {
            extendBounds(parcelCenter);
            addMarker(job, parcelCenter, "parcel", rings.length > 0);
            return;
          }
        } catch {
          // If Tennessee parcel geometry is unavailable, continue through the saved field scope then address fallback.
        }
      }

      const workAreaCenterPoint = workAreaCenter(points);
      if (workAreaCenterPoint) {
        extendBounds(workAreaCenterPoint);
        addMarker(job, workAreaCenterPoint, "work_area", false);
        return;
      }
      await geocodeAddress(job);
    };

    void Promise.all(jobs.map((job) => resolveJobLocation(job))).then(fitToActiveJobs);

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => { marker.map = null; });
      markersRef.current = [];
      polygonsRef.current.forEach((polygon) => polygon.setMap(null));
      polygonsRef.current = [];
      infoWindowRef.current?.close();
    };
  }, [jobs, map, onJobSelect, parcelBoundaryMutation.mutateAsync]);

  return <MapView className="h-[340px] w-full overflow-hidden rounded-b-lg" initialCenter={{ lat: 36.131, lng: -87.45 }} initialZoom={9} onMapReady={(readyMap) => {
    readyMap.setMapTypeId("satellite");
    readyMap.addListener("click", () => {
      if (Date.now() - lastMapFeatureSelectionRef.current < 350) return;
      infoWindowRef.current?.close();
    });
    setMap(readyMap);
  }} />;
}

// ─── Generate Invoice Dialog ──────────────────────────────────────────────────

function GenerateInvoiceDialog({
  job,
  open,
  onClose,
  onSuccess,
}: {
  job: NativeJob;
  open: boolean;
  onClose: () => void;
  onSuccess: (invoice: GeneratedInvoiceResult) => void;
}) {
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const generateMut = trpc.nativeJobs.generateInvoice.useMutation({
    onSuccess: (invoice) => {
      if (invoice.emailSent) {
        toast.success(`Final payment invoice emailed to ${job.clientEmail}`);
      } else if (invoice.emailSendError) {
        toast.error(`Invoice created, but not emailed: ${invoice.emailSendError}`);
      } else {
        toast.success("Final payment invoice created");
      }
      if (invoice?.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
      }
      utils.nativeJobs.list.invalidate();
      utils.nativeJobs.listInvoices.invalidate();
      onSuccess(invoice);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Generate Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">Final payment invoice</p>
            <p className="mt-1 text-xs text-amber-100/75">Any recorded quote deposit is deducted automatically. The remaining balance will be sent to the customer for payment.</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-sm">
            <div className="text-zinc-400 mb-1">Client</div>
            <div className="font-medium">{job.clientName}</div>
            {job.propertyAddress && <div className="text-zinc-400 text-xs mt-1">{job.propertyAddress}</div>}
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-sm">
            <div className="text-zinc-400 mb-1">Amount</div>
            <div className="text-amber-400 font-bold text-lg">{fmt(job.totalCents)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment instructions, thank-you note, etc."
              className="bg-zinc-800 border-zinc-700 text-sm resize-none"
              rows={3}
            />
          </div>
          {job.clientEmail ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-zinc-300">Email invoice to {job.clientEmail}</span>
            </label>
          ) : (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              No customer email is saved on this job. You can create the invoice, but add an email address first if you need to send it directly.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-zinc-600">Cancel</Button>
          <Button
            onClick={() => generateMut.mutate({ jobId: job.id, sendEmail, notes: notes || undefined })}
            disabled={generateMut.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {generateMut.isPending ? "Creating Final Invoice..." : sendEmail && job.clientEmail ? "Create & Send Final Invoice" : "Create Final Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Job Dialog ──────────────────────────────────────────────────────────

function EditJobDialog({
  job,
  open,
  onClose,
  onSuccess,
}: {
  job: NativeJob;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [scheduledDates, setScheduledDates] = useState(() =>
    getScheduledDates(job).map((date) => date.toISOString().split("T")[0]),
  );
  const [scheduleDateInput, setScheduleDateInput] = useState("");
  const [notes, setNotes] = useState(job.internalNotes ?? "");
  const [status, setStatus] = useState(job.status);
  const utils = trpc.useUtils();

  const updateMut = trpc.nativeJobs.update.useMutation({
    onSuccess: () => {
      toast.success("Job updated");
      utils.nativeJobs.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Edit Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Status</Label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as NativeJob["status"])}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Scheduled Work Dates</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={scheduleDateInput}
                onChange={e => setScheduleDateInput(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600 shrink-0"
                disabled={!scheduleDateInput || scheduledDates.length >= 31}
                onClick={() => {
                  setScheduledDates((current) => current.includes(scheduleDateInput)
                    ? current
                    : [...current, scheduleDateInput].sort());
                  setScheduleDateInput("");
                }}
              >
                Add Date
              </Button>
            </div>
            {scheduledDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {scheduledDates.map((date, index) => (
                  <span key={date} className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                    {fmtDate(new Date(`${date}T12:00:00`))}{index === 0 ? " (first)" : ""}
                    <button
                      type="button"
                      onClick={() => setScheduledDates((current) => current.filter((item) => item !== date))}
                      className="rounded p-0.5 text-amber-200 hover:bg-amber-500/20 hover:text-white"
                      aria-label={`Remove ${date}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : <p className="text-xs text-zinc-500">Add every planned work date. The first date remains the primary schedule date for legacy records.</p>}
            <p className="text-xs text-zinc-500">{scheduledDates.length}/31 dates selected. Use the × control to remove a date.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Internal Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Job notes, site conditions, equipment notes..."
              className="bg-zinc-800 border-zinc-700 text-sm resize-none"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-zinc-600">Cancel</Button>
          <Button
            onClick={() =>
              updateMut.mutate({
                id: job.id,
                status,
                scheduledDates: scheduledDates.map((date) => new Date(`${date}T12:00:00`)),
                internalNotes: notes,
              })
            }
            disabled={updateMut.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function NativeJobsSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "in_progress" | "completed" | "cancelled">("all");
  const [acreageFilter, setAcreageFilter] = useState<"all" | "under_5" | "5_to_10" | "10_plus" | "has_parcel">("all");
  const [sortBy, setSortBy] = useState<"scheduled" | "acreage_asc" | "acreage_desc" | "parcel">("scheduled");
  const [showActiveMap, setShowActiveMap] = useState(true);
  const [selectedJob, setSelectedJob] = useState<NativeJob | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: jobs = [], isLoading, refetch } = trpc.nativeJobs.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    limit: 100,
  });
  const { data: activeMapJobs = [] } = trpc.nativeJobs.activeMap.useQuery();

  const { data: invoices = [] } = trpc.nativeJobs.listInvoices.useQuery({});

  const dispatchJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const acreage = Number.parseFloat(job.acreage ?? "");
      if (acreageFilter === "under_5") return Number.isFinite(acreage) && acreage < 5;
      if (acreageFilter === "5_to_10") return Number.isFinite(acreage) && acreage >= 5 && acreage < 10;
      if (acreageFilter === "10_plus") return Number.isFinite(acreage) && acreage >= 10;
      if (acreageFilter === "has_parcel") return Boolean(job.parcelId);
      return true;
    });
    return [...filtered].sort((left, right) => {
      if (sortBy === "acreage_asc" || sortBy === "acreage_desc") {
        const leftAcreage = Number.parseFloat(left.acreage ?? "");
        const rightAcreage = Number.parseFloat(right.acreage ?? "");
        const normalizedLeft = Number.isFinite(leftAcreage) ? leftAcreage : Number.POSITIVE_INFINITY;
        const normalizedRight = Number.isFinite(rightAcreage) ? rightAcreage : Number.POSITIVE_INFINITY;
        return sortBy === "acreage_asc" ? normalizedLeft - normalizedRight : normalizedRight - normalizedLeft;
      }
      if (sortBy === "parcel") return (left.parcelId ?? "~").localeCompare(right.parcelId ?? "~", undefined, { numeric: true });
      const leftDate = getScheduledDates(left)[0]?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDate = getScheduledDates(right)[0]?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftDate - rightDate;
    });
  }, [acreageFilter, jobs, sortBy]);

  const deleteMut = trpc.nativeJobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted");
      utils.nativeJobs.list.invalidate();
      if (selectedJob?.id === deleteConfirmId) setSelectedJob(null);
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const markPaidMut = trpc.nativeJobs.markInvoicePaid.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      utils.nativeJobs.list.invalidate();
      utils.nativeJobs.listInvoices.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMut = trpc.nativeJobs.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.nativeJobs.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Status filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
    for (const j of jobs) {
      if (j.status in counts) counts[j.status]++;
    }
    return counts;
  }, [jobs]);

  const jobInvoices = useMemo(() => {
    if (!selectedJob) return [];
    return invoices.filter(inv => inv.jobId === selectedJob.id);
  }, [invoices, selectedJob]);

  const lineItems: LineItem[] = useMemo(() => {
    if (!selectedJob) return [];
    try { return JSON.parse(selectedJob.lineItems || "[]"); } catch { return []; }
  }, [selectedJob]);

  const statusPills: Array<{ key: typeof statusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "scheduled", label: "Scheduled" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left: Table ── */}
      <div className={`flex flex-col ${selectedJob ? "w-[55%]" : "w-full"} min-h-0 transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-zinc-800 border-zinc-700 text-sm h-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="text-zinc-400 hover:text-white h-9 w-9"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (dispatchJobs.length === 0) return;
              const headers = ["ID", "Client", "Phone", "Email", "Address", "Service", "Acreage", "Parcel ID", "Parcel County", "Property Owner", "Status", "Scheduled Date", "Completed At", "Total ($)", "Deposit Paid ($)", "Balance Due ($)", "Notes"];
              const rows = dispatchJobs.map(j => [
                j.id,
                j.clientName,
                j.clientPhone ?? "",
                j.clientEmail ?? "",
                j.propertyAddress ?? "",
                j.serviceType ?? "",
                j.acreage ?? "",
                j.parcelId ?? "",
                j.parcelCounty ?? "",
                j.parcelOwner ?? "",
                j.status,
                fmtScheduledDates(j),
                j.completedAt ? new Date(j.completedAt).toLocaleDateString() : "",
                ((j.totalCents ?? 0) / 100).toFixed(2),
                ((j.paidCents ?? 0) / 100).toFixed(2),
                (((j.totalCents ?? 0) - (j.paidCents ?? 0)) / 100).toFixed(2),
                (j.internalNotes ?? "").replace(/"/g, "'").replace(/\n/g, " "),
              ]);
              const csv = [headers, ...rows]
                .map(r => r.map(v => `"${v}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `noland-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-zinc-400 hover:text-white h-9 w-9"
            title="Export filtered jobs to CSV"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-4 py-2 border-b border-zinc-800 overflow-x-auto">
          {statusPills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === pill.key
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {pill.label}
              {statusCounts[pill.key] > 0 && (
                <span className="ml-1.5 opacity-70">{statusCounts[pill.key]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Dispatch view</span>
          <select
            value={acreageFilter}
            onChange={(event) => setAcreageFilter(event.target.value as typeof acreageFilter)}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200"
            aria-label="Filter jobs by acreage or Parcel ID"
          >
            <option value="all">All acreage</option>
            <option value="under_5">Under 5 acres</option>
            <option value="5_to_10">5–10 acres</option>
            <option value="10_plus">10+ acres</option>
            <option value="has_parcel">Parcel ID assigned</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-200"
            aria-label="Sort dispatch jobs"
          >
            <option value="scheduled">Sort: first work date</option>
            <option value="acreage_asc">Sort: acreage, low to high</option>
            <option value="acreage_desc">Sort: acreage, high to low</option>
            <option value="parcel">Sort: Parcel ID</option>
          </select>
          <span className="ml-auto text-xs text-zinc-500">{dispatchJobs.length} job{dispatchJobs.length === 1 ? "" : "s"} shown</span>
        </div>

        {activeMapJobs.length > 0 && (
          <section className="border-b border-zinc-800 bg-zinc-950/45">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100">Dispatch Job Map</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">Pending, active, and completed jobs. Select a marker or polygon to open job, owner, and current quote details.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pending</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Active</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-sky-400 bg-sky-500/15" /> Official parcel</span>
                <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-current bg-current/35 text-zinc-300" /> Status-colored work area</span>
              </div>
              <Button type="button" size="sm" variant="outline" className="h-7 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800" onClick={() => setShowActiveMap((visible) => !visible)}>
                {showActiveMap ? "Hide map" : "Show map"}
              </Button>
            </div>
            {showActiveMap && <ActiveJobsDispatchMap jobs={activeMapJobs as NativeJob[]} onJobSelect={setSelectedJob} />}
          </section>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Loading jobs...</div>
          ) : dispatchJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-2">
              <Briefcase className="w-8 h-8 opacity-30" />
              <p className="text-sm">No jobs match this dispatch view</p>
              <p className="text-xs text-zinc-600">Adjust the acreage, Parcel ID, status, or search filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Service</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Acreage / Parcel</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {dispatchJobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job as NativeJob)}
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      selectedJob?.id === job.id
                        ? "bg-amber-900/20 border-l-2 border-l-amber-500"
                        : idx % 2 === 0
                        ? "bg-zinc-900/50 hover:bg-zinc-800/50"
                        : "bg-zinc-900 hover:bg-zinc-800/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{job.clientName}</div>
                      {job.propertyAddress && (
                        <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[180px]">{job.propertyAddress}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div>{job.serviceType ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="whitespace-nowrap">{job.acreage ? `${job.acreage} ac` : "—"}</div>
                      {job.parcelId && <div className="mt-0.5 max-w-[150px] truncate text-xs text-sky-300" title={job.parcelId}>Parcel {job.parcelId}</div>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      <div>{fmtScheduledDates(job, true)}</div>
                      {getScheduledDates(job).length > 1 && <div className="mt-0.5 text-[10px] text-amber-400/75">{getScheduledDates(job).length} work dates</div>}
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-medium whitespace-nowrap">
                      {fmt(job.totalCents)}
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status} paidAt={job.paidAt} invoicedAt={job.invoicedAt} />
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      {selectedJob && (
        <div className="w-[45%] border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-900">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <h3 className="font-semibold text-white">{selectedJob.clientName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <JobStatusBadge status={selectedJob.status} paidAt={selectedJob.paidAt} invoicedAt={selectedJob.invoicedAt} />
                {selectedJob.quoteId && (
                  <span className="text-xs text-zinc-500">Quote #{selectedJob.quoteId}</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedJob(null)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Contact info */}
            <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Contact</div>
              {selectedJob.clientEmail && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <a href={`mailto:${selectedJob.clientEmail}`} className="hover:text-amber-400">{selectedJob.clientEmail}</a>
                </div>
              )}
              {selectedJob.clientPhone && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <a href={`tel:${selectedJob.clientPhone}`} className="hover:text-amber-400">{selectedJob.clientPhone}</a>
                </div>
              )}
              {selectedJob.propertyAddress && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{selectedJob.propertyAddress}</span>
                </div>
              )}
            </div>

            {/* Job details */}
            <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Job Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-zinc-500 text-xs">Service</div>
                  <div className="text-zinc-200">{selectedJob.serviceType ?? "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Acreage</div>
                  <div className="text-zinc-200">{selectedJob.acreage ? `${selectedJob.acreage} acres` : "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Completed</div>
                  <div className="text-zinc-200">{fmtDate(selectedJob.completedAt)}</div>
                </div>
              </div>
              <div className="pt-1">
                <div className="text-zinc-500 text-xs mb-1.5">Scheduled Work Dates</div>
                {getScheduledDates(selectedJob).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {getScheduledDates(selectedJob).map((date) => (
                      <span key={date.toISOString()} className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                        {fmtDate(date)}
                      </span>
                    ))}
                  </div>
                ) : <div className="text-zinc-200">—</div>}
              </div>
            </div>

            {parseWorkAreaPolygon(selectedJob.workAreaPolygon).length >= 3 && (
              <div className="rounded-lg border border-orange-500/30 bg-zinc-800 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-200">Field-Measured Work Area</div>
                    <div className="mt-1 text-sm text-zinc-200">
                      <span className="font-semibold text-orange-300">{selectedJob.acreage ?? "—"} acres</span>
                      {selectedJob.parcelId ? ` · Parcel ${selectedJob.parcelId}${selectedJob.parcelCounty ? ` · ${selectedJob.parcelCounty}` : ""}` : ""}
                    </div>
                  </div>
                  {selectedJob.propertyViewerUrl && (
                    <a href={selectedJob.propertyViewerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200">
                      Parcel Viewer <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <DispatchWorkAreaMap polygon={selectedJob.workAreaPolygon} />
                <p className="mt-2 text-[11px] text-zinc-500">Orange outline is the field-measured work scope. It is not a legal property boundary.</p>
              </div>
            )}

            {/* Financial summary */}
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Financials</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Job Total</span>
                <span className="text-amber-400 font-bold text-base">{fmt(selectedJob.totalCents)}</span>
              </div>
              {selectedJob.invoicedCents != null && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-zinc-400">Invoiced</span>
                  <span className="text-zinc-200">{fmt(selectedJob.invoicedCents)}</span>
                </div>
              )}
              {selectedJob.paidCents != null && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-zinc-400">Paid</span>
                  <span className="text-green-400">{fmt(selectedJob.paidCents)}</span>
                </div>
              )}
            </div>

            {/* Line items */}
            {lineItems.length > 0 && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Line Items</div>
                <div className="space-y-1">
                  {lineItems.map((li, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300 truncate mr-2">{li.description}</span>
                      <span className="text-zinc-400 whitespace-nowrap">{fmt(li.totalCents)}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-700 pt-1 mt-1 flex items-center justify-between text-sm font-semibold">
                    <span className="text-zinc-300">Total</span>
                    <span className="text-amber-400">{fmt(selectedJob.totalCents)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Internal notes */}
            {selectedJob.internalNotes && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Internal Notes</div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedJob.internalNotes}</p>
              </div>
            )}

            {/* Invoices list */}
            {jobInvoices.length > 0 && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Invoices</div>
                <div className="space-y-2">
                  {jobInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-zinc-200">{fmt(inv.totalCents)}</div>
                        <div className="text-xs text-zinc-500">{fmtDate(inv.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.status === "paid" ? (
                          <Badge className="bg-green-600 text-white text-xs">Paid</Badge>
                        ) : inv.status === "sent" ? (
                          <Badge className="bg-sky-600 text-white text-xs">Sent</Badge>
                        ) : (
                          <Badge className="bg-zinc-600 text-white text-xs">Unpaid</Badge>
                        )}
                        {inv.pdfUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white"
                            onClick={() => window.open(inv.pdfUrl!, "_blank")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {inv.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-900/20"
                            onClick={() => markPaidMut.mutate({ invoiceId: inv.id })}
                            disabled={markPaidMut.isPending}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick status update */}
            {selectedJob.status !== "completed" && selectedJob.status !== "cancelled" && (
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Quick Actions</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedJob.status === "scheduled" && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                      onClick={() => updateStatusMut.mutate({ id: selectedJob.id, status: "in_progress" })}
                      disabled={updateStatusMut.isPending}
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Start Job
                    </Button>
                  )}
                  {selectedJob.status === "in_progress" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                      onClick={() => updateStatusMut.mutate({ id: selectedJob.id, status: "completed", completedAt: new Date() })}
                      disabled={updateStatusMut.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Panel footer actions */}
          <div className="border-t border-zinc-800 p-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600 text-zinc-300 hover:text-white text-xs h-8"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            {selectedJob.status === "completed" && !selectedJob.invoicedAt && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-8"
                onClick={() => setShowInvoiceDialog(true)}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Send Final Invoice
              </Button>
            )}
            {selectedJob.invoicedAt && !selectedJob.paidAt && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white text-xs h-8"
                onClick={() => {
                  const inv = jobInvoices[0];
                  if (inv) markPaidMut.mutate({ invoiceId: inv.id });
                }}
                disabled={markPaidMut.isPending || jobInvoices.length === 0}
              >
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Mark Paid
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs h-8 ml-auto"
              onClick={() => setDeleteConfirmId(selectedJob.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      {showInvoiceDialog && selectedJob && (
        <GenerateInvoiceDialog
          job={selectedJob}
          open={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          onSuccess={(invoice) => {
            utils.nativeJobs.list.invalidate();
            utils.nativeJobs.listInvoices.invalidate();
            setSelectedJob((current) => current?.id === selectedJob.id
              ? { ...current, invoicedCents: invoice.totalCents, invoicedAt: new Date() }
              : current);
          }}
        />
      )}

      {showEditDialog && selectedJob && (
        <EditJobDialog
          job={selectedJob}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            utils.nativeJobs.list.invalidate();
          }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Job?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">This will permanently delete the job record. This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-zinc-600">Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => deleteConfirmId !== null && deleteMut.mutate({ id: deleteConfirmId })}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
