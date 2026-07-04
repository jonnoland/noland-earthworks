/**
 * AI Job Cost Estimator — Internal ops tool
 * Enter job details, get a full internal cost breakdown vs customer price range.
 * All 6 services, all modifiers, mobilization miles, universal add-ons.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, TrendingUp, DollarSign, Clock, Eye, EyeOff, Satellite, Sparkles, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type EstimateResult = {
  estimatedHours: number;
  estimatedDays: number;
  fuelCost: number;
  mobilizationCost: number;
  laborCost: number;
  equipmentCost: number;
  totalInternalCost: number;
  customerPriceLow: number;
  customerPriceHigh: number;
  marginPct: number;
  summary: string;
  warnings: string[];
  breakdown: { label: string; hours?: number; cost: number; note?: string }[];
};

type PricingTier = "low" | "mid" | "high";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function getRecommendedPrice(result: EstimateResult, tier: PricingTier): number {
  if (tier === "low") return result.customerPriceLow;
  if (tier === "high") return result.customerPriceHigh;
  return Math.round((result.customerPriceLow + result.customerPriceHigh) / 2);
}

function getMarginAtPrice(price: number, internalCost: number): string {
  if (internalCost <= 0 || price <= 0) return "0";
  return ((price - internalCost) / price * 100).toFixed(0);
}

// ─── Loading animation steps ─────────────────────────────────────────────────
const LOADING_STEPS = [
  { label: "Reading job details",            duration: 1200 },
  { label: "Calculating machine hours",      duration: 1600 },
  { label: "Applying terrain & density",     duration: 1400 },
  { label: "Computing fuel & wear costs",    duration: 1500 },
  { label: "Checking travel surcharge",      duration: 1000 },
  { label: "Running market rate comparison", duration: 1800 },
  { label: "Calculating gross margin",       duration: 1200 },
  { label: "Finalizing estimate",            duration: 1000 },
];

function EstimateLoadingPanel({ service }: { service: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dots, setDots] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cycle through steps
  useEffect(() => {
    let current = 0;
    const advance = () => {
      if (current < LOADING_STEPS.length - 1) {
        setCompletedSteps(prev => [...prev, current]);
        current++;
        setStepIndex(current);
        timerRef.current = setTimeout(advance, LOADING_STEPS[current].duration);
      }
    };
    timerRef.current = setTimeout(advance, LOADING_STEPS[0].duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Animated dots on current step
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(id);
  }, []);

  const progress = Math.round(((completedSteps.length) / LOADING_STEPS.length) * 100);

  return (
    <Card className="bg-zinc-900 border-zinc-700 overflow-hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800">
        <div
          className="h-full bg-orange-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <CardContent className="pt-6 pb-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-orange-500/30 flex items-center justify-center">
                <Loader2 size={20} className="text-orange-500 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-orange-500/10 animate-ping" />
            </div>
          </div>
          <p className="text-white font-semibold text-sm">
            Generating estimate for <span className="text-orange-400">{service}</span>
          </p>
          <p className="text-zinc-500 text-xs">AI is analyzing your job — this takes 10–20 seconds</p>
        </div>

        {/* Step list */}
        <div className="space-y-2">
          {LOADING_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isActive = i === stepIndex;
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3 py-2 rounded transition-all duration-300 ${
                  isActive ? "bg-orange-600/10 border border-orange-600/25" :
                  isDone  ? "opacity-50" : "opacity-25"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                ) : isActive ? (
                  <Loader2 size={14} className="text-orange-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />
                )}
                <span className={`text-sm ${
                  isActive ? "text-orange-200 font-medium" :
                  isDone  ? "text-zinc-400" : "text-zinc-600"
                }`}>
                  {step.label}{isActive ? dots : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress percentage */}
        <div className="text-center">
          <span className="text-zinc-500 text-xs tabular-nums">{progress}% complete</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Universal add-on options ─────────────────────────────────────────────────
const UNIVERSAL_ADDONS = [
  { label: "Post-Clear Seeding & Erosion Control", hint: "$150–$700/acre" },
  { label: "Mulch Redistribution", hint: "$150–$900/hr" },
  { label: "Selective Clearing & Tree Preservation", hint: "$150–$500 flat" },
];

