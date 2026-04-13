/**
 * CrewPricing — detailed cost breakdown page for a single crew.
 * Matches the OwnrOps pricing page layout:
 *   - KPI cards: Breakeven Floor, Crew-Day Rate, Profit Per Day
 *   - Donut chart: daily cost breakdown by category
 *   - Five expandable sections: Labor, Equipment, Fuel, Wear & Consumables, Monthly Overhead
 *   - Right column: Crew Details card + Quick Stats card
 *   - Edit Pricing modal with all inputs
 */
import { useState, useMemo, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Edit, Trash2, PlusCircle, MinusCircle, TrendingUp, ChevronDown, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";

// ─── Overhead Presets ─────────────────────────────────────────────────────────
const OVERHEAD_PRESETS: { label: string; defaultCost: number }[] = [
  { label: "Equipment Loan / Lease Payment", defaultCost: 2200 },
  { label: "Truck / Trailer Payment", defaultCost: 1400 },
  { label: "Commercial General Liability Insurance", defaultCost: 600 },
  { label: "Equipment Insurance (Inland Marine)", defaultCost: 325 },
  { label: "Workers Comp Insurance", defaultCost: 450 },
  { label: "Business Phone / Cell Plan", defaultCost: 110 },
  { label: "Software Subscriptions (CRM, Quoting, Accounting)", defaultCost: 225 },
  { label: "Website Hosting / Marketing Tools", defaultCost: 150 },
  { label: "Google Ads / ClickGrow Budget", defaultCost: 600 },
  { label: "Shop / Storage Rent", defaultCost: 400 },
  { label: "Accounting / Bookkeeping", defaultCost: 200 },
  { label: "Business Licenses & Permits", defaultCost: 50 },
  { label: "Trailer Maintenance & Tires", defaultCost: 100 },
  { label: "Truck Maintenance & Repairs", defaultCost: 300 },
  { label: "Safety Equipment (PPE, First Aid)", defaultCost: 50 },
  { label: "DOT Compliance / IFTA Filing", defaultCost: 40 },
  { label: "Tax Preparation / CPA Fees", defaultCost: 125 },
  { label: "Custom Item", defaultCost: 0 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem { name: string; monthlyCostCents: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const fmtDec = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);

function calcCosts(crew: {
  hoursPerDay: number; crewMemberCount: number; memberWageCents: number; burdenPct: number;
  equipmentItems: LineItem[]; machineBurnRateGph: number; fuelPriceCents: number; truckFuelPerDayCents: number;
  teethCostPerSetCents: number; daysPerSet: number; annualMajorWearCents: number; miscConsumablesPerDayCents: number;
  overheadItems: LineItem[]; workingDaysPerMonth: number; targetMarginPct: number; acresPerDay: number;
}) {
  const labor = crew.hoursPerDay * crew.crewMemberCount * crew.memberWageCents * (1 + crew.burdenPct / 100);
  const equipmentMonthly = crew.equipmentItems.reduce((s, i) => s + i.monthlyCostCents, 0);
  const equipment = equipmentMonthly / crew.workingDaysPerMonth;
  const fuel = crew.machineBurnRateGph * crew.hoursPerDay * crew.fuelPriceCents + crew.truckFuelPerDayCents;
  const wearTeeth = crew.teethCostPerSetCents / crew.daysPerSet;
  const wearAnnual = crew.annualMajorWearCents / (crew.workingDaysPerMonth * 12);
  const wear = wearTeeth + wearAnnual + crew.miscConsumablesPerDayCents;
  const overheadMonthly = crew.overheadItems.reduce((s, i) => s + i.monthlyCostCents, 0);
  const overhead = overheadMonthly / crew.workingDaysPerMonth;
  const totalCost = labor + equipment + fuel + wear + overhead;
  const dayRate = totalCost / (1 - crew.targetMarginPct / 100);
  const profit = dayRate - totalCost;
  const ratePerAcre = crew.acresPerDay > 0 ? dayRate / crew.acresPerDay : dayRate;
  return { labor, equipment, fuel, wear, overhead, totalCost, dayRate, profit, ratePerAcre };
}

// ─── Donut Chart (pure SVG) ───────────────────────────────────────────────────
const COLORS = { Labor: "#f97316", Equipment: "#22c55e", Fuel: "#3b82f6", Wear: "#eab308", Overhead: "#ef4444" };

function DonutChart({ segments }: { segments: { label: string; value: number }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">No cost data</div>;
  let cumAngle = -90;
  const paths = segments.map((seg) => {
    const pct = seg.value / total;
    const startAngle = cumAngle;
    cumAngle += pct * 360;
    const endAngle = cumAngle;
    const r = 70; const cx = 100; const cy = 100;
    const start = polarToCart(cx, cy, r, startAngle);
    const end = polarToCart(cx, cy, r, endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    return <path key={seg.label} d={d} fill={(COLORS as Record<string, string>)[seg.label] ?? "#888"} />;
  });
  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
      {paths}
      <circle cx="100" cy="100" r="42" fill="#18181b" />
    </svg>
  );
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Edit Pricing Modal ───────────────────────────────────────────────────────
type PricingForm = {
  hoursPerDay: number; crewMemberCount: number; memberWagePerHr: number; burdenPct: number;
  equipmentItems: LineItem[];
  machineBurnRateGph: number; fuelPricePerGal: number; truckFuelPerDay: number;
  teethCostPerSet: number; daysPerSet: number; annualMajorWear: number; miscConsumablesPerDay: number;
  overheadItems: LineItem[];
  workingDaysPerMonth: number; targetMarginPct: number; acresPerDay: number;
};

function EditPricingModal({
  open, onClose, crewId, initial,
}: {
  open: boolean; onClose: () => void; crewId: number;
  initial: PricingForm;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<PricingForm>(initial);

  const updateMutation = trpc.ops.crews.updateDetailedPricing.useMutation({
    onSuccess: () => {
      utils.ops.crews.getById.invalidate({ id: crewId });
      toast.success("Pricing updated");
      onClose();
    },
    onError: (e) => toast.error(e.message || "Save failed"),
  });

  const setField = <K extends keyof PricingForm>(k: K, v: PricingForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addEquipItem = () => setForm((f) => ({ ...f, equipmentItems: [...f.equipmentItems, { name: "", monthlyCostCents: 0 }] }));
  const removeEquipItem = (i: number) => setForm((f) => ({ ...f, equipmentItems: f.equipmentItems.filter((_, idx) => idx !== i) }));
  const updateEquipItem = (i: number, field: keyof LineItem, val: string | number) =>
    setForm((f) => ({ ...f, equipmentItems: f.equipmentItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const [selectedPreset, setSelectedPreset] = useState("");
  const [presetPrice, setPresetPrice] = useState(0);
  const [customItemName, setCustomItemName] = useState("");

  const addOverheadItem = () => setForm((f) => ({ ...f, overheadItems: [...f.overheadItems, { name: "", monthlyCostCents: 0 }] }));
  const removeOverheadItem = (i: number) => setForm((f) => ({ ...f, overheadItems: f.overheadItems.filter((_, idx) => idx !== i) }));
  const updateOverheadItem = (i: number, field: keyof LineItem, val: string | number) =>
    setForm((f) => ({ ...f, overheadItems: f.overheadItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const addOverheadFromPreset = () => {
    if (!selectedPreset) return;
    const name = selectedPreset === "Custom Item" ? (customItemName.trim() || "Custom Item") : selectedPreset;
    setForm((f) => ({
      ...f,
      overheadItems: [...f.overheadItems, { name, monthlyCostCents: Math.round(presetPrice * 100) }],
    }));
    setSelectedPreset(""); setCustomItemName(""); setPresetPrice(0);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: crewId,
      hoursPerDay: form.hoursPerDay,
      crewMemberCount: form.crewMemberCount,
      memberWageCents: Math.round(form.memberWagePerHr * 100),
      burdenPct: form.burdenPct,
      equipmentItems: form.equipmentItems,
      machineBurnRateGph: form.machineBurnRateGph,
      fuelPriceCents: Math.round(form.fuelPricePerGal * 100),
      truckFuelPerDayCents: Math.round(form.truckFuelPerDay * 100),
      teethCostPerSetCents: Math.round(form.teethCostPerSet * 100),
      daysPerSet: form.daysPerSet,
      annualMajorWearCents: Math.round(form.annualMajorWear * 100),
      miscConsumablesPerDayCents: Math.round(form.miscConsumablesPerDay * 100),
      overheadItems: form.overheadItems,
      workingDaysPerMonth: form.workingDaysPerMonth,
      targetMarginPct: form.targetMarginPct,
      acresPerDay: form.acresPerDay,
    });
  };

  const numInput = (label: string, value: number, onChange: (v: number) => void, prefix?: string, suffix?: string) => (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-zinc-400 text-sm">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
        />
        {suffix && <span className="text-zinc-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pricing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Labor */}
          <div>
            <h4 className="text-sm font-semibold text-orange-400 mb-3">Labor</h4>
            <div className="grid grid-cols-2 gap-3">
              {numInput("Hours Per Day", form.hoursPerDay, (v) => setField("hoursPerDay", v))}
              {numInput("Crew Members", form.crewMemberCount, (v) => setField("crewMemberCount", v))}
              {numInput("Wage Per Hour", form.memberWagePerHr, (v) => setField("memberWagePerHr", v), "$", "/hr")}
              {numInput("Burden %", form.burdenPct, (v) => setField("burdenPct", v), "", "%")}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-green-400">Equipment</h4>
              <Button variant="ghost" size="sm" onClick={addEquipItem} className="text-zinc-400 hover:text-white h-7 px-2">
                <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {form.equipmentItems.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input value={item.name} onChange={(e) => updateEquipItem(i, "name", e.target.value)}
                  placeholder="Equipment name" className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm flex-1" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400 text-sm">$</span>
                  <Input type="number" value={item.monthlyCostCents / 100}
                    onChange={(e) => updateEquipItem(i, "monthlyCostCents", Math.round((parseFloat(e.target.value) || 0) * 100))}
                    placeholder="$/mo" className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm w-24" />
                  <span className="text-zinc-500 text-xs">/mo</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEquipItem(i)} className="h-8 w-8 text-zinc-500 hover:text-red-400">
                  <MinusCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Fuel */}
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-3">Fuel</h4>
            <div className="grid grid-cols-2 gap-3">
              {numInput("Machine Burn Rate (GPH)", form.machineBurnRateGph, (v) => setField("machineBurnRateGph", v), "", "GPH")}
              {numInput("Fuel Price Per Gallon", form.fuelPricePerGal, (v) => setField("fuelPricePerGal", v), "$", "/gal")}
              {numInput("Truck Fuel Per Day", form.truckFuelPerDay, (v) => setField("truckFuelPerDay", v), "$")}
            </div>
          </div>

          {/* Wear */}
          <div>
            <h4 className="text-sm font-semibold text-yellow-400 mb-3">Wear &amp; Consumables</h4>
            <div className="grid grid-cols-2 gap-3">
              {numInput("Teeth Cost Per Set", form.teethCostPerSet, (v) => setField("teethCostPerSet", v), "$")}
              {numInput("Days Per Set", form.daysPerSet, (v) => setField("daysPerSet", v))}
              {numInput("Annual Major Wear", form.annualMajorWear, (v) => setField("annualMajorWear", v), "$")}
              {numInput("Misc Consumables/Day", form.miscConsumablesPerDay, (v) => setField("miscConsumablesPerDay", v), "$")}
            </div>
          </div>

          {/* Overhead */}
          <div>
            <h4 className="text-sm font-semibold text-red-400 mb-3">Monthly Overhead</h4>
            {/* Preset dropdown */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 mb-3">
              <p className="text-[11px] text-zinc-500 mb-2">Select a common overhead item to add:</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedPreset}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedPreset(val);
                      const found = OVERHEAD_PRESETS.find(p => p.label === val);
                      setPresetPrice(found ? found.defaultCost : 0);
                    }}
                    className="w-full appearance-none bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/60 transition-colors pr-7"
                  >
                    <option value="">-- Select item --</option>
                    {OVERHEAD_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={addOverheadFromPreset}
                  disabled={!selectedPreset}
                  className="flex items-center gap-1 bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-orange-400 text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {selectedPreset === "Custom Item" && (
                <input
                  type="text"
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  placeholder="Enter custom item name..."
                  className="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/60 transition-colors placeholder:text-zinc-600"
                />
              )}
              {selectedPreset && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 shrink-0">Monthly cost:</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-zinc-500">$</span>
                    <input
                      type="number"
                      value={presetPrice === 0 ? "" : presetPrice}
                      placeholder="0"
                      min={0} step={50}
                      onChange={e => setPresetPrice(Number(e.target.value))}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-right text-white outline-none focus:border-orange-500/60 transition-colors"
                    />
                    <span className="text-[11px] text-zinc-500">/mo</span>
                  </div>
                </div>
              )}
            </div>
            {form.overheadItems.length === 0 && (
              <p className="text-xs text-zinc-600 italic mb-2">No overhead items added yet.</p>
            )}
            {form.overheadItems.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input value={item.name} onChange={(e) => updateOverheadItem(i, "name", e.target.value)}
                  placeholder="Overhead category" className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm flex-1" />
                <div className="flex items-center gap-1">
                  <span className="text-zinc-400 text-sm">$</span>
                  <Input type="number" value={item.monthlyCostCents / 100}
                    onChange={(e) => updateOverheadItem(i, "monthlyCostCents", Math.round((parseFloat(e.target.value) || 0) * 100))}
                    placeholder="$/mo" className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm w-24" />
                  <span className="text-zinc-500 text-xs">/mo</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeOverheadItem(i)} className="h-8 w-8 text-zinc-500 hover:text-red-400">
                  <MinusCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Scheduling / Margin */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Scheduling &amp; Margin</h4>
            <div className="grid grid-cols-3 gap-3">
              {numInput("Working Days/Month", form.workingDaysPerMonth, (v) => setField("workingDaysPerMonth", v))}
              {numInput("Target Margin %", form.targetMarginPct, (v) => setField("targetMarginPct", v), "", "%")}
              {numInput("Acres/Day", form.acresPerDay, (v) => setField("acresPerDay", v))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
            {updateMutation.isPending ? "Saving..." : "Save Pricing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CrewPricing() {
  const params = useParams<{ id: string }>();
  const crewId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const [editOpen, setEditOpen] = useState(false);
  const [previewMargin, setPreviewMargin] = useState<number | null>(null);

  const handleSliderChange = useCallback((vals: number[]) => {
    setPreviewMargin(vals[0]);
  }, []);

  const { data: crew, isLoading } = trpc.ops.crews.getById.useQuery({ id: crewId }, { enabled: crewId > 0 });

  const costs = useMemo(() => {
    if (!crew) return null;
    return calcCosts({
      hoursPerDay: crew.hoursPerDay,
      crewMemberCount: crew.crewMemberCount,
      memberWageCents: crew.memberWageCents,
      burdenPct: crew.burdenPct,
      equipmentItems: crew.equipmentItems,
      machineBurnRateGph: crew.machineBurnRateGph,
      fuelPriceCents: crew.fuelPriceCents,
      truckFuelPerDayCents: crew.truckFuelPerDayCents,
      teethCostPerSetCents: crew.teethCostPerSetCents,
      daysPerSet: crew.daysPerSet,
      annualMajorWearCents: crew.annualMajorWearCents,
      miscConsumablesPerDayCents: crew.miscConsumablesPerDayCents,
      overheadItems: crew.overheadItems,
      workingDaysPerMonth: crew.workingDaysPerMonth,
      targetMarginPct: crew.targetMarginPct,
      acresPerDay: crew.acresPerDay,
    });
  }, [crew]);

  if (isLoading) {
    return (
      <OpsDashboardLayout>
        <div className="flex items-center justify-center h-64 text-zinc-400">Loading...</div>
      </OpsDashboardLayout>
    );
  }

  if (!crew || !costs) {
    return (
      <OpsDashboardLayout>
        <div className="flex items-center justify-center h-64 text-zinc-400">Crew not found.</div>
      </OpsDashboardLayout>
    );
  }

  const initialForm: PricingForm = {
    hoursPerDay: crew.hoursPerDay,
    crewMemberCount: crew.crewMemberCount,
    memberWagePerHr: crew.memberWageCents / 100,
    burdenPct: crew.burdenPct,
    equipmentItems: crew.equipmentItems,
    machineBurnRateGph: crew.machineBurnRateGph,
    fuelPricePerGal: crew.fuelPriceCents / 100,
    truckFuelPerDay: crew.truckFuelPerDayCents / 100,
    teethCostPerSet: crew.teethCostPerSetCents / 100,
    daysPerSet: crew.daysPerSet,
    annualMajorWear: crew.annualMajorWearCents / 100,
    miscConsumablesPerDay: crew.miscConsumablesPerDayCents / 100,
    overheadItems: crew.overheadItems,
    workingDaysPerMonth: crew.workingDaysPerMonth,
    targetMarginPct: crew.targetMarginPct,
    acresPerDay: crew.acresPerDay,
  };

  const donutSegments = [
    { label: "Labor", value: costs.labor },
    { label: "Equipment", value: costs.equipment },
    { label: "Fuel", value: costs.fuel },
    { label: "Wear", value: costs.wear },
    { label: "Overhead", value: costs.overhead },
  ];

  const equipmentDailyCost = crew.equipmentItems.reduce((s, i) => s + i.monthlyCostCents, 0) / crew.workingDaysPerMonth;
  const overheadDailyCost = crew.overheadItems.reduce((s, i) => s + i.monthlyCostCents, 0) / crew.workingDaysPerMonth;

  return (
    <OpsDashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate("/ops/crews")} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Crews
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{crew.name}</h1>
            <p className="text-zinc-400 text-sm mt-0.5">{crew.equipmentType} Crew</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-900/40 text-green-400 border-green-800">Active</Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}
              className="border-zinc-700 text-zinc-300 hover:text-white gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit Pricing
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — KPI cards + breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Breakeven Floor */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Breakeven Floor (Cost/Day)</p>
                <p className="text-2xl font-bold text-white">{fmtDec(costs.totalCost)}</p>
                <p className="text-xs text-zinc-500 mt-1">Below this number, you lose money every day.</p>
              </CardContent>
            </Card>

            {/* Crew-Day Rate — featured */}
            <Card className="bg-zinc-900 border-orange-700 ring-1 ring-orange-700/50">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Your Crew-Day Rate</p>
                <p className="text-3xl font-bold text-orange-400">{fmt(costs.dayRate)}</p>
                <p className="text-xs text-zinc-400 mt-1">per crew-day at {crew.targetMarginPct}% target margin</p>
              </CardContent>
            </Card>

            {/* Profit Per Day */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Profit Per Day (Margin Cushion)</p>
                <p className={`text-2xl font-bold ${costs.profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtDec(costs.profit)}</p>
                <p className="text-xs text-zinc-500 mt-1">This is your margin cushion — the gap between cost and rate.</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Cost Breakdown */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Daily Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DonutChart segments={donutSegments} />
                <div className="flex-1 space-y-2 w-full">
                  {donutSegments.map((seg) => (
                    <div key={seg.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (COLORS as Record<string, string>)[seg.label] }} />
                        <span className="text-sm text-zinc-300">{seg.label}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{fmtDec(seg.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labor Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Labor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-300"><span>Hours Per Day</span><span>{crew.hoursPerDay}</span></div>
              <div className="flex justify-between text-zinc-300"><span>Crew Members</span><span>{crew.crewMemberCount}</span></div>
              <div className="flex justify-between text-zinc-300">
                <span>Member Wage</span>
                <span>${(crew.memberWageCents / 100).toFixed(2)}/hr + {crew.burdenPct}% burden</span>
              </div>
              <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-2">
                <span>Daily Labor Cost</span><span>{fmtDec(costs.labor)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" /> Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {crew.equipmentItems.length === 0 && (
                <p className="text-zinc-500 text-xs">No equipment added. Click Edit Pricing to add items.</p>
              )}
              {crew.equipmentItems.map((item, i) => (
                <div key={i} className="flex justify-between text-zinc-300">
                  <span>{item.name}</span>
                  <span>{fmt(item.monthlyCostCents)}/mo</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-2">
                <span>Daily Equipment Cost</span><span>{fmtDec(equipmentDailyCost)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Fuel Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Fuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-300"><span>Machine Burn Rate</span><span>{crew.machineBurnRateGph} GPH</span></div>
              <div className="flex justify-between text-zinc-300"><span>Fuel Price</span><span>${(crew.fuelPriceCents / 100).toFixed(2)}/gal</span></div>
              <div className="flex justify-between text-zinc-300"><span>Truck Fuel/Day</span><span>{fmtDec(crew.truckFuelPerDayCents)}</span></div>
              <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-2">
                <span>Daily Fuel Cost</span><span>{fmtDec(costs.fuel)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Wear & Consumables Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Wear &amp; Consumables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-300"><span>Teeth Cost/Set</span><span>{fmt(crew.teethCostPerSetCents)}</span></div>
              <div className="flex justify-between text-zinc-300"><span>Days Per Set</span><span>{crew.daysPerSet}</span></div>
              <div className="flex justify-between text-zinc-300"><span>Annual Major Wear</span><span>{fmt(crew.annualMajorWearCents)}</span></div>
              <div className="flex justify-between text-zinc-300"><span>Misc Consumables/Day</span><span>{fmtDec(crew.miscConsumablesPerDayCents)}</span></div>
              <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-2">
                <span>Daily Wear Cost</span><span>{fmtDec(costs.wear)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Overhead Section */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Monthly Overhead
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {crew.overheadItems.length === 0 && (
                <p className="text-zinc-500 text-xs">No overhead items added. Click Edit Pricing to add items.</p>
              )}
              {crew.overheadItems.map((item, i) => (
                <div key={i} className="flex justify-between text-zinc-300">
                  <span>{item.name}</span>
                  <span>{fmt(item.monthlyCostCents)}/mo</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-2">
                <span>Daily Overhead Cost</span><span>{fmtDec(overheadDailyCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Crew Details + Quick Stats */}
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Crew Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Name", value: crew.name },
                { label: "Type", value: crew.equipmentType },
                { label: "Working Days/Mo", value: `${crew.workingDaysPerMonth} (${Math.round(crew.workingDaysPerMonth / 4.33)} days/wk)` },
                { label: "Target Margin", value: `${crew.targetMarginPct}%` },
                { label: "Acres/Day", value: crew.acresPerDay },
                { label: "Created", value: new Date(crew.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric" }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-zinc-200 font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Core stats row */}
              {[
                { label: "Day Rate", value: fmt(costs.dayRate), color: "text-white" },
                { label: "Cost/Day", value: fmt(costs.totalCost), color: "text-white" },
                { label: "Profit/Day", value: fmt(costs.profit), color: costs.profit >= 0 ? "text-green-400" : "text-red-400" },
                { label: "Rate/Acre", value: fmt(costs.ratePerAcre), color: "text-white" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-zinc-500">{label}</span>
                  <span className={`font-semibold ${color}`}>{value}</span>
                </div>
              ))}

              {/* Divider */}
              <div className="border-t border-zinc-800 pt-3">
                {/* Margin slider */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-400 text-xs uppercase tracking-wide">Preview Margin</span>
                    <span className="text-orange-400 font-bold text-sm">
                      {previewMargin !== null ? previewMargin : crew.targetMarginPct}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={70}
                    step={1}
                    value={[previewMargin !== null ? previewMargin : crew.targetMarginPct]}
                    onValueChange={handleSliderChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-zinc-600 text-xs mt-1">
                    <span>0%</span>
                    <span>35%</span>
                    <span>70%</span>
                  </div>
                  {previewMargin !== null && previewMargin !== crew.targetMarginPct && (
                    <button
                      onClick={() => setPreviewMargin(null)}
                      className="mt-1.5 text-xs text-zinc-500 hover:text-zinc-300 underline"
                    >
                      Reset to saved ({crew.targetMarginPct}%)
                    </button>
                  )}
                </div>

                {/* Sensitivity table */}
                <div className="rounded-lg overflow-hidden border border-zinc-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-800/60">
                        <th className="text-left px-2.5 py-1.5 text-zinc-400 font-medium">Margin</th>
                        <th className="text-right px-2.5 py-1.5 text-zinc-400 font-medium">Day Rate</th>
                        <th className="text-right px-2.5 py-1.5 text-zinc-400 font-medium">Profit/Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const activeMargin = previewMargin !== null ? previewMargin : crew.targetMarginPct;
                        // Build 5 scenario rows centered around the active margin
                        const step = 5;
                        const base = Math.round(activeMargin / step) * step;
                        const rows = [-2, -1, 0, 1, 2].map((offset) => {
                          const m = Math.max(0, Math.min(70, base + offset * step));
                          const rate = costs.totalCost / (1 - m / 100);
                          const profit = rate - costs.totalCost;
                          const isActive = m === activeMargin;
                          const isSaved = m === crew.targetMarginPct;
                          return { m, rate, profit, isActive, isSaved };
                        });
                        // Always include the exact active margin if it's not already in the list
                        const hasActive = rows.some((r) => r.m === activeMargin);
                        const displayRows = hasActive
                          ? rows
                          : [
                              ...rows.slice(0, 2),
                              { m: activeMargin, rate: costs.totalCost / (1 - activeMargin / 100), profit: costs.totalCost / (1 - activeMargin / 100) - costs.totalCost, isActive: true, isSaved: activeMargin === crew.targetMarginPct },
                              ...rows.slice(2),
                            ].sort((a, b) => a.m - b.m);
                        return displayRows.map(({ m, rate, profit, isActive, isSaved }) => (
                          <tr
                            key={m}
                            className={`border-t border-zinc-800/50 ${
                              isActive
                                ? "bg-orange-950/40"
                                : "hover:bg-zinc-800/30"
                            }`}
                          >
                            <td className="px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={isActive ? "text-orange-400 font-bold" : "text-zinc-300"}>{m}%</span>
                                {isSaved && (
                                  <span className="text-zinc-500 text-xs">(saved)</span>
                                )}
                              </div>
                            </td>
                            <td className={`px-2.5 py-1.5 text-right font-medium ${
                              isActive ? "text-orange-400" : "text-zinc-200"
                            }`}>
                              {fmt(rate)}
                            </td>
                            <td className={`px-2.5 py-1.5 text-right font-medium ${
                              profit >= 0 ? (isActive ? "text-green-400" : "text-green-500/80") : "text-red-400"
                            }`}>
                              {fmt(profit)}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
                <p className="text-zinc-600 text-xs mt-2">Drag the slider to preview how margin changes affect your rate and daily profit. Changes here are not saved.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Pricing Modal */}
      {editOpen && (
        <EditPricingModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          crewId={crewId}
          initial={initialForm}
        />
      )}
    </OpsDashboardLayout>
  );
}
