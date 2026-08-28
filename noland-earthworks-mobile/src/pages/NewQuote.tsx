import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Sparkles,
  DollarSign,
  Clock,
  AlertTriangle,
  Mic,
  MicOff,
  CheckCircle,
  CloudOff,
  CloudCheck,
} from "lucide-react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import QuoteClassificationGuide from "@/components/QuoteClassificationGuide";
import { isServedCounty, normalizeCountyName } from "@/lib/serviceAreas";
import { validateTennesseeParcelId } from "@shared/tennesseeParcelId";
import { enqueueOfflineFieldQuote } from "@/lib/offlineFieldQuoteQueue";
import { useNetwork } from "@/hooks/useNetwork";
import { formatQuoteCents } from "@shared/quoteMoney";
import { calculateLinearFeetFromAcreage, LINEAR_FOOT_CLEARING_WIDTH_OPTIONS } from "../../../shared/quoteLineItemMeasurements";
import {
  calculateCachedFieldEstimate,
  readFieldPricingSnapshot,
  writeFieldPricingSnapshot,
  type FieldPricingSnapshot,
} from "@/lib/offlinePricingCache";

// ─── SiteMapPreview ──────────────────────────────────────────────────────────

/**
 * InteractiveMapPreview — Google Maps iframe with a draggable location pin.
 * The iframe loads the Maps JS API through the live server proxy so no key is
 * exposed. It deliberately uses the standard Maps marker rather than an
 * Advanced Marker because Advanced Markers require a configured Google map ID.
 * When the user drags the pin, the iframe posts the new lat/lng back via
 * postMessage and the parent updates form state.
 */
function InteractiveMapPreview({
  lat, lng, boundaryRings, onPinMoved,
}: {
  lat: number;
  lng: number;
  boundaryRings?: Array<Array<{ lat: number; lng: number }>> | null;
  onPinMoved: (lat: number, lng: number) => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const SERVER_BASE = "https://nolandearth-pymczdcn.manus.space";
  const boundaryJson = JSON.stringify(boundaryRings ?? []);

  // Build the srcdoc for the iframe — loads Maps JS from our proxy, drops a
  // draggable marker at the given coordinates, and does not require a map ID.
  const srcdoc = `<!DOCTYPE html>
<html style="margin:0;padding:0;height:100%;">
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    (async function() {
      const script = document.createElement('script');
      script.src = '${SERVER_BASE}/api/maps/js?v=weekly&loading=async';
      script.async = true;
      document.head.appendChild(script);
      await new Promise(r => { script.onload = r; });
      // Wait for google.maps.Map to be available
      let attempts = 0;
      while (typeof google === 'undefined' || typeof google.maps === 'undefined' || typeof google.maps.Map === 'undefined') {
        if (++attempts > 100) return;
        await new Promise(r => setTimeout(r, 50));
      }
      const center = { lat: ${lat}, lng: ${lng} };
      const map = new google.maps.Map(document.getElementById('map'), {
        center,
        zoom: 15,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });
      const marker = new google.maps.Marker({
        map,
        position: center,
        draggable: true,
        title: 'Drag to adjust location',
      });
      const parcelBoundary = ${boundaryJson};
      if (parcelBoundary.length > 0) {
        const boundary = new google.maps.Polygon({
          paths: parcelBoundary,
          strokeColor: '#E87722',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: '#E87722',
          fillOpacity: 0.16,
          clickable: false,
        });
        boundary.setMap(map);
        const bounds = new google.maps.LatLngBounds();
        parcelBoundary.forEach(function(ring) {
          ring.forEach(function(point) { bounds.extend(point); });
        });
        bounds.extend(center);
        map.fitBounds(bounds, 28);
      }
      marker.addListener('dragend', function() {
        const pos = marker.getPosition();
        if (!pos) return;
        const newLat = pos.lat();
        const newLng = pos.lng();
        window.parent.postMessage({ type: 'pinMoved', lat: newLat, lng: newLng }, '*');
      });
    })();
  <\/script>
</body>
</html>`;

  // Listen for postMessage from the iframe
  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "pinMoved" && typeof e.data.lat === "number" && typeof e.data.lng === "number") {
        onPinMoved(e.data.lat, e.data.lng);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onPinMoved]);

  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid oklch(0.28 0.01 80)", height: 200, position: "relative" }}>
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
          title="Site location map"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        <MapPin size={12} color="oklch(0.65 0.18 50)" />
        <span style={{ fontSize: 11, color: "oklch(0.55 0.01 80)" }}>Drag the pin to adjust the exact location</span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: "auto", fontSize: 11, color: "oklch(0.65 0.18 50)", textDecoration: "underline" }}
        >
          Open in Maps
        </a>
      </div>
    </div>
  );
}

function ServiceAreaMapPreview() {
  const SERVER_BASE = "https://nolandearth-pymczdcn.manus.space";
  const COUNTY_GEOJSON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/tn-served-counties-35-v2_c7cfca3b.json";
  const srcdoc = `<!DOCTYPE html><html style="margin:0;padding:0;height:100%"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style></head><body><div id="map"></div><script>(async function(){const script=document.createElement('script');script.src='${SERVER_BASE}/api/maps/js?v=weekly&loading=async';script.async=true;document.head.appendChild(script);await new Promise(r=>script.onload=r);let attempts=0;while(typeof google==='undefined'||!google.maps||!google.maps.Map){if(++attempts>100)return;await new Promise(r=>setTimeout(r,50));}const map=new google.maps.Map(document.getElementById('map'),{center:{lat:35.85,lng:-87.5},zoom:7,disableDefaultUI:true,zoomControl:true,gestureHandling:'cooperative',styles:[{featureType:'all',elementType:'labels',stylers:[{visibility:'off'}]}]});try{const geo=await fetch('${COUNTY_GEOJSON_URL}').then(r=>r.json());map.data.addGeoJson(geo);map.data.setStyle({fillColor:'#E87722',fillOpacity:.25,strokeColor:'#E87722',strokeOpacity:.9,strokeWeight:1.25});const bounds=new google.maps.LatLngBounds();map.data.forEach(f=>f.getGeometry().forEachLatLng(p=>bounds.extend(p)));map.fitBounds(bounds,12);}catch(e){}})();<\/script></body></html>`;
  return <div style={{ marginTop: 10 }}><div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid oklch(0.65 0.18 50 / 0.45)", height: 150, position: "relative" }}><iframe srcDoc={srcdoc} style={{ width: "100%", height: "100%", border: "none", display: "block" }} title="Supported Middle and West Tennessee service area" sandbox="allow-scripts allow-same-origin" /></div><p style={{ color: "oklch(0.60 0.01 80)", fontSize: 11, margin: "6px 0 0" }}>Orange counties are the standard 35-county service area.</p></div>;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PhotoEntry {
  dataUrl: string;
  base64: string;
  mimeType: string;
}

interface FormState {
  // Contact
  name: string;
  email: string;
  phone: string;
  // Site
  address: string;
  city: string;
  county: string;
  zip: string;
  parcelId: string;
  lat: number | null;
  lng: number | null;
  // Job details — core
  serviceType: string;
  acreage: string;
  linearFeet: string;
  quantitySource: "measured" | "acreage_estimate";
  sourceAcreage: string;
  clearingWidthFeet: string;
  // AI pricing inputs (matching website CostEstimator)
  terrain: "flat" | "rolling" | "steep" | "very_steep";
  vegetationDensity: "light" | "moderate" | "heavy" | "very_heavy";
  accessDifficulty: "easy" | "moderate" | "difficult";
  mobilizationMiles: string;
  hasStumps: boolean;
  stumpCount: string;
  trailWidth: string;
  rowWidth: string;
  fenceLineLF: string;
  // Legacy intake fields still sent to fieldQuote.submit
  vegetationTypes: string;
  obstacles: string;
  proximityToStructures: string;
  // Notes
  message: string;
}

interface EstimateResult {
  estimatedHours: number | null;
  estimatedDays: number | null;
  totalInternalCost: number | null;
  customerPriceLow: number;
  customerPriceHigh: number;
  marginPct: number | null;
  summary: string;
  warnings: string[];
  fieldConditionAdjustment?: {
    vegetationMultiplier: number;
    terrainMultiplier: number;
    accessMultiplier: number;
    combinedMultiplier: number;
    baseCustomerPriceLow: number;
    baseCustomerPriceHigh: number;
    labels: { vegetation: string; terrain: string; access: string };
  };
  eligibleDiscounts: Array<{ code: string; label: string; percent: number; eligibility: string }>;
  selectedDiscount: { code: string; label: string; percent: number; eligibility: string } | null;
  discountAdjustment: {
    baseCustomerPriceLow: number;
    baseCustomerPriceHigh: number;
    discountAmountLow: number;
    discountAmountHigh: number;
  } | null;
  linearFootEstimate?: {
    linearFeet: number;
    sourceAcreage: number | null;
    clearingWidthFeet: number | null;
    requiresSiteVerification: boolean;
  } | null;
  pricingSource?: "live" | "cached";
  pricingSyncedAt?: string | null;
  breakdown: { label: string; cost: number; note?: string }[];
}

interface ExistingClientContact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

// ─── Option lists (matching website CostEstimator exactly) ──────────────────

const SERVICE_TYPES = [
  "Forestry Mulching",
  "Land Management",
  "Vegetation Management",
  "Right-of-Way Clearing",
  "Trail Cutting",
  "Fence Line Clearing",
  "Selective Mulching",
  "Brush Hogging",
];

