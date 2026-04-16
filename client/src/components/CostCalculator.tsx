/*
 * CostCalculator — interactive rough-estimate widget for the Pricing page
 * Inputs: service type, acreage, vegetation density, terrain difficulty, site access
 * Output: low/high estimate range + per-acre breakdown + CTA to get a real quote
 */
import { useState, useMemo } from "react";
import { Calculator, ChevronRight, Info } from "lucide-react";

/* ─── Pricing model ─────────────────────────────────────────────────── */

// Base per-acre rates [low, high] by service × density tier
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
    // Per-acre rates for ROW corridors (easements, access roads, pipeline ROW)
    // Light = driveway/fence-line corridor, moderate growth
    // Moderate = utility/pipeline easement, established brush
    // Heavy = overgrown reclamation, mature trees encroaching
    light:    [1200, 2800],
    moderate: [1800, 3500],
    heavy:    [2800, 5500],
  },
};

// Multipliers applied on top of base rate
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

// Volume discount: per-acre rate drops slightly for larger jobs
function volumeDiscount(acres: number): number {
  if (acres >= 10) return 0.88;
  if (acres >= 5)  return 0.93;
  if (acres >= 3)  return 0.97;
  return 1.0;
}

const MOBILIZATION = 350; // flat add-on
const MIN_JOB = 1800;

// Base acres-per-day production rates by service type
// Conservative real-world rates for a single tracked forestry mulcher (1–2 ac/day max)
const BASE_ACRES_PER_DAY: Record<string, number> = {
  "forestry-mulching":     1.5,  // tracked mulcher, avg conditions
  "land-clearing":         1.0,  // heavier work, debris management
  "vegetation-management": 2.0,  // lighter brush, faster passes
  "property-maintenance":  2.0,
  "right-of-way-clearing": 1.25, // narrow corridors, more passes
};

// Density slows production
const DENSITY_PROD_MULT: Record<string, number> = {
  light:    1.4,
  moderate: 1.0,
  heavy:    0.6,
};

// Terrain slows production
const TERRAIN_PROD_MULT: Record<string, number> = {
  flat:    1.0,
  rolling: 0.85,
  steep:   0.65,
};

function calcCompletionTime(s: CalcState): { low: string; high: string; days: number } | null {
  const baseApd = BASE_ACRES_PER_DAY[s.service];
  if (!baseApd) return null;
  const dm = DENSITY_PROD_MULT[s.density] ?? 1;
  const tm = TERRAIN_PROD_MULT[s.terrain] ?? 1;
  const acresPerDay = baseApd * dm * tm;
  const rawDays = s.acres / acresPerDay;

  // Express as a human-readable range
  if (rawDays < 0.5) {
    return { low: "2–4 hours", high: "half a day", days: rawDays };
  } else if (rawDays < 1) {
    return { low: "half a day", high: "1 day", days: rawDays };
  } else if (rawDays <= 1.5) {
    return { low: "1 day", high: "1–2 days", days: rawDays };
  } else if (rawDays <= 2.5) {
    return { low: "1–2 days", high: "2–3 days", days: rawDays };
  } else if (rawDays <= 4) {
    return { low: "2–3 days", high: "3–4 days", days: rawDays };
  } else if (rawDays <= 6) {
    return { low: "3–5 days", high: "5–7 days", days: rawDays };
  } else if (rawDays <= 10) {
    return { low: "1–2 weeks", high: "2 weeks", days: rawDays };
  } else {
    const weeks = Math.ceil(rawDays / 5);
    return { low: `${weeks}–${weeks + 1} weeks`, high: `${weeks + 1}+ weeks`, days: rawDays };
  }
}

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

/* ─── Sub-components ─────────────────────────────────────────────────── */

