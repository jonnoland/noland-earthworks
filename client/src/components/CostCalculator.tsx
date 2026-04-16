/*
 * CostCalculator — interactive rough-estimate widget for the Pricing page
 * Inputs: service type, acreage (slider or map polygon), vegetation density,
 *         terrain difficulty, site access
 * Outputs: low/high estimate range, per-acre breakdown, completion time,
 *          map polygon acreage tool, submit-as-lead form
 */
import { useState, useMemo, useRef, useCallback } from "react";
import { Calculator, ChevronRight, Info, Map, X, Send, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

/* ─── Pricing model ─────────────────────────────────────────────────── */

const BASE_RATES: Record<string, Record<string, [number, number]>> = {
  "forestry-mulching": {
    light:    [1000, 1500],
    moderate: [1500, 2500],
    heavy:    [2500, 4500],
  },
  "land-clearing": {
    light:    [1500, 3000],
    moderate: [3000, 6000],
    heavy:    [6000, 12000],
  },
  "vegetation-management": {
    light:    [150, 400],
    moderate: [400, 900],
    heavy:    [900, 2000],
  },
  "property-maintenance": {
    light:    [150, 400],
    moderate: [400, 900],
    heavy:    [900, 2000],
  },
  "right-of-way-clearing": {
    light:    [1200, 2800],
    moderate: [1800, 3500],
    heavy:    [2800, 5500],
  },
};

const TERRAIN_MULT: Record<string, number> = {
  flat: 1.0,
  rolling: 1.1,
  steep: 1.25,
};

const ACCESS_MULT: Record<string, number> = {
  easy: 1.0,
  moderate: 1.08,
  difficult: 1.18,
};

function volumeDiscount(acres: number): number {
  if (acres >= 10) return 0.88;
  if (acres >= 5)  return 0.93;
  if (acres >= 3)  return 0.97;
  return 1.0;
}

const MOBILIZATION = 350;
const MIN_JOB = 1800;

const BASE_ACRES_PER_DAY: Record<string, number> = {
  "forestry-mulching":     1.5,
  "land-clearing":         1.0,
  "vegetation-management": 2.0,
  "property-maintenance":  2.0,
  "right-of-way-clearing": 1.25,
};

const DENSITY_PROD_MULT: Record<string, number> = {
  light:    1.4,
  moderate: 1.0,
  heavy:    0.6,
};

const TERRAIN_PROD_MULT: Record<string, number> = {
  flat:    1.0,
  rolling: 0.85,
  steep:   0.65,
};

/* ─── Types ─────────────────────────────────────────────────────────── */

interface CalcState {
  service: string;
  acres: number;
  density: string;
  terrain: string;
  access: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function calcEstimate(s: CalcState): { low: number; high: number; perAcreLow: number; perAcreHigh: number } | null {
  const base = BASE_RATES[s.service]?.[s.density];
  if (!base) return null;
  const tm = TERRAIN_MULT[s.terrain] ?? 1;
  const am = ACCESS_MULT[s.access] ?? 1;
  const vd = volumeDiscount(s.acres);
  const perAcreLow  = Math.round(base[0] * tm * am * vd);
  const perAcreHigh = Math.round(base[1] * tm * am * vd);
  const raw_low  = perAcreLow  * s.acres + MOBILIZATION;
  const raw_high = perAcreHigh * s.acres + MOBILIZATION;
  const low  = Math.max(MIN_JOB, Math.round(raw_low  / 50) * 50);
  const high = Math.max(MIN_JOB, Math.round(raw_high / 50) * 50);
  return { low, high, perAcreLow, perAcreHigh };
}

function calcCompletionTime(s: CalcState): { low: string; high: string; days: number } | null {
  const baseApd = BASE_ACRES_PER_DAY[s.service];
  if (!baseApd) return null;
  const dm = DENSITY_PROD_MULT[s.density] ?? 1;
  const tm = TERRAIN_PROD_MULT[s.terrain] ?? 1;
  const acresPerDay = baseApd * dm * tm;
  const rawDays = s.acres / acresPerDay;
  if (rawDays < 0.5) return { low: "2–4 hours", high: "half a day", days: rawDays };
  if (rawDays < 1)   return { low: "half a day", high: "1 day", days: rawDays };
  if (rawDays <= 1.5) return { low: "1 day", high: "1–2 days", days: rawDays };
  if (rawDays <= 2.5) return { low: "1–2 days", high: "2–3 days", days: rawDays };
  if (rawDays <= 4)   return { low: "2–3 days", high: "3–4 days", days: rawDays };
  if (rawDays <= 6)   return { low: "3–5 days", high: "5–7 days", days: rawDays };
  if (rawDays <= 10)  return { low: "1–2 weeks", high: "2 weeks", days: rawDays };
  const weeks = Math.ceil(rawDays / 5);
  return { low: `${weeks}–${weeks + 1} weeks`, high: `${weeks + 1}+ weeks`, days: rawDays };
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function SelectRow({
  label, hint, value, onChange, options,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{
        display: "block", fontFamily: "'Oswald', sans-serif", fontWeight: 500,
        fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(240,237,230,0.7)", marginBottom: "0.4rem",
      }}>
        {label}
        {hint && (
          <span title={hint} style={{ marginLeft: "0.4rem", cursor: "help", verticalAlign: "middle" }}>
            <Info size={11} style={{ color: "rgba(224,123,42,0.5)", display: "inline" }} />
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "0.65rem 0.9rem", backgroundColor: "#111",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px",
          color: "#F0EDE6", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem",
          cursor: "pointer", appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23E07B2A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 0.85rem center",
          paddingRight: "2.25rem", outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(224,123,42,0.5)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: "#1a1a1a" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AcreSlider({ value, onChange, isRow, onOpenMap }: {
  value: number; onChange: (v: number) => void; isRow?: boolean; onOpenMap: () => void;
}) {
  const steps = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50];
  const idx = steps.indexOf(value);
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: "0.8rem",
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(240,237,230,0.7)", marginBottom: "0.4rem",
      }}>
        <span>{isRow ? "Corridor Acreage" : "Acreage"}</span>
        <span style={{ color: "#E07B2A", fontSize: "1rem", fontWeight: 700 }}>
          {value} {value === 1 ? "acre" : "acres"}
        </span>
      </label>
      <input
        type="range" min={0} max={steps.length - 1} step={1}
        value={idx === -1 ? 3 : idx}
        onChange={(e) => onChange(steps[Number(e.target.value)])}
        style={{ width: "100%", accentColor: "#E07B2A", cursor: "pointer" }}
      />
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "'Lato', sans-serif", fontSize: "0.65rem",
        color: "rgba(240,237,230,0.3)", marginTop: "0.2rem",
      }}>
        <span>½ acre</span>
        <span>5 acres</span>
        <span>10 acres</span>
        <span>50 acres</span>
      </div>
      {/* Map tool button */}
      <button
        onClick={onOpenMap}
        style={{
          marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem",
          background: "none", border: "1px solid rgba(224,123,42,0.3)", borderRadius: "4px",
          padding: "0.4rem 0.75rem", cursor: "pointer", color: "#E07B2A",
          fontFamily: "'Lato', sans-serif", fontSize: "0.78rem",
          transition: "border-color 0.2s, background 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(224,123,42,0.7)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(224,123,42,0.07)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(224,123,42,0.3)";
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        <Map size={13} />
        Draw your parcel on a map
      </button>
    </div>
  );
}

/* ─── Map Polygon Modal ─────────────────────────────────────────────── */

// Extend Window for Maps script singleton
declare global {
  interface Window {
    _mapsScriptPromise?: Promise<void>;
  }
}

function loadMapScript(): Promise<void> {
  if (window._mapsScriptPromise) return window._mapsScriptPromise;
  window._mapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-maps-proxy]');
    if (existing) { resolve(); return; }
    const s = document.createElement("script");
    s.src = `/api/maps/js?v=weekly&libraries=drawing,geometry`;
    s.async = true;
    s.setAttribute("data-maps-proxy", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Maps script failed to load"));
    document.head.appendChild(s);
  });
  return window._mapsScriptPromise;
}