const isLinearFootService = (service: string) => service === "Trail Cutting" || service === "Fence Line Clearing";

const TERRAIN_OPTIONS: { value: FormState["terrain"]; label: string }[] = [
  { value: "flat",       label: "Flat" },
  { value: "rolling",    label: "Rolling" },
  { value: "steep",      label: "Steep" },
  { value: "very_steep", label: "Very Steep" },
];

const VEG_OPTIONS: { value: FormState["vegetationDensity"]; label: string }[] = [
  { value: "light",      label: "Light" },
  { value: "moderate",   label: "Moderate" },
  { value: "heavy",      label: "Heavy" },
  { value: "very_heavy", label: "Very Heavy" },
];

const ACCESS_OPTIONS: { value: FormState["accessDifficulty"]; label: string }[] = [
  { value: "easy",       label: "Easy" },
  { value: "moderate",   label: "Moderate" },
  { value: "difficult",  label: "Difficult" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewQuote() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [cachedPricing, setCachedPricing] = useState<FieldPricingSnapshot | null>(null);
  const [rateStatus, setRateStatus] = useState<"loading" | "live" | "cached" | "unavailable">("loading");
  const [showRateSyncNow, setShowRateSyncNow] = useState(false);
  const [rateSyncMessage, setRateSyncMessage] = useState<string | null>(null);
  const cachedPricingRef = React.useRef<FieldPricingSnapshot | null>(null);
  const wasOfflineRef = React.useRef(!navigator.onLine);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ExistingClientContact | null>(null);
  // Tracks programmatic address updates so forward geocoding is not re-triggered.
  const skipForwardGeocode = React.useRef(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    county: "",
    zip: "",
    parcelId: "",
    lat: null,
    lng: null,
    serviceType: "Forestry Mulching",
    acreage: "",
    linearFeet: "",
    quantitySource: "measured",
    sourceAcreage: "",
    clearingWidthFeet: "20",
    terrain: "flat",
    vegetationDensity: "moderate",
    accessDifficulty: "easy",
    mobilizationMiles: "0",
    hasStumps: false,
    stumpCount: "",
    trailWidth: "",
    rowWidth: "",
    fenceLineLF: "",
    vegetationTypes: "",
    obstacles: "",
    proximityToStructures: "",
    message: "",
  });

  const trpcUtils = trpc.useUtils();
  const { isOnline } = useNetwork();
  const clientQueryInput = React.useMemo(() => ({
    search: clientSearch.trim() || undefined,
    limit: 100,
  }), [clientSearch]);
  const { data: clientOptions = [], isFetching: isLoadingClients, error: clientOptionsError } = trpc.fieldQuote.mobileClients.useQuery(clientQueryInput, {
    staleTime: 5 * 60 * 1000,
  });
  const uploadPhoto = trpc.fieldQuote.uploadPhoto.useMutation();
  const submitQuote = trpc.fieldQuote.submit.useMutation();
  const pricingSnapshotQuery = trpc.fieldQuote.pricingSnapshot.useQuery(undefined, {
    enabled: isOnline,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  React.useEffect(() => {
    void readFieldPricingSnapshot().then((snapshot) => {
      if (!snapshot) {
        if (!isOnline) setRateStatus("unavailable");
        return;
      }
      cachedPricingRef.current = snapshot;
      setCachedPricing(snapshot);
      if (!isOnline) setRateStatus("cached");
    });
  }, [isOnline]);

  React.useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      setShowRateSyncNow(true);
      setRateSyncMessage(null);
    }
    wasOfflineRef.current = false;
  }, [isOnline]);

  React.useEffect(() => {
    const snapshot = pricingSnapshotQuery.data;
    if (!snapshot) {
      if (pricingSnapshotQuery.isError) setRateStatus(cachedPricingRef.current ? "cached" : "unavailable");
      return;
    }
    void writeFieldPricingSnapshot({
      pricingSettings: snapshot.pricingSettings,
      trailUnitRateCents: snapshot.trailUnitRateCents,
      fenceLineUnitRateCents: snapshot.fenceLineUnitRateCents,
    }).then((cached) => {
      cachedPricingRef.current = cached;
      setCachedPricing(cached);
      setRateStatus("live");
    }).catch(() => setRateStatus("unavailable"));
  }, [pricingSnapshotQuery.data, pricingSnapshotQuery.isError]);

  async function useCachedRateFallback(): Promise<boolean> {
    const snapshot = cachedPricingRef.current ?? cachedPricing ?? await readFieldPricingSnapshot();
    if (!snapshot) {
      setRateStatus("unavailable");
      return false;
    }

    const sourceAcreage = parseFloat(form.sourceAcreage);
    const clearingWidthFeet = parseFloat(form.clearingWidthFeet);
    const linearFeet = parseFloat(form.linearFeet);
    const acreage = parseFloat(form.acreage);
    const cachedEstimate = calculateCachedFieldEstimate({
      service: form.serviceType,
      acreage: Number.isFinite(acreage) ? acreage : undefined,
      linearFeet: Number.isFinite(linearFeet) ? linearFeet : undefined,
      quantitySource: isLinearFootService(form.serviceType) ? form.quantitySource : undefined,
      sourceAcreage: Number.isFinite(sourceAcreage) ? sourceAcreage : undefined,
      clearingWidthFeet: Number.isFinite(clearingWidthFeet) ? clearingWidthFeet : undefined,
      terrain: form.terrain,
      vegetationDensity: form.vegetationDensity,
      accessDifficulty: form.accessDifficulty,
    }, snapshot);

    cachedPricingRef.current = snapshot;
    setCachedPricing(snapshot);
    setRateStatus("cached");
    setEstimate({
      estimatedHours: null,
      estimatedDays: null,
      totalInternalCost: null,
      customerPriceLow: cachedEstimate.customerPriceLow,
      customerPriceHigh: cachedEstimate.customerPriceHigh,
      marginPct: null,
      summary: "Offline estimate calculated from the last live Operations rates stored on this device. Confirm current site conditions and rate sync before sending a quote.",
      warnings: [
        `Offline rate cache in use. Last synced ${new Date(snapshot.lastSyncedAt).toLocaleString()}.`,
        "Estimated duration, internal cost, and discounts require a live Operations connection.",
        ...(cachedEstimate.linearFootEstimate ? ["Estimated Linear Footage must be verified on site before finalizing the quote."] : []),
      ],
      fieldConditionAdjustment: cachedEstimate.fieldConditionAdjustment,
      eligibleDiscounts: [],
      selectedDiscount: null,
      discountAdjustment: null,
      linearFootEstimate: cachedEstimate.linearFootEstimate,
      pricingSource: "cached",
      pricingSyncedAt: snapshot.lastSyncedAt,
      breakdown: [
        { label: "Cached Operations quote total", cost: cachedEstimate.customerPriceLow, note: `Rates last synced ${new Date(snapshot.lastSyncedAt).toLocaleString()}` },
        ...(cachedEstimate.minimumJobTotal > cachedEstimate.customerPriceLow
          ? [{ label: "Configured minimum", cost: cachedEstimate.minimumJobTotal, note: "Applied from cached Operations rates" }]
          : []),
      ],
    });
    return true;
  }

  async function handleRateSyncNow() {
    if (!isOnline || pricingSnapshotQuery.isFetching) return;
    setRateSyncMessage(null);
    const result = await pricingSnapshotQuery.refetch();
    if (result.error || !result.data) {
      setRateStatus(cachedPricingRef.current ? "cached" : "unavailable");
      setRateSyncMessage("Could not refresh Operations rates. The last saved rates remain in place.");
      return;
    }
    try {
      const cached = await writeFieldPricingSnapshot({
        pricingSettings: result.data.pricingSettings,
        trailUnitRateCents: result.data.trailUnitRateCents,
        fenceLineUnitRateCents: result.data.fenceLineUnitRateCents,
      });
      cachedPricingRef.current = cached;
      setCachedPricing(cached);
      setRateStatus("live");
      setShowRateSyncNow(false);
      setRateSyncMessage(`Operations rates synced ${new Date(cached.lastSyncedAt).toLocaleTimeString()}.`);
    } catch {
      setRateSyncMessage("Operations rates were fetched but could not be saved on this device. Try Sync Now again.");
    }
  }

  const getEstimate = trpc.fieldQuote.estimate.useMutation({
    onSuccess: (data) => {
      const syncedAt = cachedPricingRef.current?.lastSyncedAt ?? null;
      setRateStatus("live");
      setEstimate({ ...(data as EstimateResult), pricingSource: "live", pricingSyncedAt: syncedAt });
    },
    onError: (err) => {
      const code = err.data?.code;
      const availabilityFailure = !isOnline
        || ["INTERNAL_SERVER_ERROR", "TIMEOUT", "TOO_MANY_REQUESTS", "CLIENT_CLOSED_REQUEST"].includes(code ?? "")
        || /network|fetch|offline|timed? out|unavailable|connection/i.test(err.message);
      if (!availabilityFailure) {
        setEstimateError(err.message || "Unable to calculate the estimate.");
        return;
      }
      void useCachedRateFallback().then((usedCache) => {
        if (!usedCache) setEstimateError(err.message || "Live Operations pricing is unavailable and no cached rates are stored on this device.");
      });
    },
  });
  const [parcelIdError, setParcelIdError] = useState<string | null>(null);
  const [parcelMatches, setParcelMatches] = useState<Array<{
    parcelId: string; county: string; address: string | null; city: string | null; zip: string | null;
    owner: string | null; deedAcreage: number | null; lat: number | null; lng: number | null;
    boundaryRings: Array<Array<{ lat: number; lng: number }>> | null; propertyViewerUrl: string | null;
  }>>([]);
  const [selectedParcelBoundary, setSelectedParcelBoundary] = useState<Array<Array<{ lat: number; lng: number }>> | null>(null);
  const parcelLookup = trpc.fieldQuote.lookupParcel.useMutation({
    onError: (error) => setParcelIdError(error.message),
  });

  const applyParcelMatch = (match: typeof parcelMatches[number]) => {
    skipForwardGeocode.current = true;
    setSelectedParcelBoundary(match.boundaryRings);
    setForm((current) => ({
      ...current,
      parcelId: match.parcelId,
      address: match.address || current.address,
      city: match.city || current.city,
      zip: match.zip || current.zip,
      county: normalizeCountyName(match.county) || current.county,
      lat: match.lat ?? current.lat,
      lng: match.lng ?? current.lng,
      acreage: current.acreage || (match.deedAcreage ? String(Math.round(match.deedAcreage * 100) / 100) : current.acreage),
    }));
    setParcelMatches([]);
    setParcelIdError(null);
  };

  const lookupParcel = () => {
    if (!form.county.trim()) { setParcelIdError("Enter the property county before looking up a Parcel ID."); return; }
    const validation = validateTennesseeParcelId(form.parcelId);
    if (!validation.valid) { setParcelIdError(validation.error); return; }
    setParcelIdError(null);
    parcelLookup.mutate({ county: form.county, parcelId: form.parcelId }, {
      onSuccess: (result) => {
        if (result.matches.length === 0) {
          setParcelMatches([]);
          setParcelIdError("No matching parcel was found. Verify the county and Parcel ID, or enter the address manually.");
          return;
        }
        setParcelMatches(result.matches);
      },
    });
  };

  const applyAddressDetails = (details: { address?: string | null; street?: string; city?: string; zip?: string; county?: string }) => {
    const normalizedCounty = normalizeCountyName(details.county);
    setForm((current) => ({
      ...current,
      address: details.address || details.street || current.address,
      city: details.city || current.city,
      zip: details.zip || current.zip,
      county: normalizedCounty || current.county,
    }));
  };

  const selectExistingClient = (client: ExistingClientContact) => {
    const fieldsToReplace = [
      [form.name, client.name],
      [form.phone, client.phone],
      [form.email, client.email],
      [form.address, client.address],
    ];
    const wouldReplaceEnteredValue = fieldsToReplace.some(([current, saved]) =>
      Boolean(current?.trim() && saved?.trim() && current.trim() !== saved.trim())
    );

    if (wouldReplaceEnteredValue && !window.confirm("Replace the entered customer details with this saved client's available contact details?")) {
      return;
    }

    setSelectedClient(client);
    setClientSearch(client.name);
    setClientPickerOpen(false);
    setForm((current) => ({
      ...current,
      name: client.name,
      phone: client.phone || current.phone,
      email: client.email || current.email,
      address: client.address || current.address,
    }));
  };

  const clearExistingClient = () => {
    setSelectedClient(null);
    setClientSearch("");
    setClientPickerOpen(false);
  };

  // Voice-to-Bid
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResult, setVoiceResult] = useState<{
    clientName: string | null; address: string | null; service: string | null;
    acreage: number | null; linearFeet: number | null; terrain: string | null;
    vegetationDensity: string | null; accessDifficulty: string | null;
    hasStumps: boolean | null; stumpCount: number | null;
    mobilizationMiles: number | null; notes: string | null;
  } | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voicePermissionLoading, setVoicePermissionLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const parseVoiceBid = trpc.ops.parseVoiceBid.useMutation({
    onSuccess: (data) => setVoiceResult(data),
    onError: () => alert("Voice parse failed. Try again."),
  });

  const voiceErrorMessage = (error?: string) => {
    switch (error) {
      case "not-allowed":
      case "service-not-allowed":
        return "Microphone access is off. Open Android Settings > Apps > Noland Field > Permissions > Microphone, choose Allow, then return here and try again.";
      case "audio-capture":
        return "Noland Field could not reach the microphone. Close any other app using the mic, then try again.";
      case "network":
        return "Voice recognition needs an internet connection. Check your signal, then try again.";
      case "no-speech":
        return "No speech was heard. Tap Voice Bid and try again.";
      default:
        return "Voice capture could not start. Check your microphone permission, then try again.";
    }
  };

  const requestMicrophoneAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setVoiceError(
        name === "NotAllowedError" || name === "SecurityError"
          ? voiceErrorMessage("not-allowed")
          : name === "NotFoundError" || name === "NotReadableError"
            ? voiceErrorMessage("audio-capture")
            : voiceErrorMessage()
      );
      return false;
    }
  };

  const startListening = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceOpen(true);
    setVoiceResult(null);
    setVoiceTranscript("");
    setVoiceError(null);
    if (!SR) {
      setVoiceError("Voice input is not supported on this device. Enter the job details manually instead.");
      return;
    }

    setVoicePermissionLoading(true);
    const microphoneReady = await requestMicrophoneAccess();
    setVoicePermissionLoading(false);
    if (!microphoneReady) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = (event: { error?: string }) => {
      setVoiceListening(false);
      if (event.error !== "aborted") setVoiceError(voiceErrorMessage(event.error));
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any).map((r: any) => r[0].transcript).join(" ");
      setVoiceTranscript(transcript);
      parseVoiceBid.mutate({ transcript });
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      setVoiceError(voiceErrorMessage());
    }
  };

  const stopListening = () => { recognitionRef.current?.stop(); setVoiceListening(false); };

  const applyVoiceResult = () => {
    if (!voiceResult) return;
    setForm((f) => ({
      ...f,
      ...(voiceResult.service && SERVICE_TYPES.includes(voiceResult.service) ? { serviceType: voiceResult.service } : {}),
      ...(voiceResult.acreage !== null ? { acreage: voiceResult.acreage.toString() } : {}),
      ...(voiceResult.linearFeet !== null ? { linearFeet: voiceResult.linearFeet.toString() } : {}),
      ...(voiceResult.terrain && ["flat","rolling","steep","very_steep"].includes(voiceResult.terrain) ? { terrain: voiceResult.terrain as FormState["terrain"] } : {}),
      ...(voiceResult.vegetationDensity && ["light","moderate","heavy","very_heavy"].includes(voiceResult.vegetationDensity) ? { vegetationDensity: voiceResult.vegetationDensity as FormState["vegetationDensity"] } : {}),
      ...(voiceResult.accessDifficulty && ["easy","moderate","difficult"].includes(voiceResult.accessDifficulty) ? { accessDifficulty: voiceResult.accessDifficulty as FormState["accessDifficulty"] } : {}),
      ...(voiceResult.hasStumps !== null ? { hasStumps: voiceResult.hasStumps } : {}),
      ...(voiceResult.stumpCount !== null ? { stumpCount: voiceResult.stumpCount.toString() } : {}),
      ...(voiceResult.mobilizationMiles !== null ? { mobilizationMiles: voiceResult.mobilizationMiles.toString() } : {}),
      ...(voiceResult.notes ? { message: voiceResult.notes } : {}),
      ...(voiceResult.clientName ? { name: voiceResult.clientName } : {}),
      ...(voiceResult.address ? { address: voiceResult.address } : {}),
    }));
    setVoiceOpen(false); setVoiceResult(null); setVoiceTranscript("");
  };

  const fwdGeoDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forward-geocode: when address changes manually, debounce 800 ms then geocode
  React.useEffect(() => {
    if (skipForwardGeocode.current) {
      skipForwardGeocode.current = false;
      return;
    }
    if (!form.address || form.address.length < 6) return;
    if (fwdGeoDebounce.current) clearTimeout(fwdGeoDebounce.current);
    fwdGeoDebounce.current = setTimeout(async () => {
      try {
        const result = await trpcUtils.client.fieldQuote.forwardGeocode.query({ address: form.address });
        if (result?.lat && result?.lng) {
          skipForwardGeocode.current = true; // prevent re-triggering
          setForm((f) => ({ ...f, lat: result.lat!, lng: result.lng! }));
        }
      } catch {
        // silently ignore
      }
    }, 800);
    return () => {
      if (fwdGeoDebounce.current) clearTimeout(fwdGeoDebounce.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.address]);

  // ─── GPS ────────────────────────────────────────────────────────────────

  const handleGetGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      const { latitude, longitude } = pos.coords;
      setForm((f) => ({ ...f, lat: latitude, lng: longitude }));
      try {
        const geo = await trpcUtils.client.fieldQuote.reverseGeocode.query({ lat: latitude, lng: longitude });
        if (geo?.address) {
          skipForwardGeocode.current = true;
          applyAddressDetails(geo);
        } else {
          setForm((f) => ({ ...f, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
        }
      } catch {
        // Fallback to raw coordinates if geocoding fails
        setForm((f) => ({ ...f, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
      }
    } catch (err: any) {
      setGpsError(err?.message ?? "Could not get location. Check permissions.");
    } finally {
      setGpsLoading(false);
    }
  };

  // ─── Camera ─────────────────────────────────────────────────────────────

  const handleTakePhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });
      if (image.base64String) {
        const mimeType = `image/${image.format ?? "jpeg"}`;
        const dataUrl = `data:${mimeType};base64,${image.base64String}`;
        setPhotos((prev) => [...prev, { dataUrl, base64: image.base64String!, mimeType }]);
      }
    } catch (err: any) {
      if (err?.message !== "User cancelled photos app") console.error("Camera error:", err);
    }
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  // ─── AI Estimate ─────────────────────────────────────────────────────────

  const handleGetEstimate = (discountCode: string | null | undefined = selectedDiscountCode) => {
    if (!form.serviceType) return;
    setEstimate(null);
    setEstimateError(null);
    const acreage = parseFloat(form.acreage);
    const linearFeet = parseFloat(form.linearFeet);
    const sourceAcreage = parseFloat(form.sourceAcreage);
    const clearingWidthFeet = parseFloat(form.clearingWidthFeet);
    const isLinearFootQuote = isLinearFootService(form.serviceType);
    const estimatedLinearFeet = isLinearFootQuote && form.quantitySource === "acreage_estimate"
      ? calculateLinearFeetFromAcreage(sourceAcreage, clearingWidthFeet)
      : null;
    if (isLinearFootQuote && form.quantitySource === "acreage_estimate" && !estimatedLinearFeet) {
      setEstimateError("Enter source acreage and a clearing width to estimate Linear Feet.");
      return;
    }
    if (isLinearFootQuote && form.quantitySource === "measured" && (!Number.isFinite(linearFeet) || linearFeet <= 0)) {
      setEstimateError("Enter measured Linear Feet or switch to Calculate from acreage.");
      return;
    }
    if (!isOnline) {
      void useCachedRateFallback().then((usedCache) => {
        if (!usedCache) setEstimateError("You are offline and this device has no saved Operations rates yet. Connect once to sync current rates.");
      });
      return;
    }
    const mobilizationMiles = parseFloat(form.mobilizationMiles) || 0;
    const stumpCount = parseInt(form.stumpCount) || 0;
    const trailWidth = parseFloat(form.trailWidth);
    const rowWidth = parseFloat(form.rowWidth);
    const fenceLineLF = parseFloat(form.fenceLineLF);

    getEstimate.mutate({
      service: form.serviceType,
      acreage: isNaN(acreage) ? undefined : acreage,
      linearFeet: estimatedLinearFeet ?? (isNaN(linearFeet) ? undefined : linearFeet),
      quantitySource: isLinearFootQuote ? form.quantitySource : undefined,
      sourceAcreage: isLinearFootQuote && form.quantitySource === "acreage_estimate" && Number.isFinite(sourceAcreage) ? sourceAcreage : undefined,
      clearingWidthFeet: isLinearFootQuote && form.quantitySource === "acreage_estimate" && Number.isFinite(clearingWidthFeet) ? clearingWidthFeet : undefined,
      terrain: form.terrain,
      vegetationDensity: form.vegetationDensity,
      accessDifficulty: form.accessDifficulty,
      mobilizationMiles,
      hasStumps: form.hasStumps,
      stumpCount,
      notes: form.message || undefined,
      trailWidth: isNaN(trailWidth) ? undefined : trailWidth,
      rowWidth: isNaN(rowWidth) ? undefined : rowWidth,
      fenceLineLF: isNaN(fenceLineLF) ? undefined : fenceLineLF,
      discountCode: discountCode ?? undefined,
    });
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim()) { setSubmitError("Customer name is required."); return; }
    if (!form.serviceType) { setSubmitError("Service type is required."); return; }

    const acreage = parseFloat(form.acreage);
    const linearFeet = parseFloat(form.linearFeet);
    const sourceAcreage = parseFloat(form.sourceAcreage);
    const clearingWidthFeet = parseFloat(form.clearingWidthFeet);
    const isLinearFootQuote = isLinearFootService(form.serviceType);
    const estimatedLinearFeet = isLinearFootQuote && form.quantitySource === "acreage_estimate"
      ? calculateLinearFeetFromAcreage(sourceAcreage, clearingWidthFeet)
      : null;
    const effectiveLinearFeet = estimatedLinearFeet ?? linearFeet;
    const needsAcreage = form.serviceType !== "Right-of-Way Clearing" && !isLinearFootQuote;

    if (needsAcreage && (!Number.isFinite(acreage) || acreage <= 0)) {
      setSubmitError("Estimated acreage is required for this field request.");
      return;
    }
    if (form.serviceType === "Right-of-Way Clearing" && (!Number.isFinite(linearFeet) || linearFeet <= 0)) {
      setSubmitError("Linear feet are required for a right-of-way field request.");
      return;
    }
    if (isLinearFootQuote && (!Number.isFinite(effectiveLinearFeet) || effectiveLinearFeet <= 0)) {
      setSubmitError(form.quantitySource === "acreage_estimate"
        ? "Enter source acreage and clearing width to estimate Linear Feet."
        : "Measured Linear Feet are required for this field request.");
      return;
    }

    setSubmitState("submitting");
    setSubmitError(null);

    const fieldScopeNote = [
      form.message.trim(),
      form.serviceType === "Right-of-Way Clearing" ? `Right-of-Way measurement: ${linearFeet} linear feet${form.rowWidth ? ` at approximately ${form.rowWidth} feet wide` : ""}.` : "",
      isLinearFootQuote ? `${form.serviceType} measurement: ${Math.round(effectiveLinearFeet).toLocaleString()} linear feet${form.quantitySource === "acreage_estimate" ? ` estimated from ${sourceAcreage} acres at ${clearingWidthFeet} feet wide — verify on site.` : "."}` : "",
      form.parcelId ? `TN Property Viewer reference: Parcel ${form.parcelId} · ${normalizeCountyName(form.county) || form.county}.` : "",
      estimate?.selectedDiscount ? `Selected quote discount: ${estimate.selectedDiscount.label} (${estimate.selectedDiscount.percent}% — ${estimate.selectedDiscount.eligibility}).` : "",
    ].filter(Boolean).join("\n");

    const submission = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      lat: form.lat ?? undefined,
      lng: form.lng ?? undefined,
      serviceType: form.serviceType,
      acreage: isNaN(acreage) ? undefined : acreage,
      linearFeet: isLinearFootQuote && Number.isFinite(effectiveLinearFeet) ? effectiveLinearFeet : undefined,
      quantitySource: isLinearFootQuote ? form.quantitySource : undefined,
      sourceAcreage: isLinearFootQuote && form.quantitySource === "acreage_estimate" && Number.isFinite(sourceAcreage) ? sourceAcreage : undefined,
      clearingWidthFeet: isLinearFootQuote && form.quantitySource === "acreage_estimate" && Number.isFinite(clearingWidthFeet) ? clearingWidthFeet : undefined,
      terrainType: form.terrain,
      vegetationDensity: form.vegetationDensity,
      vegetationTypes: form.vegetationTypes || undefined,
      slopeCondition: undefined,
      accessCondition: form.accessDifficulty,
      obstacles: form.obstacles || undefined,
      proximityToStructures: form.proximityToStructures || undefined,
      message: fieldScopeNote || undefined,
      photoUrls: [] as string[],
      source: "field_app",
    };

    if (!isOnline) {
      try {
        await enqueueOfflineFieldQuote({ ...submission, source: "field_app_offline" });
        setQueuedOffline(true);
        setSubmitState("success");
      } catch {
        setSubmitState("error");
        setSubmitError("This request could not be saved on the device. Reconnect and try again.");
      }
      return;
    }

    try {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const result = await uploadPhoto.mutateAsync({ base64: photo.base64, mimeType: photo.mimeType });
        photoUrls.push(result.url);
      }

      await submitQuote.mutateAsync({
        ...submission,
        photoUrls,
      });

      setSubmitState("success");
    } catch (err: any) {
      setSubmitState("error");
      setSubmitError(err?.message ?? "Submission failed. Check your connection.");
    }
  };

  // ─── Success screen ─────────────────────────────────────────────────────

  if (submitState === "success") {
    return (
      <div role="status" aria-live="polite" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <CheckCircle2 size={64} color="oklch(0.70 0.18 145)" style={{ marginBottom: 20 }} />
        <h2 style={{ color: "oklch(0.94 0.01 80)", fontSize: 22, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>
          Field Request Saved
        </h2>
        <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 15, textAlign: "center", margin: "0 0 32px" }}>
          {queuedOffline ? "This field request is stored on the device and will synchronize to Operations when the app reconnects. Photos are not included in offline requests; add them after reconnecting if needed." : "The field request is now in Operations. Review it there to schedule a site visit or continue quote work."}
        </p>
        <button
          onClick={() => navigate("/")}
          style={{ backgroundColor: "oklch(0.65 0.18 50)", border: "none", borderRadius: 12, padding: "14px 32px", color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
        >
          Back to Home
        </button>
        <button
              onClick={() => {
                setSubmitState("idle");
            setQueuedOffline(false);
            setPhotos([]);
            setEstimate(null);
            clearExistingClient();
            setForm({
              name: "", email: "", phone: "", address: "", city: "", county: "", zip: "", parcelId: "", lat: null, lng: null,
              serviceType: "Forestry Mulching", acreage: "", linearFeet: "", quantitySource: "measured", sourceAcreage: "", clearingWidthFeet: "20",
              terrain: "flat", vegetationDensity: "moderate", accessDifficulty: "easy",
              mobilizationMiles: "0", hasStumps: false, stumpCount: "", trailWidth: "",
              rowWidth: "", fenceLineLF: "", vegetationTypes: "", obstacles: "",
              proximityToStructures: "", message: "",
            });
          }}
          style={{ marginTop: 12, background: "none", border: "none", color: "oklch(0.65 0.18 50)", fontSize: 15, cursor: "pointer", padding: "8px 0" }}
        >
          Submit another field request
        </button>
      </div>
    );
  }

  // ─── Styles ──────────────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (key === "address" || key === "county" || key === "parcelId") setSelectedParcelBoundary(null);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "var(--ne-raised)",
    border: "1px solid var(--ne-border)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "var(--ne-cream)",
    fontSize: 15,
    outline: "none",
    marginTop: 6,
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--ne-muted)",
    fontSize: 13,
    fontWeight: 500,
    display: "block",
  };

  const sectionStyle: React.CSSProperties = {
    background: "linear-gradient(145deg, var(--ne-clay), var(--ne-soil))",
    border: "1px solid var(--ne-border)",
    borderRadius: 14,
    padding: "16px",
    marginBottom: 16,
  };

  const sectionTitle: React.CSSProperties = {
    color: "var(--ne-amber)",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 14,
  };

  const isROW = form.serviceType === "Right-of-Way Clearing";
  const isFenceLine = form.serviceType === "Fence Line Clearing";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="New Field Quote"
        showBack
        right={
          <button
            onClick={handleSubmit}
            disabled={submitState === "submitting"}
            style={{
              background: submitState === "submitting" ? "var(--ne-raised)" : "linear-gradient(135deg, var(--ne-amber-strong), var(--ne-amber))",
              border: "none", borderRadius: 8, padding: "8px 16px", color: "var(--ne-amber-ink)",
              fontWeight: 700, fontSize: 14, cursor: submitState === "submitting" ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {submitState === "submitting" ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
            ) : "Submit"}
          </button>
        }
      />

      <div className="scroll-area" style={{ flex: 1, padding: "16px", paddingBottom: 100 }}>
        {submitError && (
          <div role="alert" style={{ backgroundColor: "oklch(0.65 0.20 25 / 0.15)", border: "1px solid oklch(0.65 0.20 25 / 0.4)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} color="oklch(0.65 0.20 25)" />
            <p style={{ color: "oklch(0.65 0.20 25)", fontSize: 13, margin: 0 }}>{submitError}</p>
          </div>
        )}

        {/* ── Voice Bid Button ── */}
        <button
          onClick={voiceListening || voicePermissionLoading ? stopListening : startListening}
          disabled={voicePermissionLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            backgroundColor: voiceListening ? "oklch(0.65 0.20 25 / 0.15)" : "oklch(0.65 0.18 50 / 0.12)",
            border: `1.5px solid ${voiceListening ? "oklch(0.65 0.20 25)" : "oklch(0.65 0.18 50)"}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            color: voiceListening ? "oklch(0.65 0.20 25)" : "oklch(0.65 0.18 50)",
            fontWeight: 700, fontSize: 15, cursor: voicePermissionLoading ? "wait" : "pointer",
            opacity: voicePermissionLoading ? 0.7 : 1,
          }}
        >
          {voiceListening ? <MicOff size={20} /> : <Mic size={20} />}
          {voicePermissionLoading ? "Checking Microphone…" : voiceListening ? "Tap to Stop Listening" : "Voice Bid — Speak Job Description"}
        </button>

        {/* ── Voice Overlay Panel ── */}
        {voiceOpen && (
          <div style={{
            backgroundColor: "oklch(0.16 0 0)", border: "1px solid oklch(0.30 0.01 80)",
            borderRadius: 14, padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "oklch(0.65 0.18 50)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>Voice Bid</span>
              <button onClick={() => { stopListening(); setVoiceOpen(false); setVoiceResult(null); setVoiceTranscript(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0.01 80)", padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {voiceListening && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "oklch(0.65 0.20 25)", animation: "pulse 1s infinite" }} />
                <span style={{ color: "oklch(0.65 0.20 25)", fontSize: 13 }}>Listening... speak the job description</span>
              </div>
            )}

            {voiceError && (
              <div role="alert" style={{ backgroundColor: "oklch(0.65 0.20 25 / 0.12)", border: "1px solid oklch(0.65 0.20 25 / 0.4)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                <p style={{ color: "oklch(0.78 0.16 25)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{voiceError}</p>
              </div>
            )}

            {voiceTranscript && !voiceListening && (
              <div style={{ backgroundColor: "oklch(0.20 0 0)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 11, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Heard</p>
                <p style={{ color: "oklch(0.85 0.01 80)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{voiceTranscript}</p>
              </div>
            )}

            {parseVoiceBid.isPending && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "oklch(0.65 0.18 50)", fontSize: 13 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Parsing...
              </div>
            )}

            {voiceResult && !parseVoiceBid.isPending && (
              <div>
                <p style={{ color: "oklch(0.70 0.01 80)", fontSize: 12, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Extracted</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                  {voiceResult.clientName && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Name: <strong>{voiceResult.clientName}</strong></span>}
                  {voiceResult.service && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Service: <strong>{voiceResult.service}</strong></span>}
                  {voiceResult.acreage !== null && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Acreage: <strong>{voiceResult.acreage} ac</strong></span>}
                  {voiceResult.terrain && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Terrain: <strong>{voiceResult.terrain}</strong></span>}
                  {voiceResult.vegetationDensity && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Vegetation: <strong>{voiceResult.vegetationDensity}</strong></span>}
                  {voiceResult.accessDifficulty && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Access: <strong>{voiceResult.accessDifficulty}</strong></span>}
                  {voiceResult.mobilizationMiles !== null && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Miles: <strong>{voiceResult.mobilizationMiles}</strong></span>}
                  {voiceResult.notes && <span style={{ color: "oklch(0.85 0.01 80)", fontSize: 13 }}>Notes: <strong>{voiceResult.notes}</strong></span>}
                </div>
                <button
                  onClick={applyVoiceResult}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    backgroundColor: "oklch(0.65 0.18 50)", border: "none", borderRadius: 10,
                    padding: "12px 16px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  <CheckCircle size={16} /> Apply to Form
                </button>
              </div>
            )}

            {!voiceListening && !voiceTranscript && !voiceResult && !voiceError && (
              <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 13, margin: 0 }}>Tap the mic button above and describe the job — service type, acreage, terrain, vegetation, access, and how far out the site is.</p>
            )}
          </div>
        )}

        {/* ── Customer Info ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Customer Info</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Existing client (optional)</label>
              <input
                value={clientSearch}
                onChange={(event) => { setClientSearch(event.target.value); setClientPickerOpen(true); }}
                onFocus={() => setClientPickerOpen(true)}
                placeholder="Search saved clients by name, phone, email, or address"
                autoComplete="off"
                style={inputStyle}
                aria-expanded={clientPickerOpen}
                aria-controls="saved-client-options"
              />
              {selectedClient && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                  <span style={{ color: "oklch(0.70 0.18 145)", fontSize: 11 }}>Using saved client: {selectedClient.name}. Contact fields remain editable.</span>
                  <button type="button" onClick={clearExistingClient} style={{ marginLeft: "auto", border: "none", background: "none", color: "var(--ne-amber)", fontSize: 11, padding: 0, cursor: "pointer", textDecoration: "underline" }}>
                    Clear selection
                  </button>
                </div>
              )}
              {clientPickerOpen && (
                <div id="saved-client-options" role="listbox" aria-label="Saved client options" style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%", marginTop: 5, border: "1px solid var(--ne-border)", borderRadius: 10, backgroundColor: "var(--ne-soil)", boxShadow: "0 12px 28px rgba(0, 0, 0, 0.35)", maxHeight: 240, overflowY: "auto" }}>
                  {isLoadingClients ? (
                    <p style={{ color: "var(--ne-muted)", fontSize: 12, margin: 0, padding: "12px 14px" }}>Loading saved clients…</p>
                  ) : clientOptionsError ? (
                    <p role="alert" style={{ color: "oklch(0.70 0.20 25)", fontSize: 12, margin: 0, padding: "12px 14px" }}>Saved clients could not be loaded. You can enter the customer details manually.</p>
                  ) : clientOptions.length === 0 ? (
                    <p style={{ color: "var(--ne-muted)", fontSize: 12, margin: 0, padding: "12px 14px" }}>No saved clients match this search. Enter a new customer below.</p>
                  ) : (
                    clientOptions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        role="option"
                        aria-selected={selectedClient?.id === client.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectExistingClient(client)}
                        style={{ width: "100%", display: "block", textAlign: "left", background: selectedClient?.id === client.id ? "oklch(0.65 0.18 50 / 0.12)" : "transparent", border: "none", borderBottom: "1px solid var(--ne-border)", color: "var(--ne-cream)", padding: "10px 13px", cursor: "pointer" }}
                      >
                        <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{client.name}</span>
                        {(client.phone || client.email || client.address) && <span style={{ display: "block", color: "var(--ne-muted)", fontSize: 11, marginTop: 3, lineHeight: 1.35 }}>{[client.phone, client.email, client.address].filter(Boolean).join(" · ")}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Name *</label>
              <input value={form.name} onChange={set("name")} placeholder="Customer name" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={set("phone")} placeholder="615-xxx-xxxx" type="tel" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={form.email} onChange={set("email")} placeholder="email@..." type="email" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Site Location ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Site Location</p>
          <div>
            <label style={labelStyle}>Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(addr) => setForm((f) => ({ ...f, address: addr }))}
              onCoordinates={(lat, lng) => {
                skipForwardGeocode.current = true;
                setForm((f) => ({ ...f, lat, lng }));
              }}
              onAddressDetails={(details) => applyAddressDetails(details)}
              inputStyle={inputStyle}
              placeholder="Street address or description"
              rightSlot={
                <button
                  onClick={handleGetGPS}
                  disabled={gpsLoading}
                  style={{ background: "none", border: "none", cursor: gpsLoading ? "not-allowed" : "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}
                  title="Use GPS location"
                >
                  {gpsLoading
                    ? <Loader2 size={18} color="oklch(0.65 0.18 50)" style={{ animation: "spin 1s linear infinite" }} />
                    : <MapPin size={18} color={form.lat ? "oklch(0.65 0.18 50)" : "oklch(0.50 0.01 80)"} />
                  }
                </button>
              }
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.75fr", gap: 8, marginTop: 10 }}>
              <input value={form.city} onChange={set("city")} placeholder="City" style={{ ...inputStyle, marginTop: 0, padding: "10px 11px" }} />
              <input value={form.county} onChange={set("county")} placeholder="County" style={{ ...inputStyle, marginTop: 0, padding: "10px 11px" }} />
              <input value={form.zip} onChange={set("zip")} placeholder="ZIP" style={{ ...inputStyle, marginTop: 0, padding: "10px 11px" }} />
            </div>
            <div style={{ marginTop: 10, border: "1px solid oklch(0.65 0.18 50 / 0.35)", borderRadius: 10, padding: 10, backgroundColor: "oklch(0.65 0.18 50 / 0.06)" }}>
              <label style={{ ...labelStyle, color: "var(--ne-amber)" }}>Tennessee Parcel ID Lookup</label>
              <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "4px 0 8px", lineHeight: 1.4 }}>Enter the county above and the Parcel ID from the Tennessee Property Viewer. Property details remain editable.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  value={form.parcelId}
                  onChange={(event) => { setForm((current) => ({ ...current, parcelId: event.target.value })); if (parcelIdError) setParcelIdError(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); lookupParcel(); } }}
                  placeholder="Parcel ID, map/group/parcel"
                  aria-invalid={Boolean(parcelIdError)}
                  style={{ ...inputStyle, marginTop: 0, borderColor: parcelIdError ? "oklch(0.65 0.20 25)" : "var(--ne-border)" }}
                />
                <button type="button" onClick={lookupParcel} disabled={parcelLookup.isPending} style={{ border: "1px solid var(--ne-amber)", borderRadius: 9, background: parcelLookup.isPending ? "var(--ne-raised)" : "transparent", color: "var(--ne-amber)", padding: "0 11px", fontWeight: 700, fontSize: 12, cursor: parcelLookup.isPending ? "not-allowed" : "pointer" }}>
                  {parcelLookup.isPending ? "Finding…" : "Find"}
                </button>
              </div>
              {parcelIdError && <p role="alert" style={{ color: "oklch(0.70 0.20 25)", fontSize: 11, margin: "7px 0 0" }}>{parcelIdError}</p>}
              {parcelMatches.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 9 }} aria-live="polite">
                {parcelMatches.map((match) => <div key={`${match.county}-${match.parcelId}`} style={{ border: "1px solid var(--ne-border)", borderRadius: 8, padding: 9, backgroundColor: "var(--ne-raised)" }}>
                  <p style={{ color: "var(--ne-cream)", fontSize: 12, fontWeight: 700, margin: 0 }}>{match.address || "Address unavailable"}</p>
                  <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "3px 0 0" }}>Parcel {match.parcelId} · {match.county}{match.deedAcreage ? ` · ${match.deedAcreage} acres reported` : ""}</p>
                  {match.owner && <p style={{ color: "var(--ne-muted)", fontSize: 11, margin: "3px 0 0" }}>Owner record: {match.owner}</p>}
                  <div style={{ display: "flex", gap: 10, marginTop: 7, alignItems: "center" }}>
                    <button type="button" onClick={() => applyParcelMatch(match)} style={{ border: "none", borderRadius: 7, padding: "6px 9px", backgroundColor: "var(--ne-amber)", color: "var(--ne-amber-ink)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Use Property</button>
                    {match.propertyViewerUrl && <a href={match.propertyViewerUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ne-amber)", fontSize: 11 }}>Open TN Property Viewer</a>}
                  </div>
                </div>)}
              </div>}
            </div>
            {form.county && <p style={{ color: isServedCounty(form.county) ? "oklch(0.70 0.18 145)" : "oklch(0.75 0.16 75)", fontSize: 11, margin: "7px 0 0", lineHeight: 1.45 }}>
              {isServedCounty(form.county) ? `${normalizeCountyName(form.county)} is in the standard service area.` : `${normalizeCountyName(form.county)} is outside the standard service area. Confirm custom travel with the owner or add the contact to the expansion waitlist in Ops.`}
            </p>}
            <ServiceAreaMapPreview />
            {form.lat && (
              <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 11, margin: "4px 0 0" }}>
                GPS: {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
              </p>
            )}
            {gpsError && <p style={{ color: "oklch(0.65 0.20 25)", fontSize: 11, margin: "4px 0 0" }}>{gpsError}</p>}
            {form.lat && form.lng && (
              <InteractiveMapPreview
                lat={form.lat}
                lng={form.lng}
                boundaryRings={selectedParcelBoundary}
                onPinMoved={async (lat, lng) => {
                  setForm((f) => ({ ...f, lat, lng }));
                  try {
                    const geo = await trpcUtils.client.fieldQuote.reverseGeocode.query({ lat, lng });
                    if (geo?.address) {
                      skipForwardGeocode.current = true;
                      applyAddressDetails(geo);
                    }
                  } catch {
                    // silently ignore — lat/lng already updated
                  }
                }}
              />
            )}
            {selectedParcelBoundary && <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 11, margin: "6px 0 0" }}>Orange outline shows the official Tennessee Property Viewer parcel boundary.</p>}
          </div>
        </div>

        {/* ── Job Details ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Job Details</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Service type */}
              <div>
                <label style={labelStyle}>Service Type *</label>
                <div style={{ position: "relative" }}>
                  <select value={form.serviceType} onChange={set("serviceType")} style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}>
                  {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Acreage services */}
            {!isROW && !isLinearFootService(form.serviceType) && (
              <div>
                <label style={labelStyle}>Estimated Acreage *</label>
                <input value={form.acreage} onChange={set("acreage")} placeholder="e.g. 5.5" type="number" inputMode="decimal" style={inputStyle} />
              </div>
            )}

            {/* ROW-specific: linear feet + width */}
            {isROW && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Linear Feet *</label>
                  <input value={form.linearFeet} onChange={set("linearFeet")} placeholder="e.g. 2000" type="number" inputMode="numeric" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>ROW Width (ft)</label>
                  <input value={form.rowWidth} onChange={set("rowWidth")} placeholder="e.g. 30" type="number" inputMode="numeric" style={inputStyle} />
                </div>
              </div>
            )}

            {/* Shared Linear Foot workflow for Trail Cutting and Fence Line Clearing */}
            {isLinearFootService(form.serviceType) && (
              <div style={{ border: "1px solid oklch(0.65 0.18 50 / 0.35)", borderRadius: 10, padding: 11, backgroundColor: "oklch(0.65 0.18 50 / 0.06)" }}>
                <label style={{ ...labelStyle, color: "var(--ne-amber)" }}>Linear Foot Measurement</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 7 }}>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, quantitySource: "measured" }))} aria-pressed={form.quantitySource === "measured"} style={{ border: `1px solid ${form.quantitySource === "measured" ? "var(--ne-amber)" : "var(--ne-border)"}`, borderRadius: 8, background: form.quantitySource === "measured" ? "oklch(0.65 0.18 50 / 0.15)" : "var(--ne-raised)", color: form.quantitySource === "measured" ? "var(--ne-amber)" : "var(--ne-cream)", padding: "9px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Measured footage</button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, quantitySource: "acreage_estimate" }))} aria-pressed={form.quantitySource === "acreage_estimate"} style={{ border: `1px solid ${form.quantitySource === "acreage_estimate" ? "var(--ne-amber)" : "var(--ne-border)"}`, borderRadius: 8, background: form.quantitySource === "acreage_estimate" ? "oklch(0.65 0.18 50 / 0.15)" : "var(--ne-raised)", color: form.quantitySource === "acreage_estimate" ? "var(--ne-amber)" : "var(--ne-cream)", padding: "9px 8px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Calculate from acreage</button>
                </div>
                {form.quantitySource === "measured" ? (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Measured Linear Feet *</label>
                    <input value={form.linearFeet} onChange={set("linearFeet")} placeholder="e.g. 2,000" type="number" inputMode="numeric" style={inputStyle} />
                  </div>
                ) : (() => {
                  const estimatedFeet = calculateLinearFeetFromAcreage(parseFloat(form.sourceAcreage), parseFloat(form.clearingWidthFeet));
                  return <div style={{ marginTop: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={labelStyle}>Source acreage *</label>
                        <input value={form.sourceAcreage} onChange={set("sourceAcreage")} placeholder="e.g. 3" type="number" inputMode="decimal" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Clearing width (ft) <button type="button" title="Acres × 43,560 ÷ clearing width (ft) = estimated Linear Feet. Use for defined corridors, not a property perimeter. Verify footage on site." aria-label="Acreage to Linear Feet formula" style={{ border: "none", background: "none", color: "var(--ne-amber)", cursor: "help", padding: 0, fontWeight: 700 }}>ⓘ</button></label>
                        <select value={form.clearingWidthFeet} onChange={set("clearingWidthFeet")} style={{ ...inputStyle, marginTop: 6 }} aria-label="Clearing width in feet">
                          {LINEAR_FOOT_CLEARING_WIDTH_OPTIONS.map((width) => <option key={width} value={width}>{width} ft</option>)}
                        </select>
                        <p style={{ color: "var(--ne-muted)", fontSize: 10, lineHeight: 1.35, margin: "5px 0 0" }}>Acres × 43,560 ÷ width = estimated Linear Feet.</p>
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ color: "var(--ne-muted)", fontSize: 11, fontWeight: 700 }}>Quick select: </span>
                      {LINEAR_FOOT_CLEARING_WIDTH_OPTIONS.map((width) => <button key={width} type="button" onClick={() => setForm((f) => ({ ...f, clearingWidthFeet: String(width) }))} aria-pressed={Number(form.clearingWidthFeet) === width} style={{ border: `1px solid ${Number(form.clearingWidthFeet) === width ? "var(--ne-amber)" : "var(--ne-border)"}`, borderRadius: 7, background: Number(form.clearingWidthFeet) === width ? "oklch(0.65 0.18 50 / 0.15)" : "var(--ne-raised)", color: Number(form.clearingWidthFeet) === width ? "var(--ne-amber)" : "var(--ne-cream)", padding: "5px 7px", fontSize: 10, fontWeight: 700, cursor: "pointer", marginLeft: 5 }}>{width} ft</button>)}
                    </div>
                    <div role="status" style={{ marginTop: 10, borderRadius: 8, border: "1px solid oklch(0.75 0.18 60 / 0.45)", background: "oklch(0.75 0.18 60 / 0.08)", padding: "9px 10px", color: "oklch(0.82 0.18 65)", fontSize: 12, lineHeight: 1.4 }}>
                      <strong>Estimated footage — verify on site.</strong> {estimatedFeet ? `${estimatedFeet.toLocaleString()} Linear Feet from ${form.sourceAcreage} acres at ${form.clearingWidthFeet} ft wide.` : "Enter acreage to calculate Linear Feet."}
                    </div>
                  </div>;
                })()}
              </div>
            )}

            {/* Terrain + Vegetation */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Terrain</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.terrain}
                    onChange={(e) => setForm((f) => ({ ...f, terrain: e.target.value as FormState["terrain"] }))}
                    style={{ ...inputStyle, appearance: "none", paddingRight: 28 }}
                  >
                    {TERRAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Vegetation Density</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.vegetationDensity}
                    onChange={(e) => setForm((f) => ({ ...f, vegetationDensity: e.target.value as FormState["vegetationDensity"] }))}
                    style={{ ...inputStyle, appearance: "none", paddingRight: 28 }}
                  >
                    {VEG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
                </div>
              </div>
            </div>

            {/* Access difficulty */}
            <div>
              <label style={labelStyle}>Site Access</label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.accessDifficulty}
                  onChange={(e) => setForm((f) => ({ ...f, accessDifficulty: e.target.value as FormState["accessDifficulty"] }))}
                  style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}
                >
                  {ACCESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
              </div>
            </div>
            <QuoteClassificationGuide
              vegetationDensity={form.vegetationDensity}
              terrain={form.terrain}
              accessDifficulty={form.accessDifficulty}
            />

            {/* Mobilization miles */}
            <div>
              <label style={labelStyle}>Distance from Vanleer, TN (miles one-way)</label>
              <input value={form.mobilizationMiles} onChange={set("mobilizationMiles")} placeholder="e.g. 45" type="number" inputMode="numeric" style={inputStyle} />
              {(() => {
                const miles = parseFloat(form.mobilizationMiles) || 0;
                const tiers = [
                  { max: 30, label: "Local — no travel surcharge" },
                  { max: 50, label: "Near — +$150 travel surcharge" },
                  { max: 75, label: "Regional — +$300 travel surcharge" },
                  { max: 100, label: "Extended — +$500 travel surcharge" },
                  { max: Infinity, label: "Long-Haul — +$750 travel surcharge" },
                ];
                const tier = tiers.find((t) => miles <= t.max);
                return tier ? (
                  <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 11, margin: "4px 0 0" }}>{tier.label}</p>
                ) : null;
              })()}
            </div>

            {/* Stumps */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: form.hasStumps ? 8 : 0 }}>
                <input
                  type="checkbox"
                  id="hasStumps"
                  checked={form.hasStumps}
                  onChange={(e) => setForm((f) => ({ ...f, hasStumps: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: "oklch(0.65 0.18 50)", cursor: "pointer" }}
                />
                <label htmlFor="hasStumps" style={{ ...labelStyle, marginTop: 0, cursor: "pointer" }}>Stumps to grind</label>
              </div>
              {form.hasStumps && (
                <div>
                  <label style={labelStyle}>Stump Count</label>
                  <input value={form.stumpCount} onChange={set("stumpCount")} placeholder="e.g. 12" type="number" inputMode="numeric" style={inputStyle} />
                </div>
              )}
            </div>

            {/* Optional fence-line add-on for non-fence-line services */}
            {!isFenceLine && <div>
              <label style={labelStyle}>Fence Line Clearing (linear feet, optional)</label>
              <input value={form.fenceLineLF} onChange={set("fenceLineLF")} placeholder="e.g. 500" type="number" inputMode="numeric" style={inputStyle} />
            </div>}

            {/* Vegetation types (legacy intake field) */}
            <div>
              <label style={labelStyle}>Vegetation Types</label>
              <input value={form.vegetationTypes} onChange={set("vegetationTypes")} placeholder="e.g. cedar, honeysuckle, briars" style={inputStyle} />
            </div>

            {/* Obstacles */}
            <div>
              <label style={labelStyle}>Obstacles (rock, water, fencing)</label>
              <input value={form.obstacles} onChange={set("obstacles")} placeholder="Describe any obstacles on site" style={inputStyle} />
            </div>

            {/* Proximity */}
            <div>
              <label style={labelStyle}>Proximity to Structures / Utilities</label>
              <input value={form.proximityToStructures} onChange={set("proximityToStructures")} placeholder="e.g. 20ft from fence, near power line" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* ── AI Pricing Estimate ── */}
        <div style={{ ...sectionStyle, border: "1px solid oklch(0.65 0.18 50 / 0.35)" }}>
          <p style={sectionTitle}>AI Price Estimate</p>

          {(() => {
            const usingCachedRates = estimate?.pricingSource === "cached" || (!estimate && rateStatus === "cached");
            const usingLiveRates = estimate?.pricingSource === "live" || (!estimate && rateStatus === "live");
            const lastSyncedAt = estimate?.pricingSyncedAt ?? cachedPricing?.lastSyncedAt ?? null;
            const sourceLabel = usingCachedRates
              ? "Offline — cached Operations rates"
              : usingLiveRates
                ? "Live Operations rates"
                : rateStatus === "loading"
                  ? "Checking Operations rates…"
                  : "Operations rates unavailable";
            const sourceColor = usingCachedRates
              ? "oklch(0.78 0.16 60)"
              : usingLiveRates
                ? "oklch(0.75 0.18 145)"
                : "oklch(0.65 0.20 25)";
            return (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 10px", borderRadius: 8, backgroundColor: usingCachedRates ? "oklch(0.75 0.16 60 / 0.10)" : usingLiveRates ? "oklch(0.70 0.18 145 / 0.08)" : "oklch(0.30 0 0)", border: `1px solid ${sourceColor}55`, marginBottom: 12 }}>
                {usingCachedRates ? <CloudOff size={16} color={sourceColor} style={{ flexShrink: 0, marginTop: 1 }} /> : <CloudCheck size={16} color={sourceColor} style={{ flexShrink: 0, marginTop: 1 }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ color: sourceColor, fontSize: 12, fontWeight: 700, margin: 0 }}>{sourceLabel}</p>
                  <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 10, lineHeight: 1.45, margin: "3px 0 0" }}>
                    {lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}.` : "Connect to Operations once to save rates for offline estimates."}
                    {usingCachedRates ? " Verify live rates before sending the quote." : ""}
                  </p>
                  {showRateSyncNow && isOnline && (
                    <button
                      type="button"
                      onClick={() => void handleRateSyncNow()}
                      disabled={pricingSnapshotQuery.isFetching}
                      style={{ marginTop: 8, border: "1px solid oklch(0.75 0.18 145 / 0.60)", borderRadius: 7, background: "oklch(0.70 0.18 145 / 0.12)", color: "oklch(0.75 0.18 145)", padding: "6px 9px", fontSize: 10, fontWeight: 700, cursor: pricingSnapshotQuery.isFetching ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                    >
                      {pricingSnapshotQuery.isFetching ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <CloudCheck size={12} />}
                      {pricingSnapshotQuery.isFetching ? "Syncing…" : "Sync Now"}
                    </button>
                  )}
                  {rateSyncMessage && <p role="status" style={{ color: rateSyncMessage.startsWith("Could not") || rateSyncMessage.startsWith("Operations rates were") ? "oklch(0.78 0.16 60)" : "oklch(0.75 0.18 145)", fontSize: 10, lineHeight: 1.4, margin: "7px 0 0" }}>{rateSyncMessage}</p>}
                </div>
              </div>
            );
          })()}

          <button
            onClick={() => handleGetEstimate()}
            disabled={getEstimate.isPending}
            style={{
              width: "100%",
              backgroundColor: getEstimate.isPending ? "oklch(0.25 0 0)" : "oklch(0.65 0.18 50 / 0.15)",
              border: "1px solid oklch(0.65 0.18 50 / 0.5)",
              borderRadius: 10,
              padding: "13px 16px",
              color: getEstimate.isPending ? "oklch(0.60 0.01 80)" : "oklch(0.65 0.18 50)",
              fontWeight: 700,
              fontSize: 14,
              cursor: getEstimate.isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {getEstimate.isPending ? (
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating estimate...</>
            ) : (
              <><Sparkles size={16} /> Generate AI Estimate</>
            )}
          </button>

          {estimateError && (
            <p style={{ color: "oklch(0.65 0.20 25)", fontSize: 13, margin: "0 0 8px" }}>{estimateError}</p>
          )}

          {estimate && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Price range */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ backgroundColor: "oklch(0.22 0 0)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <DollarSign size={16} color="oklch(0.65 0.18 50)" style={{ margin: "0 auto 4px" }} />
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "0 0 2px" }}>Price Range</p>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {formatQuoteCents(Math.ceil(estimate.customerPriceLow) * 100)} – {formatQuoteCents(Math.ceil(estimate.customerPriceHigh) * 100)}
                  </p>
                </div>
                <div style={{ backgroundColor: "oklch(0.22 0 0)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <Clock size={16} color="oklch(0.65 0.18 50)" style={{ margin: "0 auto 4px" }} />
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "0 0 2px" }}>Est. Days</p>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {estimate.estimatedDays == null ? "Live sync needed" : estimate.estimatedDays.toFixed(1)}
                  </p>
                </div>
                <div style={{ backgroundColor: "oklch(0.22 0 0)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "0 0 2px" }}>Margin</p>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {estimate.marginPct == null ? "Review" : `${estimate.marginPct.toFixed(0)}%`}
                  </p>
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "2px 0 0" }}>
                    {estimate.totalInternalCost == null ? "Cached rate estimate" : `Cost: ${formatQuoteCents(Math.ceil(estimate.totalInternalCost) * 100)}`}
                  </p>
                </div>
              </div>

              {estimate.fieldConditionAdjustment && (
                <div style={{ backgroundColor: "oklch(0.65 0.18 50 / 0.08)", border: "1px solid oklch(0.65 0.18 50 / 0.35)", borderRadius: 8, padding: "9px 10px" }}>
                  <p style={{ color: "oklch(0.78 0.16 60)", fontSize: 12, fontWeight: 700, margin: 0 }}>Automatic field-condition adjustment ×{estimate.fieldConditionAdjustment.combinedMultiplier.toFixed(2)}</p>
                  <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 10, lineHeight: 1.45, margin: "3px 0 0" }}>
                    Base {formatQuoteCents(Math.ceil(estimate.fieldConditionAdjustment.baseCustomerPriceLow) * 100)} – {formatQuoteCents(Math.ceil(estimate.fieldConditionAdjustment.baseCustomerPriceHigh) * 100)} · Vegetation ×{estimate.fieldConditionAdjustment.vegetationMultiplier.toFixed(2)} · Terrain ×{estimate.fieldConditionAdjustment.terrainMultiplier.toFixed(2)} · Access ×{estimate.fieldConditionAdjustment.accessMultiplier.toFixed(2)}
                  </p>
                </div>
              )}

              {estimate.eligibleDiscounts.length > 0 && (
                <div style={{ backgroundColor: "oklch(0.70 0.18 145 / 0.08)", border: "1px solid oklch(0.70 0.18 145 / 0.30)", borderRadius: 8, padding: "9px 10px" }}>
                  <p style={{ color: "oklch(0.75 0.18 145)", fontSize: 12, fontWeight: 700, margin: 0 }}>Optional Operations discount</p>
                  <p style={{ color: "var(--ne-muted)", fontSize: 10, lineHeight: 1.45, margin: "3px 0 8px" }}>Choose one eligible discount to recalculate this internal estimate. It stays subject to owner review and is not stacked with other discounts.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {estimate.eligibleDiscounts.map((discount) => <button key={discount.code} type="button" onClick={() => { setSelectedDiscountCode(discount.code); handleGetEstimate(discount.code); }} disabled={getEstimate.isPending} style={{ border: `1px solid ${estimate.selectedDiscount?.code === discount.code ? "oklch(0.75 0.18 145)" : "var(--ne-border)"}`, borderRadius: 7, backgroundColor: estimate.selectedDiscount?.code === discount.code ? "oklch(0.70 0.18 145 / 0.14)" : "var(--ne-raised)", color: estimate.selectedDiscount?.code === discount.code ? "oklch(0.75 0.18 145)" : "var(--ne-cream)", padding: "6px 8px", fontSize: 10, fontWeight: 700, cursor: getEstimate.isPending ? "not-allowed" : "pointer" }}>{estimate.selectedDiscount?.code === discount.code ? "Applied " : "Apply "}{discount.percent}% {discount.label.replace(" Discount", "")}</button>)}
                    {estimate.selectedDiscount && <button type="button" onClick={() => { setSelectedDiscountCode(null); handleGetEstimate(null); }} disabled={getEstimate.isPending} style={{ border: "1px solid var(--ne-border)", borderRadius: 7, backgroundColor: "transparent", color: "var(--ne-muted)", padding: "6px 8px", fontSize: 10, cursor: getEstimate.isPending ? "not-allowed" : "pointer" }}>Remove discount</button>}
                  </div>
                </div>
              )}

              {estimate.selectedDiscount && estimate.discountAdjustment && (
                <p style={{ color: "oklch(0.75 0.18 145)", fontSize: 11, margin: 0 }}>
                  {estimate.selectedDiscount.label} applied: {formatQuoteCents(Math.ceil(estimate.discountAdjustment.baseCustomerPriceLow) * 100)} – {formatQuoteCents(Math.ceil(estimate.discountAdjustment.baseCustomerPriceHigh) * 100)} before discount; reduced by {formatQuoteCents(Math.ceil(estimate.discountAdjustment.discountAmountLow) * 100)} – {formatQuoteCents(Math.ceil(estimate.discountAdjustment.discountAmountHigh) * 100)}.
                </p>
              )}

              {/* Summary */}
              <p style={{ color: "oklch(0.75 0.01 80)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{estimate.summary}</p>

              {/* Warnings */}
              {estimate.warnings.length > 0 && (
                <div style={{ backgroundColor: "oklch(0.55 0.18 60 / 0.12)", border: "1px solid oklch(0.65 0.18 50 / 0.3)", borderRadius: 8, padding: "10px 12px" }}>
                  {estimate.warnings.map((w, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: i < estimate.warnings.length - 1 ? 6 : 0 }}>
                      <AlertTriangle size={13} color="oklch(0.75 0.18 60)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ color: "oklch(0.75 0.18 60)", fontSize: 12, margin: 0 }}>{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cost breakdown */}
              <div>
                <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Cost Breakdown</p>
                {estimate.breakdown.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: i < estimate.breakdown.length - 1 ? "1px solid oklch(0.25 0 0)" : "none" }}>
                    <div>
                      <p style={{ color: "oklch(0.80 0.01 80)", fontSize: 13, margin: 0 }}>{item.label}</p>
                      {item.note && <p style={{ color: "oklch(0.45 0.01 80)", fontSize: 11, margin: "1px 0 0" }}>{item.note}</p>}
                    </div>
                    <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 13, fontWeight: 600, margin: 0, flexShrink: 0, marginLeft: 8 }}>
                      {formatQuoteCents(Math.ceil(item.cost) * 100)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Site Photos ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Site Photos</p>
          {photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative", paddingBottom: "100%", borderRadius: 8, overflow: "hidden" }}>
                  <img src={p.dataUrl} alt={`Site photo ${i + 1}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.7)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={12} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleTakePhoto}
            style={{ width: "100%", backgroundColor: "oklch(0.22 0 0)", border: "2px dashed oklch(0.30 0 0)", borderRadius: 10, padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "oklch(0.60 0.01 80)", fontSize: 14 }}
          >
            <Camera size={20} />
            {photos.length === 0 ? "Take or choose site photos" : "Add another photo"}
          </button>
          {photos.length > 0 && <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 11, margin: "6px 0 0", textAlign: "center" }}>{photos.length} photo{photos.length !== 1 ? "s" : ""} attached</p>}
        </div>

        {/* ── Field Notes ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Field Notes</p>
          <textarea
            value={form.message}
            onChange={set("message")}
            placeholder="Any additional notes about the site, customer requests, or conditions..."
            rows={4}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitState === "submitting"}
          style={{
            width: "100%",
            backgroundColor: submitState === "submitting" ? "oklch(0.40 0 0)" : "oklch(0.65 0.18 50)",
            border: "none", borderRadius: 12, padding: "16px", color: "#000", fontWeight: 700, fontSize: 16,
            cursor: submitState === "submitting" ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8,
          }}
        >
          {submitState === "submitting"
            ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Submitting...</>
            : "Submit Field Quote"
          }
        </button>
      </div>
    </div>
  );
}