function SelectRow({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label
        style={{
          display: "block",
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 500,
          fontSize: "0.8rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(240,237,230,0.7)",
          marginBottom: "0.4rem",
        }}
      >
        {label}
        {hint && (
          <span
            title={hint}
            style={{ marginLeft: "0.4rem", cursor: "help", verticalAlign: "middle" }}
          >
            <Info size={11} style={{ color: "rgba(224,123,42,0.5)", display: "inline" }} />
          </span>
        )}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.65rem 0.9rem",
          backgroundColor: "#111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "4px",
          color: "#F0EDE6",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.9rem",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23E07B2A' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.85rem center",
          paddingRight: "2.25rem",
          outline: "none",
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

function AcreSlider({ value, onChange, isRow }: { value: number; onChange: (v: number) => void; isRow?: boolean }) {
  const steps = [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50];
  const idx = steps.indexOf(value);
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 500,
          fontSize: "0.8rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(240,237,230,0.7)",
          marginBottom: "0.4rem",
        }}
      >
        <span>{isRow ? "Corridor Acreage" : "Acreage"}</span>
        <span style={{ color: "#E07B2A", fontSize: "1rem", fontWeight: 700 }}>
          {value} {value === 1 ? "acre" : "acres"}
        </span>
      </label>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={idx === -1 ? 3 : idx}
        onChange={(e) => onChange(steps[Number(e.target.value)])}
        style={{ width: "100%", accentColor: "#E07B2A", cursor: "pointer" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.65rem",
          color: "rgba(240,237,230,0.3)",
          marginTop: "0.2rem",
        }}
      >
        <span>½ acre</span>
        <span>5 acres</span>
        <span>10 acres</span>
        <span>50 acres</span>
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
    <div
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(224,123,42,0.25)",
        borderRadius: "8px",
        overflow: "hidden",
        maxWidth: "860px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.5rem 2rem",
          background: "linear-gradient(90deg, rgba(224,123,42,0.12) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <Calculator size={20} style={{ color: "#E07B2A", flexShrink: 0 }} />
        <div>
          <h3
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "#F0EDE6",
              margin: 0,
              letterSpacing: "0.03em",
            }}
          >
            Rough Estimate Calculator
          </h3>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: "rgba(240,237,230,0.5)", margin: 0 }}>
            Ballpark figures only — every property is different. Get a free on-site estimate for an exact number.
          </p>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "0",
        }}
      >
        {/* Inputs */}
        <div
          style={{
            padding: "1.75rem 2rem",
            borderRight: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <SelectRow
            label="Service Type"
            value={state.service}
            onChange={set("service")}
            options={serviceOptions}
          />
          <AcreSlider value={state.acres} onChange={(v) => set("acres")(v)} isRow={state.service === "right-of-way-clearing"} />
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
        <div
          style={{
            padding: "1.75rem 2rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          {result ? (
            <>
              <div>
                {/* Estimate range */}
                <p
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 500,
                    fontSize: "0.7rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(240,237,230,0.45)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Estimated Total
                </p>
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(2rem, 5vw, 2.75rem)",
                    color: "#E07B2A",
                    lineHeight: 1,
                    marginBottom: "0.35rem",
                  }}
                >
                  {fmt(result.low)} – {fmt(result.high)}
                </div>
                {isMinJob && (
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", marginBottom: "0.75rem" }}>
                    Minimum job rate applied ($1,800)
                  </p>
                )}

                {/* Per-acre breakdown + completion time */}
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderRadius: "4px",
                      padding: "0.6rem 0.9rem",
                      flex: 1,
                      minWidth: "120px",
                    }}
                  >
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", color: "rgba(240,237,230,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.2rem" }}>Per Acre</p>
                    <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0EDE6", margin: 0 }}>
                      {fmt(result.perAcreLow)} – {fmt(result.perAcreHigh)}
                    </p>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderRadius: "4px",
                      padding: "0.6rem 0.9rem",
                      flex: 1,
                      minWidth: "120px",
                    }}
                  >
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", color: "rgba(240,237,230,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.2rem" }}>Mobilization</p>
                    <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1rem", color: "#F0EDE6", margin: 0 }}>
                      {fmt(MOBILIZATION)} (included)
                    </p>
                  </div>
                </div>

                {/* Completion time */}
                {timeResult && (
                  <div
                    style={{
                      backgroundColor: "rgba(224,123,42,0.07)",
                      border: "1px solid rgba(224,123,42,0.2)",
                      borderRadius: "4px",
                      padding: "0.85rem 1rem",
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
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
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.75rem",
                    color: "rgba(240,237,230,0.35)",
                    lineHeight: 1.6,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "0.85rem",
                  }}
                >
                  This is a rough ballpark based on typical Middle & West TN rates. Actual pricing depends on a site visit. Debris disposal, stump count, and unusual terrain may affect the final number.
                </p>
              </div>

              {/* CTA */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <a
                  href={`/quote?service=${encodeURIComponent(state.service)}&acres=${state.acres}&density=${encodeURIComponent(state.density)}&terrain=${encodeURIComponent(state.terrain)}&access=${encodeURIComponent(state.access)}`}
                  className="btn-amber"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    textDecoration: "none",
                    padding: "0.8rem 1.5rem",
                    fontSize: "0.9rem",
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Get a Free On-Site Estimate
                  <ChevronRight size={15} />
                </a>
                <a
                  href="tel:6154064819"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.7rem 1.5rem",
                    border: "1px solid rgba(240,237,230,0.15)",
                    borderRadius: "4px",
                    color: "rgba(240,237,230,0.65)",
                    textDecoration: "none",
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 500,
                    fontSize: "0.8rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
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
  );
}