const TRAIL_ADDONS = [
  { label: "Mulch Redistribution", hint: "redistribute cut material" },
  { label: "Post-Clear Seeding & Erosion Control", hint: "$150–$700/acre" },
  { label: "Selective Clearing & Tree Preservation", hint: "preserve specific trees" },
];

export default function CostEstimator() {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [service, setService] = useState("Forestry Mulching");
  const [acreage, setAcreage] = useState("");
  const [linearFeet, setLinearFeet] = useState("");
  const [terrain, setTerrain] = useState<"flat" | "rolling" | "steep" | "very_steep">("rolling");
  const [vegetationDensity, setVegetationDensity] = useState<"light" | "moderate" | "heavy" | "very_heavy">("moderate");
  const [accessDifficulty, setAccessDifficulty] = useState<"easy" | "moderate" | "difficult">("easy");
  const [pricingTier, setPricingTier] = useState<PricingTier>("mid");
  const [clientView, setClientView] = useState(false);
  const [mobilizationMiles, setMobilizationMiles] = useState("25");
  const [hasStumps, setHasStumps] = useState(false);
  const [stumpCount, setStumpCount] = useState("");
  const [notes, setNotes] = useState("");

  // Trail Cutting specific
  const [trailWidth, setTrailWidth] = useState("10");
  const [trailAddOns, setTrailAddOns] = useState<string[]>([]);

  // ROW Clearing specific
  const [rowWidth, setRowWidth] = useState("20");

  // Universal add-ons
  const [addOns, setAddOns] = useState<string[]>([]);
  const [fenceLineLF, setFenceLineLF] = useState("");

  // Satellite auto-fill
  const [propertyAddress, setPropertyAddress] = useState("");
  const [satelliteAnalysis, setSatelliteAnalysis] = useState<string | null>(null);
  const [satelliteMapUrl, setSatelliteMapUrl] = useState<string | null>(null);

  const analyzeProperty = trpc.ops.analyzePropertySatellite.useMutation({
    onSuccess: (data) => {
      setSatelliteAnalysis(data.analysis);
      setSatelliteMapUrl(data.mapUrl);
      const text = data.analysis.toLowerCase();
      if (text.includes("steep")) setTerrain("steep");
      else if (text.includes("rolling")) setTerrain("rolling");
      else if (text.includes("flat")) setTerrain("flat");
      if (text.includes("very heavy") || text.includes("thick") || text.includes("dense")) setVegetationDensity("very_heavy");
      else if (text.includes("heavy")) setVegetationDensity("heavy");
      else if (text.includes("moderate")) setVegetationDensity("moderate");
      else if (text.includes("light")) setVegetationDensity("light");
      if (text.includes("difficult")) setAccessDifficulty("difficult");
      else if (text.includes("moderate")) setAccessDifficulty("moderate");
      toast.success("Satellite analysis complete — fields updated.");
    },
    onError: (err) => toast.error(err.message || "Satellite analysis failed."),
  });

  const isRowService = service === "Right-of-Way Clearing";
  const isTrailService = service === "Trail Cutting";
  const isBrushHogging = service === "Brush Hogging";

  const estimate = trpc.costEstimator.estimate.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err.message || "Something went wrong. Try again."),
  });

  const handleSubmit = () => {
    if (!service) return;
    if (!isRowService && !acreage) {
      toast.error("Enter the job acreage to generate an estimate.");
      return;
    }
    if (isRowService && !linearFeet) {
      toast.error("Enter the linear footage for ROW clearing.");
      return;
    }

    estimate.mutate({
      service,
      acreage: !isRowService && acreage ? parseFloat(acreage) : undefined,
      linearFeet: (isRowService || isTrailService) && linearFeet ? parseInt(linearFeet) : undefined,
      terrain,
      vegetationDensity,
      accessDifficulty,
      mobilizationMiles: parseFloat(mobilizationMiles) || 0,
      hasStumps,
      stumpCount: hasStumps ? parseInt(stumpCount) || 0 : 0,
      notes: notes || undefined,
      trailWidth: isTrailService ? parseFloat(trailWidth) : undefined,
      trailAddOns: isTrailService && trailAddOns.length > 0 ? trailAddOns : undefined,
      rowWidth: isRowService ? parseFloat(rowWidth) : undefined,
      addOns: !isTrailService && addOns.length > 0 ? addOns : undefined,
      fenceLineLF: fenceLineLF ? parseInt(fenceLineLF) : undefined,
    });
  };

  const toggleAddOn = (label: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(label) ? list.filter(a => a !== label) : [...list, label]);
  };

  const marginColor = result
    ? result.marginPct >= 45 ? "text-green-400"
    : result.marginPct >= 35 ? "text-yellow-400"
    : "text-red-400"
    : "";

  const tierLabel: Record<PricingTier, string> = { low: "Low", mid: "Mid", high: "High" };
  const tierDescription: Record<PricingTier, string> = {
    low: "Competitive rate — price-sensitive market or straightforward job",
    mid: "Standard market rate — default for most jobs",
    high: "Premium rate — difficult conditions, high density, or strong demand",
  };

  // Effective acres display for ROW
  const rowEffectiveAcres = isRowService && linearFeet && rowWidth
    ? ((parseInt(linearFeet) * parseFloat(rowWidth)) / 43560).toFixed(3)
    : null;

  // Linear feet equivalent for Trail Cutting
  const trailLfEquiv = isTrailService && acreage && trailWidth
    ? Math.round((parseFloat(acreage) * 43560) / parseFloat(trailWidth))
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Job Cost Estimator</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Internal tool — enter job details to get a cost breakdown before quoting.
            </p>
          </div>
          {result && (
            <button
              onClick={() => setClientView(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                clientView
                  ? "bg-orange-600/20 border-orange-600/50 text-orange-300 hover:bg-orange-600/30"
                  : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {clientView ? <EyeOff size={14} /> : <Eye size={14} />}
              {clientView ? "Client View" : "Internal View"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Input form ─────────────────────────────────────────────────────── */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Satellite Auto-Fill */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-orange-400" />
                  Property Address <span className="text-zinc-500 font-normal">(optional — auto-fills fields)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={propertyAddress}
                    onChange={e => setPropertyAddress(e.target.value)}
                    placeholder="e.g. 123 Hollow Rd, Vanleer, TN"
                    className="bg-zinc-800 border-zinc-600 text-white flex-1"
                    onKeyDown={e => {
                      if (e.key === "Enter" && propertyAddress.trim()) {
                        analyzeProperty.mutate({ address: propertyAddress.trim() });
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-orange-600/50 text-orange-300 hover:bg-orange-600/20"
                    disabled={!propertyAddress.trim() || analyzeProperty.isPending}
                    onClick={() => analyzeProperty.mutate({ address: propertyAddress.trim() })}
                  >
                    {analyzeProperty.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Analyze</>
                    )}
                  </Button>
                </div>
                {satelliteAnalysis && (
                  <div className="mt-2 rounded border border-orange-600/30 bg-orange-600/5 p-2.5 space-y-2">
                    {satelliteMapUrl && (
                      <img
                        src={satelliteMapUrl}
                        alt="Satellite view"
                        className="w-full rounded border border-zinc-700 object-cover max-h-40"
                      />
                    )}
                    <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{satelliteAnalysis}</p>
                    <p className="text-[10px] text-orange-400/70">Fields auto-updated from satellite analysis. Adjust as needed.</p>
                  </div>
                )}
              </div>

              {/* Service */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Service</Label>
                <Select value={service} onValueChange={v => { setService(v); setAddOns([]); setTrailAddOns([]); }}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Forestry Mulching">Forestry Mulching</SelectItem>
                    <SelectItem value="Land Management">Land Management</SelectItem>
                    <SelectItem value="Vegetation Management">Vegetation Management</SelectItem>
                    <SelectItem value="Right-of-Way Clearing">Right-of-Way Clearing</SelectItem>
                    <SelectItem value="Trail Cutting">Trail Cutting</SelectItem>
                    <SelectItem value="Brush Hogging">Brush Hogging</SelectItem>
                    <SelectItem value="Stump Grinding Only">Stump Grinding Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Trail Cutting — width + linear feet */}
              {isTrailService && (
                <div className="space-y-3 rounded border border-orange-600/30 bg-orange-600/5 p-3">
                  <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide">Trail Details</p>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Trail Width</Label>
                    <Select value={trailWidth} onValueChange={setTrailWidth}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 ft — Foot / ATV path</SelectItem>
                        <SelectItem value="8">8 ft — ATV / UTV</SelectItem>
                        <SelectItem value="10">10 ft — Standard trail</SelectItem>
                        <SelectItem value="12">12 ft — Wide trail / access road</SelectItem>
                        <SelectItem value="16">16 ft — Equipment access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Linear Feet <span className="text-zinc-500 font-normal">(optional — if known)</span></Label>
                    <Input
                      type="number"
                      value={linearFeet}
                      onChange={e => setLinearFeet(e.target.value)}
                      placeholder="e.g. 2640"
                      className="bg-zinc-800 border-zinc-600 text-white"
                    />
                  </div>
                  {trailLfEquiv && (
                    <p className="text-zinc-400 text-xs">
                      <Info className="inline w-3 h-3 mr-1 text-orange-400" />
                      {acreage} effective acres at {trailWidth} ft wide ≈ {trailLfEquiv.toLocaleString()} linear feet
                    </p>
                  )}
                </div>
              )}

              {/* ROW Clearing — linear feet + width */}
              {isRowService && (
                <div className="space-y-3 rounded border border-orange-600/30 bg-orange-600/5 p-3">
                  <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide">ROW Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300">Linear Feet</Label>
                      <Input
                        type="number"
                        value={linearFeet}
                        onChange={e => setLinearFeet(e.target.value)}
                        placeholder="e.g. 1320"
                        className="bg-zinc-800 border-zinc-600 text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-300">ROW Width (ft)</Label>
                      <Input
                        type="number"
                        value={rowWidth}
                        onChange={e => setRowWidth(e.target.value)}
                        placeholder="e.g. 20"
                        className="bg-zinc-800 border-zinc-600 text-white"
                      />
                    </div>
                  </div>
                  {rowEffectiveAcres && (
                    <p className="text-zinc-400 text-xs">
                      <Info className="inline w-3 h-3 mr-1 text-orange-400" />
                      {linearFeet} LF × {rowWidth} ft ÷ 43,560 = <strong className="text-white">{rowEffectiveAcres} effective acres</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Acreage — shown for all non-ROW services */}
              {!isRowService && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">
                    {isTrailService ? "Effective Acres" : "Acreage"}
                    {isTrailService && (
                      <span className="text-zinc-500 font-normal ml-1">(length × width ÷ 43,560)</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={acreage}
                    onChange={e => setAcreage(e.target.value)}
                    placeholder={isTrailService ? "e.g. 0.25" : "e.g. 5.0"}
                    step={isTrailService ? "0.01" : "0.5"}
                    min="0.01"
                    className="bg-zinc-800 border-zinc-600 text-white"
                  />
                </div>
              )}

              {/* Terrain */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Terrain</Label>
                <Select value={terrain} onValueChange={v => setTerrain(v as typeof terrain)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="rolling">Rolling</SelectItem>
                    <SelectItem value="steep">Steep</SelectItem>
                    <SelectItem value="very_steep">Very Steep</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vegetation density — not shown for stump grinding only */}
              {service !== "Stump Grinding Only" && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Vegetation Density</Label>
                  <Select value={vegetationDensity} onValueChange={v => setVegetationDensity(v as typeof vegetationDensity)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light (grass, small brush)</SelectItem>
                      <SelectItem value="moderate">Moderate (mixed brush, saplings)</SelectItem>
                      <SelectItem value="heavy">Heavy (dense brush, small trees)</SelectItem>
                      <SelectItem value="very_heavy">Very Heavy (thick cedar, hardwood)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Site Access */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Site Access</Label>
                <Select value={accessDifficulty} onValueChange={v => setAccessDifficulty(v as typeof accessDifficulty)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (paved road, open gate)</SelectItem>
                    <SelectItem value="moderate">Moderate (gravel road, some obstacles)</SelectItem>
                    <SelectItem value="difficult">Difficult (no road, narrow access, locked gate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mobilization Miles */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300 flex items-center gap-1.5">
                  Distance from Vanleer, TN
                  <span className="text-zinc-500 font-normal">(one-way miles)</span>
                </Label>
                <Input
                  type="number"
                  value={mobilizationMiles}
                  onChange={e => setMobilizationMiles(e.target.value)}
                  placeholder="e.g. 25"
                  min="0"
                  max="300"
                  className="bg-zinc-800 border-zinc-600 text-white"
                />
                <p className="text-zinc-500 text-xs">
                  {(() => {
                    const mi = parseFloat(mobilizationMiles) || 0;
                    if (mi <= 30) return "Local (0–30 mi) — no travel surcharge";
                    if (mi <= 50) return "Near (31–50 mi) — +$150 surcharge";
                    if (mi <= 75) return "Regional (51–75 mi) — +$300 surcharge";
                    if (mi <= 100) return "Extended (76–100 mi) — +$500 surcharge";
                    return "Long-Haul (100+ mi) — +$750 surcharge";
                  })()}
                </p>
              </div>

              {/* Pricing Tier */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Pricing Tier</Label>
                <Select value={pricingTier} onValueChange={v => setPricingTier(v as PricingTier)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — competitive / price-sensitive market</SelectItem>
                    <SelectItem value="mid">Mid — standard market rate (default)</SelectItem>
                    <SelectItem value="high">High — premium / difficult conditions</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-zinc-500 text-xs">{tierDescription[pricingTier]}</p>
              </div>

              {/* Stumps */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasStumps"
                  checked={hasStumps}
                  onChange={e => setHasStumps(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <Label htmlFor="hasStumps" className="text-zinc-300 cursor-pointer">
                  Stump grinding needed
                </Label>
              </div>
              {hasStumps && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Number of stumps</Label>
                  <Input
                    type="number"
                    value={stumpCount}
                    onChange={e => setStumpCount(e.target.value)}
                    placeholder="e.g. 12"
                    className="bg-zinc-800 border-zinc-600 text-white"
                  />
                </div>
              )}

              {/* Trail Cutting add-ons */}
              {isTrailService && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Trail Add-Ons</Label>
                  {TRAIL_ADDONS.map(({ label, hint }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-zinc-800/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={trailAddOns.includes(label)}
                        onChange={() => toggleAddOn(label, trailAddOns, setTrailAddOns)}
                        className="w-3.5 h-3.5 accent-orange-500"
                      />
                      <span className="text-zinc-300 text-sm">{label}</span>
                      <span className="text-zinc-500 text-xs ml-auto">{hint}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Universal add-ons — shown for non-trail services */}
              {!isTrailService && !isBrushHogging && service !== "Stump Grinding Only" && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Add-Ons</Label>
                  {UNIVERSAL_ADDONS.map(({ label, hint }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-zinc-800/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={addOns.includes(label)}
                        onChange={() => toggleAddOn(label, addOns, setAddOns)}
                        className="w-3.5 h-3.5 accent-orange-500"
                      />
                      <span className="text-zinc-300 text-sm">{label}</span>
                      <span className="text-zinc-500 text-xs ml-auto">{hint}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Fence Line LF — shown for all clearing services */}
              {!isBrushHogging && service !== "Stump Grinding Only" && (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300 flex items-center gap-1.5">
                    Fence Line Clearing
                    <span className="text-zinc-500 font-normal">(linear feet, if applicable)</span>
                  </Label>
                  <Input
                    type="number"
                    value={fenceLineLF}
                    onChange={e => setFenceLineLF(e.target.value)}
                    placeholder="e.g. 500"
                    className="bg-zinc-800 border-zinc-600 text-white"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Additional notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Wet ground, fence line nearby, customer wants debris mulched in place..."
                  className="bg-zinc-800 border-zinc-600 text-white resize-none"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={estimate.isPending}
                className="w-full font-semibold"
                style={{ backgroundColor: "#E07B2A" }}
              >
                {estimate.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Generating estimate...
                  </>
                ) : (
                  "Generate Cost Estimate"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* ── Results ──────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {!result && !estimate.isPending && (
              <Card className="bg-zinc-900 border-zinc-700">
                <CardContent className="py-12 text-center text-zinc-500">
                  <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Fill in the job details and click Generate to see your cost breakdown.</p>
                </CardContent>
              </Card>
            )}

            {estimate.isPending && (
              <EstimateLoadingPanel service={service} />
            )}

            {result && (
              <>
                {/* Summary */}
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-zinc-300 text-sm leading-relaxed">{result.summary}</p>
                  </CardContent>
                </Card>

                {/* Recommended quote */}
                <Card className="bg-orange-950/40 border-orange-600/60">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign size={14} className="text-orange-400" />
                          <span className="text-orange-300 text-xs uppercase tracking-wide font-medium">
                            {clientView ? "Job Price" : "Recommended Quote"}
                          </span>
                          {!clientView && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-800/60 text-orange-200 font-semibold uppercase tracking-wide">
                              {tierLabel[pricingTier]}
                            </span>
                          )}
                        </div>
                        <p className="text-orange-400 text-3xl font-bold">
                          {fmt(getRecommendedPrice(result, pricingTier))}
                        </p>
                        {!clientView && (
                          <p className="text-zinc-400 text-xs mt-1">
                            Full range: {fmt(result.customerPriceLow)} – {fmt(result.customerPriceHigh)}
                          </p>
                        )}
                      </div>
                      {!clientView && (
                        <div className="text-right">
                          <p className="text-zinc-500 text-xs">Internal cost</p>
                          <p className="text-zinc-200 text-base font-semibold">{fmt(result.totalInternalCost)}</p>
                          <p className="text-zinc-500 text-xs mt-2">Margin at this price</p>
                          <p className={`text-base font-semibold ${
                            parseInt(getMarginAtPrice(getRecommendedPrice(result, pricingTier), result.totalInternalCost)) >= 35
                              ? "text-green-400"
                              : parseInt(getMarginAtPrice(getRecommendedPrice(result, pricingTier), result.totalInternalCost)) >= 25
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}>
                            {getMarginAtPrice(getRecommendedPrice(result, pricingTier), result.totalInternalCost)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Key numbers */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-zinc-900 border-zinc-700">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-zinc-500" />
                        <span className="text-zinc-400 text-xs uppercase tracking-wide">Time on site</span>
                      </div>
                      <p className="text-white text-xl font-bold">{result.estimatedDays.toFixed(1)} days</p>
                      <p className="text-zinc-500 text-xs">{result.estimatedHours.toFixed(1)} hours</p>
                    </CardContent>
                  </Card>

                  {!clientView && (
                    <Card className="bg-zinc-900 border-zinc-700">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp size={14} className="text-zinc-500" />
                          <span className="text-zinc-400 text-xs uppercase tracking-wide">Gross margin</span>
                        </div>
                        <p className={`text-xl font-bold ${marginColor}`}>{result.marginPct.toFixed(0)}%</p>
                        <p className="text-zinc-500 text-xs">at midpoint price</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <Card className="bg-yellow-950/30 border-yellow-700/50">
                    <CardContent className="pt-4 pb-3 space-y-1.5">
                      {result.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                          <span className="text-yellow-200 text-sm">{w}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Trail Cutting visual breakdown */}
                {isTrailService && !clientView && (() => {
                  const terrainMultiplier = terrain === "steep" ? 1.2 : terrain === "very_steep" ? 1.4 : terrain === "rolling" ? 1.1 : 1.0;
                  const baseAcres = parseFloat(acreage) || 0;
                  const baseRate = 850;
                  const basePrice = Math.max(500, baseAcres * baseRate);
                  const terrainAdj = basePrice * (terrainMultiplier - 1);
                  const addOnCosts: Record<string, number> = {
                    "Mulch Redistribution": Math.round(baseAcres * 80),
                    "Post-Clear Seeding & Erosion Control": Math.round(baseAcres * 120),
                    "Selective Clearing & Tree Preservation": Math.round(baseAcres * 150),
                  };
                  const selectedAddOnTotal = trailAddOns.reduce((s, a) => s + (addOnCosts[a] || 0), 0);
                  const totalWithAddOns = basePrice + terrainAdj + selectedAddOnTotal;
                  const trailWidthNum = parseFloat(trailWidth) || 10;
                  const linearFeetEquiv = baseAcres > 0 ? Math.round((baseAcres * 43560) / trailWidthNum) : 0;

                  return (
                    <Card className="bg-zinc-900 border-orange-600/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-orange-400 text-sm">Trail Cutting Price Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {baseAcres > 0 && (
                          <div className="bg-zinc-800/60 rounded p-2.5 text-xs text-zinc-400 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Effective acreage</span>
                              <span className="text-white font-medium">{baseAcres.toFixed(2)} ac</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Trail width</span>
                              <span className="text-white font-medium">{trailWidthNum} ft</span>
                            </div>
                            {linearFeetEquiv > 0 && (
                              <div className="flex justify-between">
                                <span>Approx. linear footage</span>
                                <span className="text-white font-medium">{linearFeetEquiv.toLocaleString()} ft</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                          <span className="text-zinc-300 text-sm">Base rate ({baseAcres.toFixed(2)} ac @ $850/ac)</span>
                          <span className="text-zinc-200 text-sm font-medium">{fmt(basePrice)}</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                          <div>
                            <span className="text-zinc-300 text-sm">Terrain adjustment</span>
                            <p className="text-zinc-500 text-xs">
                              {terrain === "flat" ? "Flat — no adjustment" :
                               terrain === "rolling" ? "Rolling — +10%" :
                               terrain === "steep" ? "Steep — +20%" :
                               "Very steep — +40%"}
                            </p>
                          </div>
                          <span className={`text-sm font-medium ${terrainAdj > 0 ? "text-yellow-400" : "text-zinc-500"}`}>
                            {terrainAdj > 0 ? `+${fmt(terrainAdj)}` : "—"}
                          </span>
                        </div>
                        {trailAddOns.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-zinc-400 text-xs uppercase tracking-wide">Selected Add-Ons</p>
                            {trailAddOns.map(label => (
                              <div key={label} className="flex items-center justify-between py-1 px-2">
                                <span className="text-zinc-300 text-sm">{label}</span>
                                <span className="text-zinc-400 text-sm">+{fmt(addOnCosts[label] || 0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-orange-600/30">
                          <span className="text-orange-400 font-semibold text-sm">Adjusted Total</span>
                          <span className="text-orange-400 font-semibold text-sm">{fmt(totalWithAddOns)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Line-item breakdown */}
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm">
                      {clientView ? "Job Summary" : "Cost Breakdown"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {clientView ? (
                      <>
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-zinc-200 text-sm">{service}</span>
                          <span className="text-zinc-200 text-sm font-medium">{fmt(getRecommendedPrice(result, pricingTier))}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                          <span className="text-orange-400 font-semibold text-sm">Total</span>
                          <span className="text-orange-400 font-semibold text-sm">{fmt(getRecommendedPrice(result, pricingTier))}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {result.breakdown
                          .filter(item => !item.label.toLowerCase().includes("mobilization"))
                          .map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
                              <div>
                                <span className="text-zinc-200 text-sm">{item.label}</span>
                                {item.hours && (
                                  <span className="text-zinc-500 text-xs ml-2">({item.hours.toFixed(1)} hrs)</span>
                                )}
                                {item.note && (
                                  <p className="text-zinc-500 text-xs mt-0.5">{item.note}</p>
                                )}
                              </div>
                              <span className="text-zinc-200 text-sm font-medium">{fmt(item.cost)}</span>
                            </div>
                          ))}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                          <span className="text-white font-semibold text-sm">Total Internal Cost</span>
                          <span className="text-white font-semibold text-sm">{fmt(result.totalInternalCost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-orange-400 font-semibold text-sm">
                            Recommended Quote
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-orange-800/50 text-orange-200 uppercase tracking-wide">
                              {tierLabel[pricingTier]}
                            </span>
                          </span>
                          <span className="text-orange-400 font-semibold text-sm">
                            {fmt(getRecommendedPrice(result, pricingTier))}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
