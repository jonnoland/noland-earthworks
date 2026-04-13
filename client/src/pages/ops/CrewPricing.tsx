/**
 * CrewPricing — detailed cost breakdown page for a single crew.
 * Matches the OwnrOps pricing page layout:
 *   - KPI cards: Breakeven Floor, Crew-Day Rate, Profit Per Day
 *   - Donut chart: daily cost breakdown by category
 *   - Five expandable sections: Labor, Equipment, Fuel, Wear & Consumables, Monthly Overhead
 *   - Right column: Crew Details card + Quick Stats card
 *   - Edit Pricing modal with all inputs
 */
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Edit, Trash2, PlusCircle, MinusCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";

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

  const addOverheadItem = () => setForm((f) => ({ ...f, overheadItems: [...f.overheadItems, { name: "", monthlyCostCents: 0 }] }));
  const removeOverheadItem = (i: number) => setForm((f) => ({ ...f, overheadItems: f.overheadItems.filter((_, idx) => idx !== i) }));
  const updateOverheadItem = (i: number, field: keyof LineItem, val: string | number) =>
    setForm((f) => ({ ...f, overheadItems: f.overheadItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

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
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-red-400">Monthly Overhead</h4>
              <Button variant="ghost" size="sm" onClick={addOverheadItem} className="text-zinc-400 hover:text-white h-7 px-2">
                <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
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
                <span className="text-orange-400">&#9650;</span> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