function MapPolygonModal({ onClose, onAcreageConfirm }: {
  onClose: () => void;
  onAcreageConfirm: (acres: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawnAcres, setDrawnAcres] = useState<number | null>(null);
  const polygonRef = useRef<unknown>(null);
  const drawingMgrRef = useRef<unknown>(null);

  const initMap = useCallback(async () => {
    try {
      await loadMapScript();
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const G = (window as any).google.maps;
      const map = new G.Map(mapRef.current, {
        center: { lat: 36.0, lng: -87.3 }, // Middle Tennessee
        zoom: 12,
        mapTypeId: "hybrid",
        mapId: "noland-calc-map",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const drawingManager = new G.drawing.DrawingManager({
        drawingMode: G.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: G.ControlPosition.TOP_CENTER,
          drawingModes: [G.drawing.OverlayType.POLYGON],
        },
        polygonOptions: {
          fillColor: "#E07B2A",
          fillOpacity: 0.25,
          strokeColor: "#E07B2A",
          strokeWeight: 2,
          editable: true,
          draggable: true,
        },
      });
      drawingManager.setMap(map);
      drawingMgrRef.current = drawingManager;

      G.event.addListener(drawingManager, "polygoncomplete", (polygon: unknown) => {
        // Remove previous polygon
        if (polygonRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (polygonRef.current as any).setMap(null);
        }
        polygonRef.current = polygon;
        drawingManager.setDrawingMode(null);

        const computeArea = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const path = (polygon as any).getPath();
          const sqMeters = G.geometry.spherical.computeArea(path);
          const acres = sqMeters / 4046.856;
          setDrawnAcres(Math.round(acres * 100) / 100);
        };
        computeArea();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        G.event.addListener((polygon as any).getPath(), "set_at", computeArea);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        G.event.addListener((polygon as any).getPath(), "insert_at", computeArea);
      });

      setLoading(false);
    } catch (err) {
      setError("Map failed to load. Please enter acreage manually.");
      setLoading(false);
    }
  }, []);

  // Init on mount
  useState(() => { initMap(); });

  const handleConfirm = () => {
    if (drawnAcres === null) return;
    // Snap to nearest slider step
    const steps = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50];
    const snapped = steps.reduce((prev, curr) =>
      Math.abs(curr - drawnAcres) < Math.abs(prev - drawnAcres) ? curr : prev
    );
    onAcreageConfirm(snapped);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#1a1a1a", borderRadius: "8px", overflow: "hidden",
        width: "100%", maxWidth: "720px",
        border: "1px solid rgba(224,123,42,0.3)",
        display: "flex", flexDirection: "column",
        maxHeight: "90vh",
      }}>
        {/* Modal header */}
        <div style={{
          padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Map size={16} style={{ color: "#E07B2A" }} />
            <span style={{
              fontFamily: "'Oswald', sans-serif", fontWeight: 600,
              fontSize: "1rem", color: "#F0EDE6",
            }}>
              Draw Your Parcel
            </span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(240,237,230,0.5)", padding: "0.25rem",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          padding: "0.6rem 1.25rem",
          backgroundColor: "rgba(224,123,42,0.07)",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
        }}>
          <p style={{
            fontFamily: "'Lato', sans-serif", fontSize: "0.8rem",
            color: "rgba(240,237,230,0.65)", margin: 0,
          }}>
            Use the polygon tool to trace your property boundary. Click to add points, double-click to close the shape. Drag points to adjust.
          </p>
        </div>

        {/* Map container */}
        <div style={{ position: "relative", flex: 1, minHeight: "380px" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "380px" }} />
          {loading && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              backgroundColor: "#111",
            }}>
              <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.4)" }}>
                Loading map...
              </p>
            </div>
          )}
          {error && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              backgroundColor: "#111", padding: "2rem",
            }}>
              <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.5)", textAlign: "center" }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
        }}>
          <div>
            {drawnAcres !== null ? (
              <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#E07B2A", margin: 0 }}>
                {drawnAcres} acres drawn
                <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400, fontSize: "0.75rem", color: "rgba(240,237,230,0.4)", marginLeft: "0.5rem" }}>
                  (will snap to nearest slider step)
                </span>
              </p>
            ) : (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "rgba(240,237,230,0.4)", margin: 0 }}>
                No polygon drawn yet
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.65rem" }}>
            <button onClick={onClose} style={{
              padding: "0.55rem 1rem", background: "none",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
              color: "rgba(240,237,230,0.6)", cursor: "pointer",
              fontFamily: "'Oswald', sans-serif", fontSize: "0.8rem",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={drawnAcres === null}
              style={{
                padding: "0.55rem 1.25rem",
                backgroundColor: drawnAcres !== null ? "#E07B2A" : "rgba(224,123,42,0.3)",
                border: "none", borderRadius: "4px",
                color: drawnAcres !== null ? "#121212" : "rgba(240,237,230,0.3)",
                cursor: drawnAcres !== null ? "pointer" : "not-allowed",
                fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              Use This Acreage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Submit as Lead Modal ──────────────────────────────────────────── */

function SubmitLeadModal({ state, result, onClose }: {
  state: CalcState;
  result: { low: number; high: number };
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.widget.submitEstimate.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    submitMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      service: state.service,
      acres: state.acres,
      density: state.density,
      terrain: state.terrain,
      access: state.access,
      estimateLow: result.low,
      estimateHigh: result.high,
      message: message.trim() || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem", backgroundColor: "#111",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px",
    color: "#F0EDE6", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "'Oswald', sans-serif", fontWeight: 500,
    fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase",
    color: "rgba(240,237,230,0.6)", marginBottom: "0.35rem",
  };

  const SERVICE_LABELS: Record<string, string> = {
    "forestry-mulching": "Forestry Mulching",
    "land-clearing": "Land Clearing",
    "vegetation-management": "Vegetation Management",
    "right-of-way-clearing": "Right-of-Way Clearing",
    "property-maintenance": "Property Maintenance",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#1a1a1a", borderRadius: "8px", overflow: "hidden",
        width: "100%", maxWidth: "480px",
        border: "1px solid rgba(224,123,42,0.3)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Send size={16} style={{ color: "#E07B2A" }} />
            <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0EDE6" }}>
              Request a Free On-Site Estimate
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,237,230,0.5)", padding: "0.25rem" }}>
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
            <Check size={40} style={{ color: "#4ade80", margin: "0 auto 1rem" }} />
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#F0EDE6", marginBottom: "0.5rem" }}>
              Request Received
            </h3>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.9rem", color: "rgba(240,237,230,0.6)", lineHeight: 1.6 }}>
              Jon will follow up with you — usually same day or next morning. No obligation, no pressure.
            </p>
            <button onClick={onClose} style={{
              marginTop: "1.5rem", padding: "0.65rem 1.5rem",
              backgroundColor: "#E07B2A", border: "none", borderRadius: "4px",
              color: "#121212", fontFamily: "'Oswald', sans-serif", fontWeight: 700,
              fontSize: "0.85rem", letterSpacing: "0.06em", textTransform: "uppercase",
              cursor: "pointer",
            }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
            {/* Estimate summary */}
            <div style={{
              backgroundColor: "rgba(224,123,42,0.07)",
              border: "1px solid rgba(224,123,42,0.2)",
              borderRadius: "4px", padding: "0.75rem 1rem", marginBottom: "1.5rem",
            }}>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Your Rough Estimate
              </p>
              <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "#E07B2A", margin: "0 0 0.2rem" }}>
                {fmt(result.low)} – {fmt(result.high)}
              </p>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.4)", margin: 0 }}>
                {SERVICE_LABELS[state.service] ?? state.service} · {state.acres} acres · {state.density} density · {state.terrain} terrain
              </p>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Name <span style={{ color: "#E07B2A" }}>*</span></label>
              <input
                required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your full name" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(224,123,42,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Phone <span style={{ color: "#E07B2A" }}>*</span></label>
              <input
                required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="615-000-0000" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(224,123,42,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Email <span style={{ color: "rgba(240,237,230,0.3)" }}>(optional)</span></label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(224,123,42,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Anything else we should know? <span style={{ color: "rgba(240,237,230,0.3)" }}>(optional)</span></label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Property location, access notes, timeline, questions..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(224,123,42,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>

            {submitMutation.isError && (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "#f87171", marginBottom: "1rem" }}>
                Something went wrong. Please call 615-406-4819 directly.
              </p>
            )}

            <button
              type="submit"
              disabled={submitMutation.isPending || !name.trim() || !phone.trim()}
              style={{
                width: "100%", padding: "0.8rem",
                backgroundColor: submitMutation.isPending ? "rgba(224,123,42,0.5)" : "#E07B2A",
                border: "none", borderRadius: "4px",
                color: "#121212", fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                fontSize: "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: submitMutation.isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              }}
            >
              {submitMutation.isPending ? "Sending..." : "Send My Estimate Request"}
              {!submitMutation.isPending && <ChevronRight size={15} />}
            </button>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: "rgba(240,237,230,0.3)", textAlign: "center", marginTop: "0.75rem" }}>
              No commitment required. Jon will follow up same day or next morning.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export default function CostCalculator() {
  const [state, setState] = useState<CalcState>({
    service: "forestry-mulching",
    acres: 2,
    density: "moderate",
    terrain: "flat",
    access: "easy",
  });
  const [showMap, setShowMap] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const result = useMemo(() => calcEstimate(state), [state]);
  const timeResult = useMemo(() => calcCompletionTime(state), [state]);

  const set = (key: keyof CalcState) => (val: string | number) =>
    setState((prev) => ({ ...prev, [key]: val }));

  const serviceOptions = [
    { value: "forestry-mulching",      label: "Forestry Mulching" },
    { value: "land-clearing",          label: "Land Clearing" },
    { value: "vegetation-management",  label: "Vegetation Management" },
    { value: "right-of-way-clearing",  label: "Right-of-Way Clearing" },
    { value: "property-maintenance",   label: "Property Maintenance" },
  ];

  const densityOptions = [
    { value: "light",    label: "Light — thin brush, saplings, open canopy" },
    { value: "moderate", label: "Moderate — mixed brush, trees up to 8″" },
    { value: "heavy",    label: "Heavy — dense timber, thick cedar, mature hardwoods" },
  ];

  const terrainOptions = [
    { value: "flat",    label: "Flat / gently rolling" },
    { value: "rolling", label: "Moderate slope (10–25°)" },
    { value: "steep",   label: "Steep / wet / rocky (25°+)" },
  ];

  const accessOptions = [
    { value: "easy",     label: "Easy — wide gate, gravel drive, clear staging" },
    { value: "moderate", label: "Moderate — some access challenges" },
    { value: "difficult", label: "Difficult — narrow gate, soft ground, long haul" },
  ];

  const isMinJob = result ? result.low === MIN_JOB : false;

  return (
    <>
      <div style={{
        backgroundColor: "#1a1a1a", border: "1px solid rgba(224,123,42,0.25)",
        borderRadius: "8px", overflow: "hidden", maxWidth: "860px", margin: "0 auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 2rem",
          background: "linear-gradient(90deg, rgba(224,123,42,0.12) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <Calculator size={20} style={{ color: "#E07B2A", flexShrink: 0 }} />
          <div>
            <h3 style={{
              fontFamily: "'Oswald', sans-serif", fontWeight: 700,
              fontSize: "1.15rem", color: "#F0EDE6", margin: 0, letterSpacing: "0.03em",
            }}>
              Rough Estimate Calculator
            </h3>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: "rgba(240,237,230,0.5)", margin: 0 }}>
              Ballpark figures only — every property is different. Get a free on-site estimate for an exact number.
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "0",
        }}>
          {/* Inputs */}
          <div style={{ padding: "1.75rem 2rem", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <SelectRow
              label="Service Type"
              value={state.service}
              onChange={set("service")}
              options={serviceOptions}
            />
            <AcreSlider
              value={state.acres}
              onChange={(v) => set("acres")(v)}
              isRow={state.service === "right-of-way-clearing"}
              onOpenMap={() => setShowMap(true)}
            />
            <SelectRow
              label={state.service === "right-of-way-clearing" ? "Corridor Condition" : "Vegetation Density"}
              hint={state.service === "right-of-way-clearing"
                ? "Light = recently maintained or new corridor; Heavy = years of neglect, mature trees"
                : "The biggest cost driver — how thick and tall is the growth?"}
              value={state.density}
              onChange={set("density")}
              options={state.service === "right-of-way-clearing" ? [
                { value: "light",    label: "Light — recently cleared or maintained corridor" },
                { value: "moderate", label: "Moderate — established brush, trees up to 8\u2033 diameter" },
                { value: "heavy",    label: "Heavy — overgrown, mature trees encroaching, years of neglect" },
              ] : densityOptions}
            />
            <SelectRow
              label="Terrain"
              hint="Steeper slopes and wet ground slow equipment"
              value={state.terrain}
              onChange={set("terrain")}
              options={terrainOptions}
            />
            <SelectRow
              label="Site Access"
              hint="Gate width, driveway condition, distance from road"
              value={state.access}
              onChange={set("access")}
              options={accessOptions}
            />
          </div>

          {/* Result panel */}
          <div style={{
            padding: "1.75rem 2rem", display: "flex",
            flexDirection: "column", justifyContent: "space-between", gap: "1.5rem",
          }}>
            {result ? (
              <>
                <div>
                  {/* Estimate range */}
                  <p style={{
                    fontFamily: "'Oswald', sans-serif", fontWeight: 500,
                    fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase",
                    color: "rgba(240,237,230,0.45)", marginBottom: "0.5rem",
                  }}>
                    Estimated Total
                  </p>
                  <div style={{
                    fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                    fontSize: "clamp(2rem, 5vw, 2.75rem)", color: "#E07B2A",
                    lineHeight: 1, marginBottom: "0.35rem",
                  }}>
                    {fmt(result.low)} – {fmt(result.high)}
                  </div>
                  {isMinJob && (
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", marginBottom: "0.75rem" }}>
                      Minimum job rate applied ($1,800)
                    </p>
                  )}

                  {/* Per-acre breakdown */}
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                    <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "4px", padding: "0.6rem 0.9rem", flex: 1, minWidth: "120px" }}>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", color: "rgba(240,237,230,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.2rem" }}>Per Acre</p>
                      <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0EDE6", margin: 0 }}>
                        {fmt(result.perAcreLow)} – {fmt(result.perAcreHigh)}
                      </p>
                    </div>
                    <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "4px", padding: "0.6rem 0.9rem", flex: 1, minWidth: "120px" }}>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", color: "rgba(240,237,230,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.2rem" }}>Mobilization</p>
                      <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0EDE6", margin: 0 }}>
                        {fmt(MOBILIZATION)} (included)
                      </p>
                    </div>
                  </div>

                  {/* Completion time */}
                  {timeResult && (
                    <div style={{
                      backgroundColor: "rgba(224,123,42,0.07)", border: "1px solid rgba(224,123,42,0.2)",
                      borderRadius: "4px", padding: "0.85rem 1rem", marginBottom: "1.25rem",
                      display: "flex", alignItems: "center", gap: "0.75rem",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E07B2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <div>
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", color: "rgba(240,237,230,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.15rem" }}>Estimated Completion Time</p>
                        <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#E07B2A", margin: 0 }}>
                          {timeResult.low === timeResult.high ? timeResult.low : `${timeResult.low} – ${timeResult.high}`}
                        </p>
                        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: "rgba(240,237,230,0.35)", margin: "0.2rem 0 0" }}>
                          Based on {state.acres} {state.acres === 1 ? "acre" : "acres"} · {state.density} density · {state.terrain} terrain
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p style={{
                    fontFamily: "'Lato', sans-serif", fontSize: "0.75rem",
                    color: "rgba(240,237,230,0.35)", lineHeight: 1.6,
                    borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.85rem",
                  }}>
                    This is a rough ballpark based on typical Middle & West TN rates. Actual pricing depends on a site visit. Debris disposal, stump count, and unusual terrain may affect the final number.
                  </p>
                </div>

                {/* CTA */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {/* Submit as lead — primary CTA */}
                  <button
                    onClick={() => setShowLeadForm(true)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "0.4rem", padding: "0.8rem 1.5rem",
                      backgroundColor: "#E07B2A", border: "none", borderRadius: "4px",
                      color: "#121212", cursor: "pointer",
                      fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                      fontSize: "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase",
                    }}
                  >
                    <Send size={14} />
                    Request a Free On-Site Estimate
                  </button>
                  <a
                    href="tel:6154064819"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "0.4rem", padding: "0.7rem 1.5rem",
                      border: "1px solid rgba(240,237,230,0.15)", borderRadius: "4px",
                      color: "rgba(240,237,230,0.65)", textDecoration: "none",
                      fontFamily: "'Oswald', sans-serif", fontWeight: 500,
                      fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase",
                    }}
                  >
                    Call 615-406-4819
                  </a>
                </div>
              </>
            ) : (
              <p style={{ color: "rgba(240,237,230,0.4)", fontFamily: "'Lato', sans-serif" }}>
                Select your options to see an estimate.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map polygon modal */}
      {showMap && (
        <MapPolygonModal
          onClose={() => setShowMap(false)}
          onAcreageConfirm={(acres) => set("acres")(acres)}
        />
      )}

      {/* Submit as lead modal */}
      {showLeadForm && result && (
        <SubmitLeadModal
          state={state}
          result={result}
          onClose={() => setShowLeadForm(false)}
        />
      )}
    </>
  );
}
