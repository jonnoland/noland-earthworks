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
} from "lucide-react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { isServedCounty, normalizeCountyName } from "@/lib/serviceAreas";
import { enqueueOfflineFieldQuote } from "@/lib/offlineFieldQuoteQueue";
import { useNetwork } from "@/hooks/useNetwork";

// ─── SiteMapPreview ──────────────────────────────────────────────────────────

/**
 * InteractiveMapPreview — Google Maps iframe with a draggable orange marker.
 * The iframe loads the Maps JS API through the live server proxy so no key is
 * exposed. When the user drags the pin, the iframe posts the new lat/lng back
 * via postMessage and the parent updates form state.
 */
function InteractiveMapPreview({
  lat, lng, onPinMoved,
}: {
  lat: number;
  lng: number;
  onPinMoved: (lat: number, lng: number) => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const SERVER_BASE = "https://nolandearth-pymczdcn.manus.space";

  // Build the srcdoc for the iframe — loads Maps JS from our proxy, drops a
  // draggable AdvancedMarkerElement at the given coordinates.
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
      script.src = '${SERVER_BASE}/api/maps/js?v=weekly&libraries=marker&loading=async';
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
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: center,
        gmpDraggable: true,
        title: 'Drag to adjust location',
      });
      marker.addListener('dragend', function() {
        const pos = marker.position;
        const newLat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
        const newLng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
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
  lat: number | null;
  lng: number | null;
  // Job details — core
  serviceType: string;
  acreage: string;
  linearFeet: string;
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
  estimatedHours: number;
  estimatedDays: number;
  totalInternalCost: number;
  customerPriceLow: number;
  customerPriceHigh: number;
  marginPct: number;
  summary: string;
  warnings: string[];
  breakdown: { label: string; cost: number; note?: string }[];
}

// ─── Option lists (matching website CostEstimator exactly) ──────────────────

const SERVICE_TYPES = [
  "Forestry Mulching",
  "Land Management",
  "Vegetation Management",
  "Right-of-Way Clearing",
  "Trail Cutting",
  "Brush Hogging",
  "Stump Grinding",
];

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

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    county: "",
    zip: "",
    lat: null,
    lng: null,
    serviceType: "Forestry Mulching",
    acreage: "",
    linearFeet: "",
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
  const uploadPhoto = trpc.fieldQuote.uploadPhoto.useMutation();
  const submitQuote = trpc.fieldQuote.submit.useMutation();
  const getEstimate = trpc.fieldQuote.estimate.useMutation({
    onSuccess: (data) => setEstimate(data as EstimateResult),
    onError: (err) => setEstimateError(err.message || "AI estimate failed."),
  });

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
  const recognitionRef = useRef<any>(null);

  const parseVoiceBid = trpc.ops.parseVoiceBid.useMutation({
    onSuccess: (data) => setVoiceResult(data),
    onError: () => alert("Voice parse failed. Try again."),
  });

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported in this browser. Use Chrome or Safari."); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => { setVoiceListening(false); alert("Microphone error. Check browser permissions."); };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any).map((r: any) => r[0].transcript).join(" ");
      setVoiceTranscript(transcript);
      parseVoiceBid.mutate({ transcript });
    };
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceOpen(true);
    setVoiceResult(null);
    setVoiceTranscript("");
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

  // Track whether the address was set programmatically (GPS / autocomplete / pin drag)
  // so we don't trigger forward-geocode in those cases.
  const skipForwardGeocode = React.useRef(false);
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

  const handleGetEstimate = () => {
    if (!form.serviceType) return;
    setEstimate(null);
    setEstimateError(null);
    const acreage = parseFloat(form.acreage);
    const linearFeet = parseFloat(form.linearFeet);
    const mobilizationMiles = parseFloat(form.mobilizationMiles) || 0;
    const stumpCount = parseInt(form.stumpCount) || 0;
    const trailWidth = parseFloat(form.trailWidth);
    const rowWidth = parseFloat(form.rowWidth);
    const fenceLineLF = parseFloat(form.fenceLineLF);

    getEstimate.mutate({
      service: form.serviceType,
      acreage: isNaN(acreage) ? undefined : acreage,
      linearFeet: isNaN(linearFeet) ? undefined : linearFeet,
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
    });
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim()) { setSubmitError("Customer name is required."); return; }
    if (!form.serviceType) { setSubmitError("Service type is required."); return; }

    setSubmitState("submitting");
    setSubmitError(null);

    const acreage = parseFloat(form.acreage);
    const submission = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      lat: form.lat ?? undefined,
      lng: form.lng ?? undefined,
      serviceType: form.serviceType,
      acreage: isNaN(acreage) ? undefined : acreage,
      terrainType: form.terrain,
      vegetationDensity: form.vegetationDensity,
      vegetationTypes: form.vegetationTypes || undefined,
      slopeCondition: undefined,
      accessCondition: form.accessDifficulty,
      obstacles: form.obstacles || undefined,
      proximityToStructures: form.proximityToStructures || undefined,
      message: form.message || undefined,
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
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <CheckCircle2 size={64} color="oklch(0.70 0.18 145)" style={{ marginBottom: 20 }} />
        <h2 style={{ color: "oklch(0.94 0.01 80)", fontSize: 22, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>
          Quote Submitted
        </h2>
        <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 15, textAlign: "center", margin: "0 0 32px" }}>
          {queuedOffline ? "This field request is stored on the device and will synchronize to Ops when the app reconnects. Photos are not included in offline requests; add them after reconnecting if needed." : "The quote is now in the ops dashboard and will be AI-scored automatically."}
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
            setForm({
              name: "", email: "", phone: "", address: "", city: "", county: "", zip: "", lat: null, lng: null,
              serviceType: "Forestry Mulching", acreage: "", linearFeet: "",
              terrain: "flat", vegetationDensity: "moderate", accessDifficulty: "easy",
              mobilizationMiles: "0", hasStumps: false, stumpCount: "", trailWidth: "",
              rowWidth: "", fenceLineLF: "", vegetationTypes: "", obstacles: "",
              proximityToStructures: "", message: "",
            });
          }}
          style={{ marginTop: 12, background: "none", border: "none", color: "oklch(0.65 0.18 50)", fontSize: 15, cursor: "pointer", padding: "8px 0" }}
        >
          Submit another quote
        </button>
      </div>
    );
  }

  // ─── Styles ──────────────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
  const isTrail = form.serviceType === "Trail Cutting";

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
          <div style={{ backgroundColor: "oklch(0.65 0.20 25 / 0.15)", border: "1px solid oklch(0.65 0.20 25 / 0.4)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} color="oklch(0.65 0.20 25)" />
            <p style={{ color: "oklch(0.65 0.20 25)", fontSize: 13, margin: 0 }}>{submitError}</p>
          </div>
        )}

        {/* ── Voice Bid Button ── */}
        <button
          onClick={voiceOpen ? stopListening : startListening}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            backgroundColor: voiceListening ? "oklch(0.65 0.20 25 / 0.15)" : "oklch(0.65 0.18 50 / 0.12)",
            border: `1.5px solid ${voiceListening ? "oklch(0.65 0.20 25)" : "oklch(0.65 0.18 50)"}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            color: voiceListening ? "oklch(0.65 0.20 25)" : "oklch(0.65 0.18 50)",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}
        >
          {voiceListening ? <MicOff size={20} /> : <Mic size={20} />}
          {voiceListening ? "Tap to Stop Listening" : "Voice Bid — Speak Job Description"}
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

            {!voiceListening && !voiceTranscript && !voiceResult && (
              <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 13, margin: 0 }}>Tap the mic button above and describe the job — service type, acreage, terrain, vegetation, access, and how far out the site is.</p>
            )}
          </div>
        )}

        {/* ── Customer Info ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Customer Info</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

            {/* Acreage — always shown unless ROW with LF */}
            {!isROW && (
              <div>
                <label style={labelStyle}>{isTrail ? "Effective Acreage (length × width ÷ 43,560)" : "Estimated Acreage"}</label>
                <input value={form.acreage} onChange={set("acreage")} placeholder="e.g. 5.5" type="number" inputMode="decimal" style={inputStyle} />
              </div>
            )}

            {/* ROW-specific: linear feet + width */}
            {isROW && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Linear Feet</label>
                  <input value={form.linearFeet} onChange={set("linearFeet")} placeholder="e.g. 2000" type="number" inputMode="numeric" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>ROW Width (ft)</label>
                  <input value={form.rowWidth} onChange={set("rowWidth")} placeholder="e.g. 30" type="number" inputMode="numeric" style={inputStyle} />
                </div>
              </div>
            )}

            {/* Trail-specific: trail width */}
            {isTrail && (
              <div>
                <label style={labelStyle}>Trail Width (ft)</label>
                <input value={form.trailWidth} onChange={set("trailWidth")} placeholder="e.g. 10" type="number" inputMode="numeric" style={inputStyle} />
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

            {/* Fence line */}
            <div>
              <label style={labelStyle}>Fence Line Clearing (linear feet, optional)</label>
              <input value={form.fenceLineLF} onChange={set("fenceLineLF")} placeholder="e.g. 500" type="number" inputMode="numeric" style={inputStyle} />
            </div>

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

          <button
            onClick={handleGetEstimate}
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
                    ${estimate.customerPriceLow.toLocaleString()} – ${estimate.customerPriceHigh.toLocaleString()}
                  </p>
                </div>
                <div style={{ backgroundColor: "oklch(0.22 0 0)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <Clock size={16} color="oklch(0.65 0.18 50)" style={{ margin: "0 auto 4px" }} />
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "0 0 2px" }}>Est. Days</p>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {estimate.estimatedDays.toFixed(1)}
                  </p>
                </div>
                <div style={{ backgroundColor: "oklch(0.22 0 0)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "0 0 2px" }}>Margin</p>
                  <p style={{ color: "oklch(0.94 0.01 80)", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {estimate.marginPct.toFixed(0)}%
                  </p>
                  <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 10, margin: "2px 0 0" }}>
                    Cost: ${estimate.totalInternalCost.toLocaleString()}
                  </p>
                </div>
              </div>

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
                      ${item.cost.toLocaleString()}
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
