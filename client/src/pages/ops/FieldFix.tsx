/**
 * Field Fix — AI-powered equipment diagnostics, service logs, and maintenance intervals.
 * Modeled after FieldFix.ai. Scoped to Jon's single-operator fleet.
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { toast } from "sonner";
import {
  Stethoscope,
  Wrench,
  Clock,
  History,
  Settings2,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Camera,
  X,
  RefreshCw,
  CheckSquare,
  Square,
  AlertCircle,
  Timer,
  DollarSign,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixReport {
  headline: string;
  confidence: number;
  confidenceLabel: string;
  confidenceNote: string;
  rootCauses: { rank: number; cause: string; confidence: number }[];
  fixSteps: string[];
  estimatedTime: string;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  toolsRequired: string[];
  safetyNotice: string;
  escalate: boolean;
  escalateReason?: string;
}

type TabId = "equipment" | "diagnose" | "service-log" | "intervals" | "history";

const TABS: { id: TabId; label: string; icon: typeof Stethoscope }[] = [
  { id: "equipment", label: "Equipment", icon: Wrench },
  { id: "diagnose", label: "Diagnose", icon: Stethoscope },
  { id: "service-log", label: "Service Log", icon: Clock },
  { id: "intervals", label: "Intervals", icon: Settings2 },
  { id: "history", label: "History", icon: History },
];

const SERVICE_TYPES = [
  "Engine Oil & Filter",
  "Hydraulic Fluid & Filter",
  "Air Filter",
  "Fuel Filter",
  "Grease Points",
  "Track Inspection",
  "Coolant Flush",
  "Drive Belt",
  "Battery Check",
  "Mulcher Head Service",
  "Cutting Teeth / Carbide Tips",
  "Other",
];

// ─── Confidence color helper ──────────────────────────────────────────────────

function confidenceColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-orange-500";
}

// ─── Interval status helper ───────────────────────────────────────────────────

function intervalStatus(
  currentHours: number,
  lastServiceHours: number | null | undefined,
  intervalHours: number
): { label: string; color: string; hoursUntilDue: number | null } {
  if (lastServiceHours == null) return { label: "No data", color: "text-muted-foreground", hoursUntilDue: null };
  const nextDue = lastServiceHours + intervalHours;
  const hoursUntilDue = nextDue - currentHours;
  if (hoursUntilDue <= 0) return { label: "Overdue", color: "text-red-400", hoursUntilDue };
  if (hoursUntilDue <= intervalHours * 0.1) return { label: "Due soon", color: "text-amber-400", hoursUntilDue };
  return { label: "OK", color: "text-green-400", hoursUntilDue };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FieldFix() {
  const [activeTab, setActiveTab] = useState<TabId>("equipment");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);

  const { data: equipmentList = [], refetch: refetchEquipment } = trpc.fieldFix.listEquipment.useQuery();

  const selectedMachine = equipmentList.find((e) => e.id === selectedEquipmentId) ?? equipmentList[0] ?? null;
  const machineId = selectedMachine?.id ?? null;

  return (
    <OpsDashboardLayout title="Field Fix" subtitle="AI diagnostics and maintenance tracking">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-border pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "equipment" && (
          <EquipmentTab
            equipmentList={equipmentList}
            selectedId={machineId}
            onSelect={setSelectedEquipmentId}
            onRefresh={refetchEquipment}
          />
        )}
        {activeTab === "diagnose" && (
          <DiagnoseTab machine={selectedMachine} onSwitchToHistory={() => setActiveTab("history")} />
        )}
        {activeTab === "service-log" && machineId && (
          <ServiceLogTab equipmentId={machineId} />
        )}
        {activeTab === "intervals" && machineId && (
          <IntervalsTab equipmentId={machineId} currentHours={selectedMachine?.currentHours ?? 0} />
        )}
        {activeTab === "history" && (
          <HistoryTab equipmentId={machineId} />
        )}

        {/* No machine selected prompt for tabs that need one */}
        {(activeTab === "service-log" || activeTab === "intervals") && !machineId && (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Add a machine in the Equipment tab first.</p>
          </div>
        )}
      </div>
    </OpsDashboardLayout>
  );
}

