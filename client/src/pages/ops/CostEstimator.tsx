/**
 * AI Job Cost Estimator — Internal ops tool
 * Enter job details, get a full internal cost breakdown vs customer price range.
 * All 6 services, all modifiers, mobilization miles, universal add-ons.
 * v1.0.72: Draw Work Area on satellite map (polygon → acreage auto-fill + static map thumbnail)
 *          Stripe deposit collection via "Send Quote + Collect Deposit" button
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { MapView, loadMapScript } from "@/components/Map";
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
import {
  Loader2, AlertTriangle, TrendingUp, DollarSign, Clock, Eye, EyeOff,
  Satellite, Sparkles, Info, CheckCircle2, BookmarkPlus, PenLine, Trash2,
  CreditCard, MessageSquare, MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
type DepositPct = 25 | 33 | 50 | "custom";

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
  { label: "Mulch Redistribution", hint: "$150–$900/hr" },
  { label: "Selective Clearing & Tree Preservation", hint: "$150–$500 flat" },
];

const TRAIL_ADDONS = [
  { label: "Mulch Redistribution", hint: "redistribute cut material" },
  { label: "Selective Clearing & Tree Preservation", hint: "preserve specific trees" },
];

// ─── Draw Work Area Panel ─────────────────────────────────────────────────────
interface DrawWorkAreaPanelProps {
  initialCenter: google.maps.LatLngLiteral;
  onAcreageCalculated: (acres: number) => void;
  onMapUrlCaptured: (url: string) => void;
  drawnAcres: number | null;
  drawnMapUrl: string | null;
  onClear: () => void;
}

function DrawWorkAreaPanel({
  initialCenter,
  onAcreageCalculated,
  onMapUrlCaptured,
  drawnAcres,
  drawnMapUrl,
  onClear,
}: DrawWorkAreaPanelProps) {
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const currentPolygonRef = useRef<google.maps.Polygon | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    // Set satellite view
    map.setMapTypeId("satellite");

    // Initialize DrawingManager
    const dm = new window.google.maps.drawing.DrawingManager({
      drawingMode: null, // start in pan mode
      drawingControl: false, // we use our own button
      polygonOptions: {
        fillColor: "#E07B2A",
        fillOpacity: 0.25,
        strokeColor: "#E07B2A",
        strokeWeight: 2,
        editable: true,
        draggable: false,
      },
      map,
    });
    drawingManagerRef.current = dm;

    // Listen for polygon completion
    window.google.maps.event.addListener(dm, "overlaycomplete", (e: google.maps.drawing.OverlayCompleteEvent) => {
      if (e.type !== window.google.maps.drawing.OverlayType.POLYGON) return;

      // Remove any previous polygon
      if (currentPolygonRef.current) {
        currentPolygonRef.current.setMap(null);
      }

      const polygon = e.overlay as google.maps.Polygon;
      currentPolygonRef.current = polygon;

      // Switch back to pan mode
      dm.setDrawingMode(null);
      setIsDrawing(false);

      // Calculate area
      const areaSqM = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
      const acres = areaSqM / 4046.86;
      onAcreageCalculated(parseFloat(acres.toFixed(2)));

      // Capture polygon path for static map
      const coords: google.maps.LatLngLiteral[] = [];
      polygon.getPath().forEach((latLng: google.maps.LatLng) => {
        coords.push({ lat: latLng.lat(), lng: latLng.lng() });
      });

      // Build static map URL with polygon overlay
      const pathParam = coords.map(c => `${c.lat.toFixed(6)},${c.lng.toFixed(6)}`).join("|");
      const center = map.getCenter();
      const zoom = map.getZoom() ?? 16;
      const staticUrl = `/api/maps/staticmap?size=600x300&maptype=satellite&zoom=${zoom}&center=${center?.lat()},${center?.lng()}&path=color:0xE07B2Aff|weight:2|fillcolor:0xE07B2A40|${pathParam}`;
      onMapUrlCaptured(staticUrl);

      // Re-listen for path edits to recalculate
      window.google.maps.event.addListener(polygon.getPath(), "set_at", () => {
        const newArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
        onAcreageCalculated(parseFloat((newArea / 4046.86).toFixed(2)));
      });
      window.google.maps.event.addListener(polygon.getPath(), "insert_at", () => {
        const newArea = window.google.maps.geometry.spherical.computeArea(polygon.getPath());
        onAcreageCalculated(parseFloat((newArea / 4046.86).toFixed(2)));
      });
    });
  }, [onAcreageCalculated, onMapUrlCaptured]);

  const startDrawing = () => {
    if (!drawingManagerRef.current) return;
    drawingManagerRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
    setIsDrawing(true);
  };

  const cancelDrawing = () => {
    if (!drawingManagerRef.current) return;
    drawingManagerRef.current.setDrawingMode(null);
    setIsDrawing(false);
  };

  const clearPolygon = () => {
    if (currentPolygonRef.current) {
      currentPolygonRef.current.setMap(null);
      currentPolygonRef.current = null;
    }
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
    setIsDrawing(false);
    onClear();
  };

  // Re-center map when initialCenter changes (address analyzed)
  useEffect(() => {
    if (mapInstance && initialCenter.lat !== 36.1 && initialCenter.lng !== -87.5) {
      mapInstance.setCenter(initialCenter);
      mapInstance.setZoom(17);
    }
  }, [mapInstance, initialCenter.lat, initialCenter.lng]);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {!isDrawing ? (
          <button
            type="button"
            onClick={startDrawing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors bg-orange-600/10 border-orange-600/40 text-orange-300 hover:bg-orange-600/20"
          >
            <PenLine size={13} />
            Draw Work Area
          </button>
        ) : (
          <button
            type="button"
            onClick={cancelDrawing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors bg-zinc-700 border-zinc-500 text-zinc-300 hover:bg-zinc-600"
          >
            Cancel
          </button>
        )}
        {drawnAcres !== null && (
          <>
            <span className="text-green-400 text-sm font-semibold">
              {drawnAcres.toFixed(2)} acres drawn
            </span>
            <button
              type="button"
              onClick={clearPolygon}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs border border-zinc-600 text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </>
        )}
      </div>

      {isDrawing && (
        <p className="text-orange-300 text-xs bg-orange-600/10 border border-orange-600/25 rounded px-2.5 py-1.5">
          Click on the map to place polygon vertices. Click the first point to close the shape.
        </p>
      )}

      {/* Map */}
      <MapView
        className="h-64 rounded border border-zinc-700"
        initialCenter={initialCenter}
        initialZoom={16}
        onMapReady={handleMapReady}
      />

      {drawnMapUrl && (
        <div className="mt-1 text-[10px] text-zinc-500">
          Map thumbnail will be attached to the estimate when saved to a lead.
        </div>
      )}
    </div>
  );
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

  // Draw Work Area state
  const [showDrawPanel, setShowDrawPanel] = useState(false);
  const [drawnAcres, setDrawnAcres] = useState<number | null>(null);
  const [drawnMapUrl, setDrawnMapUrl] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 36.1, lng: -87.5 }); // Vanleer, TN approx

  // Deposit dialog state
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositPct, setDepositPct] = useState<DepositPct>(25);
  const [customDepositAmt, setCustomDepositAmt] = useState("");
  const [depositPhone, setDepositPhone] = useState("");
  const [depositSendSms, setDepositSendSms] = useState(false);
  const [depositClientName, setDepositClientName] = useState("");

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

  // Geocode address to get map center when address is analyzed
  useEffect(() => {
    if (!propertyAddress || !satelliteAnalysis) return;
    loadMapScript().then(() => {
      const geocoder = new window.google!.maps.Geocoder();
      geocoder.geocode({ address: propertyAddress }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          setMapCenter({ lat: loc.lat(), lng: loc.lng() });
        }
      });
    }).catch(() => {});
  }, [propertyAddress, satelliteAnalysis]);

  const isRowService = service === "Right-of-Way Clearing";
  const isTrailService = service === "Trail Cutting";
  const isBrushHogging = service === "Brush Hogging";

  const estimate = trpc.costEstimator.estimate.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err.message || "Something went wrong. Try again."),
  });

  // ── Save to Lead ─────────────────────────────────────────────────────────
  const [saveLeadOpen, setSaveLeadOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const { data: leadsData } = trpc.ops.leads.list.useQuery(undefined, { enabled: saveLeadOpen });
  const updateLead = trpc.ops.leads.update.useMutation({
    onSuccess: () => {
      setSaveLeadOpen(false);
      setSelectedLeadId(null);
      toast.success("Estimate saved to lead.");
    },
    onError: (err) => toast.error(err.message || "Failed to save to lead."),
  });
  const handleSaveToLead = () => {
    if (!result || !selectedLeadId) return;
    const price = getRecommendedPrice(result, pricingTier);
    let noteEntry = `[Cost Estimator — ${new Date().toLocaleDateString("en-US")}]\nService: ${service}\nAcreage: ${acreage || (linearFeet + " lf")}\nInternal cost: $${result.totalInternalCost.toLocaleString()}\nRecommended quote (${pricingTier}): $${price.toLocaleString()}\nMargin: ${result.marginPct.toFixed(0)}%`;
    if (drawnAcres !== null) {
      noteEntry += `\nDrawn work area: ${drawnAcres.toFixed(2)} acres (polygon on satellite map)`;
    }
    if (drawnMapUrl) {
      noteEntry += `\nMap thumbnail: ${window.location.origin}${drawnMapUrl}`;
    }
    updateLead.mutate({ id: selectedLeadId, estimatedValue: price.toString(), notes: noteEntry });
  };

  // ── Deposit collection ────────────────────────────────────────────────────
  const createQuotePayment = trpc.ops.createQuotePayment.useMutation({
    onSuccess: (data) => {
      setDepositOpen(false);
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      }
      if (data.smsSent) {
        toast.success("Payment link sent via SMS.");
      } else {
        toast.success("Checkout session created. Link opened in new tab.");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to create payment session."),
  });

  const handleDepositSubmit = () => {
    if (!result) return;
    const totalPrice = getRecommendedPrice(result, pricingTier);
    let depositAmt: number;
    if (depositPct === "custom") {
      depositAmt = parseFloat(customDepositAmt) || 0;
      if (depositAmt <= 0) { toast.error("Enter a valid deposit amount."); return; }
    } else {
      depositAmt = Math.round(totalPrice * depositPct / 100);
    }
    createQuotePayment.mutate({
      service,
      totalPrice,
      depositAmount: depositAmt,
      clientName: depositClientName || undefined,
      phone: depositSendSms && depositPhone ? depositPhone : undefined,
      sendSms: depositSendSms && !!depositPhone,
      mapThumbnailUrl: drawnMapUrl || satelliteMapUrl || undefined,
    });
  };

  const depositAmount = (() => {
    if (!result) return 0;
    const total = getRecommendedPrice(result, pricingTier);
    if (depositPct === "custom") return parseFloat(customDepositAmt) || 0;
    return Math.round(total * depositPct / 100);
  })();

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
            <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setSaveLeadOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border transition-colors bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              <BookmarkPlus size={14} />
              Save to Lead
            </button>
            <button
              onClick={() => setDepositOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium border transition-colors bg-green-800/30 border-green-600/50 text-green-300 hover:bg-green-800/50"
            >
              <CreditCard size={14} />
              Collect Deposit
            </button>
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
            </div>
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
                    {(drawnMapUrl || satelliteMapUrl) && (
                      <img
                        src={drawnMapUrl || satelliteMapUrl!}
                        alt="Satellite view"
                        className="w-full rounded border border-zinc-700 object-cover max-h-40"
                      />
                    )}
                    <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{satelliteAnalysis}</p>
                    <p className="text-[10px] text-orange-400/70">Fields auto-updated from satellite analysis. Adjust as needed.</p>
                  </div>
                )}
              </div>

              {/* Draw Work Area toggle */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowDrawPanel(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-orange-300 transition-colors"
                >
                  <MapPin size={13} className="text-orange-400" />
                  {showDrawPanel ? "Hide map drawing tool" : "Draw work area on map (auto-calculate acreage)"}
                </button>
                {showDrawPanel && (
                  <DrawWorkAreaPanel
                    initialCenter={mapCenter}
                    onAcreageCalculated={(acres) => {
                      setDrawnAcres(acres);
                      setAcreage(acres.toFixed(2));
                      toast.success(`Work area drawn — ${acres.toFixed(2)} acres auto-filled.`);
                    }}
                    onMapUrlCaptured={setDrawnMapUrl}
                    drawnAcres={drawnAcres}
                    drawnMapUrl={drawnMapUrl}
                    onClear={() => {
                      setDrawnAcres(null);
                      setDrawnMapUrl(null);
                    }}
                  />
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
                  <Label className="text-zinc-300 flex items-center gap-1.5">
                    {isTrailService ? "Effective Acres" : "Acreage"}
                    {isTrailService && (
                      <span className="text-zinc-500 font-normal ml-1">(length × width ÷ 43,560)</span>
                    )}
                    {drawnAcres !== null && (
                      <span className="text-green-400 text-xs font-normal ml-1">(from drawn polygon)</span>
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

      {/* ── Save to Lead dialog ─────────────────────────────────────────────── */}
      <Dialog open={saveLeadOpen} onOpenChange={setSaveLeadOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Save Estimate to Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-zinc-400 text-sm">Select the lead to attach this estimate to. The estimated value and a cost summary will be saved to the lead record.</p>
            {drawnAcres !== null && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-700/30 rounded px-2.5 py-1.5">
                <MapPin size={12} />
                Drawn work area ({drawnAcres.toFixed(2)} ac) will be included in the note.
              </div>
            )}
            <select
              value={selectedLeadId ?? ""}
              onChange={e => setSelectedLeadId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-zinc-800 border border-zinc-600 text-white rounded px-3 py-2 text-sm"
            >
              <option value="">-- Select a lead --</option>
              {(leadsData ?? []).map((lead: { id: number; name: string; stage: string }) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} ({lead.stage})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveLeadOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={handleSaveToLead}
              disabled={!selectedLeadId || updateLead.isPending}
              style={{ backgroundColor: "#E07B2A" }}
            >
              {updateLead.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Save to Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Collect Deposit dialog ──────────────────────────────────────────── */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard size={16} className="text-green-400" />
              Collect Deposit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {result && (
              <div className="bg-zinc-800 rounded p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Service</span>
                  <span className="text-white">{service}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Total quote ({tierLabel[pricingTier]})</span>
                  <span className="text-orange-400 font-semibold">{fmt(getRecommendedPrice(result, pricingTier))}</span>
                </div>
              </div>
            )}

            {/* Client name */}
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Client Name (optional)</Label>
              <Input
                value={depositClientName}
                onChange={e => setDepositClientName(e.target.value)}
                placeholder="e.g. John Smith"
                className="bg-zinc-800 border-zinc-600 text-white"
              />
            </div>

            {/* Deposit percentage */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm">Deposit Amount</Label>
              <div className="grid grid-cols-4 gap-2">
                {([25, 33, 50, "custom"] as DepositPct[]).map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDepositPct(pct)}
                    className={`py-2 rounded text-sm font-medium border transition-colors ${
                      depositPct === pct
                        ? "bg-green-700/30 border-green-600/60 text-green-300"
                        : "bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {pct === "custom" ? "Custom" : `${pct}%`}
                  </button>
                ))}
              </div>
              {depositPct === "custom" ? (
                <Input
                  type="number"
                  value={customDepositAmt}
                  onChange={e => setCustomDepositAmt(e.target.value)}
                  placeholder="Enter deposit amount ($)"
                  className="bg-zinc-800 border-zinc-600 text-white"
                />
              ) : result && (
                <p className="text-green-400 text-sm font-semibold">
                  Deposit: {fmt(depositAmount)}
                  <span className="text-zinc-500 font-normal ml-2 text-xs">
                    Balance due on completion: {fmt(getRecommendedPrice(result, pricingTier) - depositAmount)}
                  </span>
                </p>
              )}
            </div>

            {/* SMS option */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="depositSendSms"
                  checked={depositSendSms}
                  onChange={e => setDepositSendSms(e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <Label htmlFor="depositSendSms" className="text-zinc-300 cursor-pointer flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-green-400" />
                  Send payment link via SMS
                </Label>
              </div>
              {depositSendSms && (
                <Input
                  type="tel"
                  value={depositPhone}
                  onChange={e => setDepositPhone(e.target.value)}
                  placeholder="Client phone (e.g. 615-555-1234)"
                  className="bg-zinc-800 border-zinc-600 text-white"
                />
              )}
            </div>

            <p className="text-zinc-500 text-xs">
              A Stripe Checkout link will be created. {depositSendSms ? "The link will be sent to the client's phone." : "The link will open in a new tab — share it with the client."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDepositOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={handleDepositSubmit}
              disabled={createQuotePayment.isPending || depositAmount <= 0}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              {createQuotePayment.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-2" />Creating...</>
              ) : (
                <><CreditCard size={14} className="mr-2" />Create Checkout — {fmt(depositAmount)}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
