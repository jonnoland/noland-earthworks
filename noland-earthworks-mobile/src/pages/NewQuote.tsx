import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PhotoEntry {
  dataUrl: string; // base64 data URL for preview
  base64: string;  // raw base64 for upload
  mimeType: string;
}

interface FormState {
  // Contact
  name: string;
  email: string;
  phone: string;
  // Site
  address: string;
  lat: number | null;
  lng: number | null;
  // Job details
  serviceType: string;
  acreage: string;
  terrainType: string;
  vegetationDensity: string;
  vegetationTypes: string;
  slopeCondition: string;
  accessCondition: string;
  obstacles: string;
  proximityToStructures: string;
  // Notes
  message: string;
}

const SERVICE_TYPES = [
  "Forestry Mulching",
  "Land Management",
  "Brush Hogging",
  "Right-of-Way Clearing",
  "Site Prep",
  "Fence Line Clearing",
  "Pasture Reclamation",
];

const TERRAIN_TYPES = ["Flat", "Rolling", "Hilly", "Steep", "Mixed"];
const VEGETATION_DENSITY = ["Light", "Moderate", "Heavy", "Very Heavy"];
const SLOPE_CONDITIONS = ["Minimal (<10%)", "Moderate (10-25%)", "Steep (>25%)"];
const ACCESS_CONDITIONS = ["Easy - paved road", "Moderate - dirt/gravel road", "Difficult - no road access", "Very difficult - off-road only"];

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewQuote() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    address: "",
    lat: null,
    lng: null,
    serviceType: "Forestry Mulching",
    acreage: "",
    terrainType: "Flat",
    vegetationDensity: "Moderate",
    vegetationTypes: "",
    slopeCondition: "Minimal (<10%)",
    accessCondition: "Easy - paved road",
    obstacles: "",
    proximityToStructures: "",
    message: "",
  });

  const uploadPhoto = trpc.fieldQuote.uploadPhoto.useMutation();
  const submitQuote = trpc.fieldQuote.submit.useMutation();

  // ─── GPS ────────────────────────────────────────────────────────────────

  const handleGetGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });
      const { latitude, longitude } = pos.coords;

      // Reverse geocode using Google Maps API via the server
      setForm((f) => ({ ...f, lat: latitude, lng: longitude }));

      // Try to get a human-readable address via browser fetch
      try {
        const res = await fetch(
          `/api/trpc/fieldQuote.reverseGeocode?input=${encodeURIComponent(
            JSON.stringify({ lat: latitude, lng: longitude })
          )}`
        );
        const json = await res.json();
        const address = json?.result?.data?.address;
        if (address) {
          setForm((f) => ({ ...f, address }));
        }
      } catch {
        // Address lookup failed — coordinates are still captured
        setForm((f) => ({
          ...f,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
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
        source: CameraSource.Prompt, // Lets user choose camera or gallery
      });

      if (image.base64String) {
        const mimeType = `image/${image.format ?? "jpeg"}`;
        const dataUrl = `data:${mimeType};base64,${image.base64String}`;
        setPhotos((prev) => [
          ...prev,
          { dataUrl, base64: image.base64String!, mimeType },
        ]);
      }
    } catch (err: any) {
      if (err?.message !== "User cancelled photos app") {
        console.error("Camera error:", err);
      }
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setSubmitError("Customer name is required.");
      return;
    }
    if (!form.serviceType) {
      setSubmitError("Service type is required.");
      return;
    }

    setSubmitState("submitting");
    setSubmitError(null);

    try {
      // 1. Upload photos to S3
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const result = await uploadPhoto.mutateAsync({
          base64: photo.base64,
          mimeType: photo.mimeType,
        });
        photoUrls.push(result.url);
      }

      // 2. Submit the quote
      await submitQuote.mutateAsync({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        lat: form.lat ?? undefined,
        lng: form.lng ?? undefined,
        serviceType: form.serviceType,
        acreage: form.acreage ? parseFloat(form.acreage) : undefined,
        terrainType: form.terrainType || undefined,
        vegetationDensity: form.vegetationDensity || undefined,
        vegetationTypes: form.vegetationTypes || undefined,
        slopeCondition: form.slopeCondition || undefined,
        accessCondition: form.accessCondition || undefined,
        obstacles: form.obstacles || undefined,
        proximityToStructures: form.proximityToStructures || undefined,
        message: form.message || undefined,
        photoUrls,
        source: "field_app",
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
          The quote is now in the ops dashboard and will be AI-scored automatically.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "oklch(0.65 0.18 50)",
            border: "none",
            borderRadius: 12,
            padding: "14px 32px",
            color: "#000",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
        <button
          onClick={() => {
            setSubmitState("idle");
            setPhotos([]);
            setForm({
              name: "", email: "", phone: "", address: "", lat: null, lng: null,
              serviceType: "Forestry Mulching", acreage: "", terrainType: "Flat",
              vegetationDensity: "Moderate", vegetationTypes: "", slopeCondition: "Minimal (<10%)",
              accessCondition: "Easy - paved road", obstacles: "", proximityToStructures: "", message: "",
            });
          }}
          style={{
            marginTop: 12,
            background: "none",
            border: "none",
            color: "oklch(0.65 0.18 50)",
            fontSize: 15,
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          Submit another quote
        </button>
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "oklch(0.20 0 0)",
    border: "1px solid oklch(0.25 0 0)",
    borderRadius: 10,
    padding: "12px 14px",
    color: "oklch(0.94 0.01 80)",
    fontSize: 15,
    outline: "none",
    marginTop: 6,
  };

  const labelStyle: React.CSSProperties = {
    color: "oklch(0.70 0.01 80)",
    fontSize: 13,
    fontWeight: 500,
    display: "block",
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "oklch(0.18 0 0)",
    border: "1px solid oklch(0.25 0 0)",
    borderRadius: 14,
    padding: "16px",
    marginBottom: 16,
  };

  const sectionTitle: React.CSSProperties = {
    color: "oklch(0.65 0.18 50)",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 14,
  };

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
              backgroundColor: submitState === "submitting" ? "oklch(0.40 0 0)" : "oklch(0.65 0.18 50)",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
              cursor: submitState === "submitting" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
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

        {/* ── Contact ── */}
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
            <div style={{ position: "relative" }}>
              <input
                value={form.address}
                onChange={set("address")}
                placeholder="Street address or description"
                style={{ ...inputStyle, paddingRight: 48 }}
              />
              <button
                onClick={handleGetGPS}
                disabled={gpsLoading}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: gpsLoading ? "not-allowed" : "pointer",
                  padding: 4,
                  marginTop: 3,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {gpsLoading ? (
                  <Loader2 size={18} color="oklch(0.65 0.18 50)" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <MapPin size={18} color={form.lat ? "oklch(0.65 0.18 50)" : "oklch(0.50 0.01 80)"} />
                )}
              </button>
            </div>
            {form.lat && (
              <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 11, margin: "4px 0 0" }}>
                GPS: {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
              </p>
            )}
            {gpsError && (
              <p style={{ color: "oklch(0.65 0.20 25)", fontSize: 11, margin: "4px 0 0" }}>{gpsError}</p>
            )}
          </div>
        </div>

        {/* ── Job Details ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Job Details</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Service Type *</label>
              <div style={{ position: "relative" }}>
                <select value={form.serviceType} onChange={set("serviceType")} style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}>
                  {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Estimated Acreage</label>
              <input value={form.acreage} onChange={set("acreage")} placeholder="e.g. 5.5" type="number" inputMode="decimal" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Terrain</label>
                <div style={{ position: "relative" }}>
                  <select value={form.terrainType} onChange={set("terrainType")} style={{ ...inputStyle, appearance: "none", paddingRight: 28 }}>
                    {TERRAIN_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Vegetation Density</label>
                <div style={{ position: "relative" }}>
                  <select value={form.vegetationDensity} onChange={set("vegetationDensity")} style={{ ...inputStyle, appearance: "none", paddingRight: 28 }}>
                    {VEGETATION_DENSITY.map((v) => <option key={v}>{v}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Vegetation Types</label>
              <input value={form.vegetationTypes} onChange={set("vegetationTypes")} placeholder="e.g. cedar, honeysuckle, briars" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Slope</label>
              <div style={{ position: "relative" }}>
                <select value={form.slopeCondition} onChange={set("slopeCondition")} style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}>
                  {SLOPE_CONDITIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Site Access</label>
              <div style={{ position: "relative" }}>
                <select value={form.accessCondition} onChange={set("accessCondition")} style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}>
                  {ACCESS_CONDITIONS.map((a) => <option key={a}>{a}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-25%)", color: "oklch(0.50 0.01 80)", pointerEvents: "none" }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Obstacles (stumps, rock, water, fencing)</label>
              <input value={form.obstacles} onChange={set("obstacles")} placeholder="Describe any obstacles on site" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Proximity to Structures / Utilities</label>
              <input value={form.proximityToStructures} onChange={set("proximityToStructures")} placeholder="e.g. 20ft from fence, near power line" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* ── Site Photos ── */}
        <div style={sectionStyle}>
          <p style={sectionTitle}>Site Photos</p>

          {/* Photo grid */}
          {photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative", paddingBottom: "100%", borderRadius: 8, overflow: "hidden" }}>
                  <img
                    src={p.dataUrl}
                    alt={`Site photo ${i + 1}`}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "rgba(0,0,0,0.7)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X size={12} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleTakePhoto}
            style={{
              width: "100%",
              backgroundColor: "oklch(0.22 0 0)",
              border: "2px dashed oklch(0.30 0 0)",
              borderRadius: 10,
              padding: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "oklch(0.60 0.01 80)",
              fontSize: 14,
            }}
          >
            <Camera size={20} />
            {photos.length === 0 ? "Take or choose site photos" : "Add another photo"}
          </button>
          {photos.length > 0 && (
            <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 11, margin: "6px 0 0", textAlign: "center" }}>
              {photos.length} photo{photos.length !== 1 ? "s" : ""} attached
            </p>
          )}
        </div>

        {/* ── Notes ── */}
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

        {/* Submit button (bottom) */}
        <button
          onClick={handleSubmit}
          disabled={submitState === "submitting"}
          style={{
            width: "100%",
            backgroundColor: submitState === "submitting" ? "oklch(0.40 0 0)" : "oklch(0.65 0.18 50)",
            border: "none",
            borderRadius: 12,
            padding: "16px",
            color: "#000",
            fontWeight: 700,
            fontSize: 16,
            cursor: submitState === "submitting" ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {submitState === "submitting" ? (
            <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Submitting...</>
          ) : "Submit Field Quote"}
        </button>
      </div>
    </div>
  );
}