// ─── Equipment Tab ────────────────────────────────────────────────────────────

function EquipmentTab({
  equipmentList,
  selectedId,
  onSelect,
  onRefresh,
}: {
  equipmentList: any[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hoursEditId, setHoursEditId] = useState<number | null>(null);
  const [newHours, setNewHours] = useState("");

  const upsert = trpc.fieldFix.upsertEquipment.useMutation({
    onSuccess: () => { onRefresh(); setShowForm(false); setEditingId(null); toast.success("Equipment saved."); },
    onError: (e) => toast.error(e.message),
  });
  const updateHours = trpc.fieldFix.updateHours.useMutation({
    onSuccess: () => { onRefresh(); setHoursEditId(null); toast.success("Hours updated."); },
    onError: (e) => toast.error(e.message),
  });
  const deleteEquipment = trpc.fieldFix.deleteEquipment.useMutation({
    onSuccess: () => { onRefresh(); toast.success("Equipment removed."); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "", make: "", model: "", year: "", serialNumber: "",
    currentHours: "", tags: "", notes: "",
  });

  const openAdd = () => {
    setForm({ name: "", make: "", model: "", year: "", serialNumber: "", currentHours: "", tags: "", notes: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (m: any) => {
    setForm({
      name: m.name ?? "",
      make: m.make ?? "",
      model: m.model ?? "",
      year: m.year?.toString() ?? "",
      serialNumber: m.serialNumber ?? "",
      currentHours: m.currentHours?.toString() ?? "",
      tags: m.tags ?? "",
      notes: m.notes ?? "",
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Machine name is required."); return; }
    upsert.mutate({
      id: editingId ?? undefined,
      name: form.name,
      make: form.make || undefined,
      model: form.model || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      serialNumber: form.serialNumber || undefined,
      currentHours: form.currentHours ? parseInt(form.currentHours) : undefined,
      tags: form.tags || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Your Fleet</h2>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Machine
        </Button>
      </div>

      {equipmentList.length === 0 && !showForm && (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-3">No machines added yet.</p>
          <Button size="sm" variant="outline" onClick={openAdd}>Add your first machine</Button>
        </div>
      )}

      <div className="grid gap-3 mb-6">
        {equipmentList.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "rounded-lg border p-4 cursor-pointer transition-all",
              selectedId === m.id
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-card hover:border-border/80"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground text-sm">{m.name}</span>
                  {m.year && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{m.year}</Badge>}
                  {m.tags && m.tags.split(",").map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t.trim()}</Badge>
                  ))}
                </div>
                {(m.make || m.model) && (
                  <p className="text-xs text-muted-foreground mt-0.5">{[m.make, m.model].filter(Boolean).join(" ")}</p>
                )}
                {m.serialNumber && (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">Serial: {m.serialNumber}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Hours display + quick edit */}
                {hoursEditId === m.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      type="number"
                      value={newHours}
                      onChange={(e) => setNewHours(e.target.value)}
                      className="w-20 h-7 text-xs"
                      placeholder="Hours"
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => updateHours.mutate({ id: m.id, hours: parseInt(newHours) || 0 })}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setHoursEditId(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setHoursEditId(m.id); setNewHours(m.currentHours?.toString() ?? ""); }}
                    className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-md px-2.5 py-1 hover:bg-secondary transition-colors"
                  >
                    <Gauge className="w-3 h-3 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{(m.currentHours ?? 0).toLocaleString()} hrs</span>
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm("Remove this machine?")) deleteEquipment.mutate({ id: m.id }); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {m.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.notes}</p>}
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {editingId ? "Edit Machine" : "Add Machine"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Machine Name / Nickname *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tracked Mulcher" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Make</label>
              <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="e.g. Fecon" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Model</label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. FTX148L" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Year</label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2021" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Serial Number</label>
              <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Current Hours</label>
              <Input type="number" value={form.currentHours} onChange={(e) => setForm({ ...form, currentHours: e.target.value })} placeholder="e.g. 2400" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. Primary, Financed" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes about this machine" rows={2} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={upsert.isPending} className="gap-1.5">
              {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? "Save Changes" : "Add Machine"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Diagnose Tab ─────────────────────────────────────────────────────────────

function DiagnoseTab({ machine, onSwitchToHistory }: { machine: any; onSwitchToHistory: () => void }) {
  const [symptoms, setSymptoms] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [report, setReport] = useState<FixReport | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = trpc.fieldFix.getPhotoUploadUrl.useMutation();
  const runDiagnostic = trpc.fieldFix.runDiagnostic.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDiagnose = async () => {
    if (!symptoms.trim()) { toast.error("Describe the symptoms first."); return; }

    let photoUrl: string | undefined;
    if (photoFile && photoDataUrl) {
      try {
        const base64 = photoDataUrl.split(",")[1];
        const result = await uploadPhoto.mutateAsync({
          filename: photoFile.name,
          contentType: photoFile.type,
          base64Data: base64,
        });
        photoUrl = result.url;
      } catch {
        toast.error("Photo upload failed — running diagnosis without photo.");
      }
    }

    const machineDesc = machine
      ? [machine.year, machine.make, machine.model, machine.name].filter(Boolean).join(" ")
      : undefined;

    const result = await runDiagnostic.mutateAsync({
      equipmentId: machine?.id,
      equipmentDescription: machineDesc,
      symptoms,
      errorCode: errorCode || undefined,
      photoUrl,
    });

    setReport(result.report);
    setCompletedSteps(new Set());
  };

  const toggleStep = (i: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const reset = () => {
    setSymptoms("");
    setErrorCode("");
    setPhotoDataUrl(null);
    setPhotoFile(null);
    setReport(null);
    setCompletedSteps(new Set());
  };

  return (
    <div className="max-w-2xl">
      {!report ? (
        <>
          {/* Machine context */}
          {machine && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-5">
              <Wrench className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {[machine.year, machine.make, machine.model, machine.name].filter(Boolean).join(" ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {machine.currentHours?.toLocaleString()} hours
                  {machine.serialNumber ? ` · Serial: ${machine.serialNumber}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Step 1 — Photo */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Step 1 — Visual Context (Optional)
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
                photoDataUrl ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30"
              )}
            >
              {photoDataUrl ? (
                <div className="flex items-center gap-3">
                  <img src={photoDataUrl} alt="Issue" className="w-16 h-16 object-cover rounded-md" />
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">{photoFile?.name}</p>
                    <p className="text-[11px] text-muted-foreground">Click to replace</p>
                  </div>
                  <button
                    className="ml-auto p-1 rounded hover:bg-secondary/50"
                    onClick={(e) => { e.stopPropagation(); setPhotoDataUrl(null); setPhotoFile(null); }}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <Camera className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Attach a photo of the issue area</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">Optional — boosts accuracy</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Step 2 — Symptoms */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Step 2 — Describe the Problem
            </p>
            <Textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="List any noises, smells, performance changes, codes on display, recent maintenance, environmental factors, etc."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Step 3 — Error code */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Step 3 — Error Code (Optional)
            </p>
            <Input
              value={errorCode}
              onChange={(e) => setErrorCode(e.target.value)}
              placeholder="e.g. E-1234 or SPN 1569 FMI 31"
            />
          </div>

          {/* Safety guardrails */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
            <p className="text-[11px] text-amber-400 font-semibold mb-1">Safety Guardrails</p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>Lockout-tagout before touching electrical or hydraulic systems.</li>
              <li>Stop immediately if the plan calls for unsupported heavy loads.</li>
              <li>Field Fix AI augments — it does not replace — OEM service manuals.</li>
            </ul>
          </div>

          <Button
            onClick={handleDiagnose}
            disabled={runDiagnostic.isPending || uploadPhoto.isPending}
            className="w-full gap-2"
          >
            {(runDiagnostic.isPending || uploadPhoto.isPending) ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running diagnosis...</>
            ) : (
              <><Stethoscope className="w-4 h-4" /> Diagnose Issue</>
            )}
          </Button>
        </>
      ) : (
        <FixReportDisplay
          report={report}
          symptoms={symptoms}
          completedSteps={completedSteps}
          onToggleStep={toggleStep}
          onReset={reset}
          onViewHistory={onSwitchToHistory}
        />
      )}
    </div>
  );
}

// ─── Fix Report Display ───────────────────────────────────────────────────────

function FixReportDisplay({
  report,
  symptoms,
  completedSteps,
  onToggleStep,
  onReset,
  onViewHistory,
}: {
  report: FixReport;
  symptoms: string;
  completedSteps: Set<number>;
  onToggleStep: (i: number) => void;
  onReset: () => void;
  onViewHistory: () => void;
}) {
  const [toolsExpanded, setToolsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Headline card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Issue Detected</p>
        <h3 className="text-base font-semibold text-foreground mb-3">{report.headline}</h3>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" />
            Confidence: <span className="text-foreground font-medium">{report.confidence}%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" />
            Est. Time: <span className="text-foreground font-medium">{report.estimatedTime}</span>
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">Confidence: {report.confidence}% ({report.confidenceLabel})</p>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary mb-2">
          <div
            className={cn("h-2 rounded-full transition-all", confidenceColor(report.confidence))}
            style={{ width: `${report.confidence}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{report.confidenceNote}</p>
      </div>

      {/* Root causes */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Root Cause Analysis</p>
        <div className="space-y-3">
          {report.rootCauses.map((rc) => (
            <div key={rc.rank}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground/60 w-5">#{rc.rank}</span>
                  <span className="text-xs text-foreground">{rc.cause}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{rc.confidence}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary ml-7">
                <div
                  className={cn("h-1.5 rounded-full", confidenceColor(rc.confidence))}
                  style={{ width: `${rc.confidence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fix steps */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground mb-1">Recommended Fix Steps</p>
        <p className="text-[11px] text-muted-foreground mb-3">Approx. time: {report.estimatedTime}</p>
        <div className="space-y-2">
          {report.fixSteps.map((step, i) => (
            <button
              key={i}
              onClick={() => onToggleStep(i)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-md border text-left transition-all",
                completedSteps.has(i)
                  ? "border-green-500/30 bg-green-500/5 opacity-70"
                  : "border-border hover:border-border/80 bg-secondary/20"
              )}
            >
              {completedSteps.has(i) ? (
                <CheckSquare className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <span className={cn("text-xs", completedSteps.has(i) ? "line-through text-muted-foreground" : "text-foreground")}>
                {i + 1}. {step}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cost estimate */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground mb-3">Job Estimate</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estimated Cost</p>
            <div className="flex items-center gap-1.5 mb-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                ${report.estimatedCostLow.toLocaleString()} – ${report.estimatedCostHigh.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary">
              <div className="h-1.5 rounded-full bg-green-500" style={{ width: "50%" }} />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estimated Time</p>
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{report.estimatedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tools required */}
      {report.toolsRequired.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setToolsExpanded(!toolsExpanded)}
          >
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" /> Tools Required
            </p>
            {toolsExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {toolsExpanded && (
            <div className="flex flex-wrap gap-2 mt-3">
              {report.toolsRequired.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          )}
          {!toolsExpanded && (
            <div className="flex flex-wrap gap-2 mt-3">
              {report.toolsRequired.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
              {report.toolsRequired.length > 3 && (
                <Badge variant="outline" className="text-xs">+{report.toolsRequired.length - 3} more</Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Safety notice */}
      {report.safetyNotice && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Safety Notice</p>
              <p className="text-xs text-muted-foreground">{report.safetyNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Escalate warning */}
      {report.escalate && report.escalateReason && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Escalate to Dealer / Tech</p>
              <p className="text-xs text-muted-foreground">{report.escalateReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Technician notes */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground mb-1">Technician Notes</p>
        <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Symptoms</p>
        <p className="text-xs text-foreground">{symptoms}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onReset} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> New Diagnosis
        </Button>
        <Button variant="ghost" onClick={onViewHistory} className="gap-1.5 text-muted-foreground">
          <History className="w-3.5 h-3.5" /> View History
        </Button>
      </div>
    </div>
  );
}

// ─── Service Log Tab ──────────────────────────────────────────────────────────

function ServiceLogTab({ equipmentId }: { equipmentId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serviceType: "", serviceDate: new Date().toISOString().split("T")[0],
    hoursAtService: "", performedBy: "", notes: "", cost: "",
  });

  const { data: logs = [], refetch } = trpc.fieldFix.listServiceLogs.useQuery({ equipmentId });
  const create = trpc.fieldFix.createServiceLog.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); toast.success("Service event logged."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.fieldFix.deleteServiceLog.useMutation({
    onSuccess: () => { refetch(); toast.success("Entry removed."); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.serviceType.trim()) { toast.error("Service type is required."); return; }
    create.mutate({
      equipmentId,
      serviceType: form.serviceType,
      serviceDate: form.serviceDate,
      hoursAtService: form.hoursAtService ? parseInt(form.hoursAtService) : undefined,
      performedBy: form.performedBy || undefined,
      notes: form.notes || undefined,
      cost: form.cost || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Service History</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Log Service Event
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Log Service Event</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Service Type *</label>
              <select
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select service type</option>
                {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
              <Input type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hours at Service</label>
              <Input type="number" value={form.hoursAtService} onChange={(e) => setForm({ ...form, hoursAtService: e.target.value })} placeholder="e.g. 2400" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Performed By</label>
              <Input value={form.performedBy} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} placeholder="Owner, Dealer, Mobile Tech" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cost ($)</label>
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="e.g. 85.00" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Parts used, observations, etc." rows={2} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={create.isPending} className="gap-1.5">
              {create.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Entry
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No service events logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <div key={log.id} className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{log.serviceType}</span>
                  {log.cost && (
                    <Badge variant="secondary" className="text-[10px]">${parseFloat(log.cost).toFixed(2)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span>{new Date(log.serviceDate).toLocaleDateString()}</span>
                  {log.hoursAtService && <span>{log.hoursAtService.toLocaleString()} hrs</span>}
                  {log.performedBy && <span>{log.performedBy}</span>}
                </div>
                {log.notes && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{log.notes}</p>}
              </div>
              <button
                onClick={() => { if (confirm("Delete this entry?")) del.mutate({ id: log.id }); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Intervals Tab ────────────────────────────────────────────────────────────

function IntervalsTab({ equipmentId, currentHours }: { equipmentId: number; currentHours: number }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serviceType: "", intervalHours: "", lastServiceHours: "", lastServiceDate: "", notes: "",
  });

  const { data: intervals = [], refetch } = trpc.fieldFix.listIntervals.useQuery({ equipmentId });
  const upsert = trpc.fieldFix.upsertInterval.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); toast.success("Interval saved."); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.fieldFix.deleteInterval.useMutation({
    onSuccess: () => { refetch(); toast.success("Interval removed."); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.serviceType.trim() || !form.intervalHours) { toast.error("Service type and interval hours are required."); return; }
    upsert.mutate({
      equipmentId,
      serviceType: form.serviceType,
      intervalHours: parseInt(form.intervalHours),
      lastServiceHours: form.lastServiceHours ? parseInt(form.lastServiceHours) : undefined,
      lastServiceDate: form.lastServiceDate || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Service Intervals</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Current hours: {currentHours.toLocaleString()}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Interval
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Service Interval</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Service Type *</label>
              <select
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select service type</option>
                {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Interval (Hours) *</label>
              <Input type="number" value={form.intervalHours} onChange={(e) => setForm({ ...form, intervalHours: e.target.value })} placeholder="e.g. 250" />
              <p className="text-[10px] text-muted-foreground mt-0.5">How often this service is due</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hours at Last Service</label>
              <Input type="number" value={form.lastServiceHours} onChange={(e) => setForm({ ...form, lastServiceHours: e.target.value })} placeholder={currentHours.toString()} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date of Last Service</label>
              <Input type="date" value={form.lastServiceDate} onChange={(e) => setForm({ ...form, lastServiceDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes (Optional)</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Use synthetic oil only" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit} disabled={upsert.isPending} className="gap-1.5">
              {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Interval
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {intervals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No service intervals set up yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {intervals.map((interval: any) => {
            const status = intervalStatus(currentHours, interval.lastServiceHours, interval.intervalHours);
            const nextDue = interval.lastServiceHours != null ? interval.lastServiceHours + interval.intervalHours : null;
            return (
              <div key={interval.id} className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{interval.serviceType}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", status.color)}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    <span>Every {interval.intervalHours.toLocaleString()} hrs</span>
                    {interval.lastServiceHours != null && (
                      <span>Last: {interval.lastServiceHours.toLocaleString()} hrs</span>
                    )}
                    {nextDue != null && (
                      <span>Next due: {nextDue.toLocaleString()} hrs</span>
                    )}
                    {status.hoursUntilDue != null && status.hoursUntilDue > 0 && (
                      <span className={status.color}>{status.hoursUntilDue.toLocaleString()} hrs remaining</span>
                    )}
                    {status.hoursUntilDue != null && status.hoursUntilDue <= 0 && (
                      <span className="text-red-400">{Math.abs(status.hoursUntilDue).toLocaleString()} hrs overdue</span>
                    )}
                  </div>
                  {interval.notes && <p className="text-xs text-muted-foreground mt-1.5">{interval.notes}</p>}
                </div>
                <button
                  onClick={() => { if (confirm("Delete this interval?")) del.mutate({ id: interval.id }); }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ equipmentId }: { equipmentId: number | null }) {
  const { data: diagnostics = [], refetch } = trpc.fieldFix.listDiagnostics.useQuery({
    equipmentId: equipmentId ?? undefined,
    limit: 20,
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const del = trpc.fieldFix.deleteDiagnostic.useMutation({
    onSuccess: () => { refetch(); toast.success("Diagnosis removed."); },
    onError: (e) => toast.error(e.message),
  });

  if (diagnostics.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
        <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No diagnostics run yet. Head to the Diagnose tab to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-4">Diagnostic History</h2>
      <div className="space-y-2">
        {diagnostics.map((d: any) => {
          const isExpanded = expandedId === d.id;
          return (
            <div key={d.id} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-secondary/10 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground line-clamp-1">{d.headline || "Diagnosis"}</span>
                    {d.confidence != null && (
                      <Badge variant="outline" className="text-[10px]">{d.confidence}% confidence</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    <span className="line-clamp-1">{d.symptoms}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm("Delete this diagnosis?")) del.mutate({ id: d.id }); }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && d.report && (
                <div className="border-t border-border p-4 bg-secondary/10">
                  <div className="space-y-3">
                    {/* Root causes */}
                    {d.report.rootCauses?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Root Causes</p>
                        {d.report.rootCauses.map((rc: any) => (
                          <p key={rc.rank} className="text-xs text-foreground mb-0.5">#{rc.rank} {rc.cause} — {rc.confidence}%</p>
                        ))}
                      </div>
                    )}
                    {/* Fix steps */}
                    {d.report.fixSteps?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fix Steps</p>
                        {d.report.fixSteps.map((step: string, i: number) => (
                          <p key={i} className="text-xs text-foreground mb-0.5">{i + 1}. {step}</p>
                        ))}
                      </div>
                    )}
                    {/* Cost + time */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Est. Cost: ${d.report.estimatedCostLow}–${d.report.estimatedCostHigh}</span>
                      <span>Est. Time: {d.report.estimatedTime}</span>
                    </div>
                    {/* Safety */}
                    {d.report.safetyNotice && (
                      <p className="text-xs text-amber-400">{d.report.safetyNotice}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
