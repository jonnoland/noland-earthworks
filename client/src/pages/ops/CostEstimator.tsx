/**
 * AI Job Cost Estimator — Internal ops tool
 * Enter job details, get a full internal cost breakdown vs customer price range.
 */

import { useState } from "react";
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
import { Loader2, AlertTriangle, TrendingUp, DollarSign, Clock } from "lucide-react";
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

export default function CostEstimator() {
  const [result, setResult] = useState<EstimateResult | null>(null);

  const [service, setService] = useState("Forestry Mulching");
  const [acreage, setAcreage] = useState("");
  const [linearFeet, setLinearFeet] = useState("");
  const [terrain, setTerrain] = useState<"flat" | "rolling" | "steep" | "very_steep">("rolling");
  const [vegetationDensity, setVegetationDensity] = useState<"light" | "moderate" | "heavy" | "very_heavy">("moderate");
  const [accessDifficulty, setAccessDifficulty] = useState<"easy" | "moderate" | "difficult">("easy");
  const [pricingTier, setPricingTier] = useState<PricingTier>("mid");
  const mobilizationMiles = 25; // baked in — not shown to user
  const [hasStumps, setHasStumps] = useState(false);
  const [stumpCount, setStumpCount] = useState("");
  const [notes, setNotes] = useState("");

  const isRowService = service === "Right-of-Way Clearing";

  const estimate = trpc.costEstimator.estimate.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Try again.");
    },
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
      linearFeet: isRowService && linearFeet ? parseInt(linearFeet) : undefined,
      terrain,
      vegetationDensity,
      accessDifficulty,
      mobilizationMiles: mobilizationMiles,
      hasStumps,
      stumpCount: hasStumps ? parseInt(stumpCount) || 0 : 0,
      notes: notes || undefined,
    });
  };

  const marginColor = result
    ? result.marginPct >= 45
      ? "text-green-400"
      : result.marginPct >= 35
      ? "text-yellow-400"
      : "text-red-400"
    : "";

  const tierLabel: Record<PricingTier, string> = {
    low: "Low",
    mid: "Mid",
    high: "High",
  };

  const tierDescription: Record<PricingTier, string> = {
    low: "Competitive rate — price-sensitive market or straightforward job",
    mid: "Standard market rate — default for most jobs",
    high: "Premium rate — difficult conditions, high density, or strong demand",
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Job Cost Estimator</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Internal tool — enter job details to get a cost breakdown before quoting.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input form */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Service</Label>
                <Select value={service} onValueChange={setService}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Forestry Mulching">Forestry Mulching</SelectItem>
                    <SelectItem value="Land Management">Land Management</SelectItem>
                    <SelectItem value="Site Preparation">Site Preparation</SelectItem>
                    <SelectItem value="Right-of-Way Clearing">Right-of-Way Clearing</SelectItem>
                    <SelectItem value="Brush Hogging">Brush Hogging</SelectItem>
                    <SelectItem value="Stump Grinding">Stump Grinding Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Acreage or Linear Feet */}
              {isRowService ? (
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
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Acreage</Label>
                  <Input
                    type="number"
                    value={acreage}
                    onChange={e => setAcreage(e.target.value)}
                    placeholder="e.g. 5.0"
                    step="0.5"
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

              {/* Vegetation density */}
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

              {/* Access difficulty */}
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

          {/* Results */}
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
              <Card className="bg-zinc-900 border-zinc-700">
                <CardContent className="py-12 text-center text-zinc-400">
                  <Loader2 size={32} className="mx-auto mb-3 animate-spin text-orange-500" />
                  <p>AI is calculating your cost estimate...</p>
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                {/* Summary */}
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-zinc-300 text-sm leading-relaxed">{result.summary}</p>
                  </CardContent>
                </Card>

                {/* Recommended quote — tier-driven, prominent */}
                <Card className="bg-orange-950/40 border-orange-600/60">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign size={14} className="text-orange-400" />
                          <span className="text-orange-300 text-xs uppercase tracking-wide font-medium">
                            Recommended Quote
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-800/60 text-orange-200 font-semibold uppercase tracking-wide">
                            {tierLabel[pricingTier]}
                          </span>
                        </div>
                        <p className="text-orange-400 text-3xl font-bold">
                          {fmt(getRecommendedPrice(result, pricingTier))}
                        </p>
                        <p className="text-zinc-400 text-xs mt-1">
                          Full range: {fmt(result.customerPriceLow)} – {fmt(result.customerPriceHigh)}
                        </p>
                      </div>
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

                {/* Line-item breakdown */}
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
