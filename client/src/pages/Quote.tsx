/*
 * DESIGN: Heavy Equipment Grit — standalone quote page
 * Hero banner → two-column layout: contact info left, full form right
 */
import { useState, useEffect, useRef } from "react";
import { Phone, Mail, MapPin, Send, ArrowLeft, CheckCircle, Loader2, Search, ExternalLink, AlertCircle, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#F0EDE6",
  fontFamily: "'Lato', sans-serif",
  fontWeight: 400,
  fontSize: "0.9375rem",
  padding: "0.75rem 1rem",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Oswald', sans-serif",
  fontWeight: 400,
  fontSize: "0.75rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "rgba(240,237,230,0.55)",
  display: "block",
  marginBottom: "0.375rem",
};

// Map calculator's numeric acres to quote form's bucketed acreage option values
function acresBucket(acres: number): string {
  if (acres <= 0.5) return "half-to-one";
  if (acres <= 1)   return "half-to-one";
  if (acres <= 2)   return "one-to-two";
  if (acres <= 5)   return "two-to-five";
  if (acres <= 10)  return "five-to-ten";
  return "ten-plus";
}

// Build a pre-fill note from density/terrain/access params
function buildPrefillNote(density: string, terrain: string, access: string): string {
  const densityMap: Record<string, string> = {
    light: "light brush / saplings",
    moderate: "moderate brush and mixed trees",
    heavy: "heavy timber / dense cedar / mature hardwoods",
  };
  const terrainMap: Record<string, string> = {
    flat: "flat / gently rolling terrain",
    rolling: "moderate slope (10–25°)",
    steep: "steep / wet / rocky terrain (25°+)",
  };
  const accessMap: Record<string, string> = {
    easy: "easy access (wide gate, gravel drive)",
    moderate: "moderate access",
    difficult: "difficult access (narrow gate, soft ground)",
  };
  const parts: string[] = [];
  if (densityMap[density]) parts.push(`Vegetation: ${densityMap[density]}`);
  if (terrainMap[terrain]) parts.push(`Terrain: ${terrainMap[terrain]}`);
  if (accessMap[access])   parts.push(`Site access: ${accessMap[access]}`);
  return parts.length ? `From pricing calculator:\n${parts.join("\n")}` : "";
}

// Maps each core service to the add-ons most relevant to it
const ADDON_SUGGESTIONS: Record<string, string[]> = {
  "land-management": ["Post-Clear Seeding & Erosion Control", "Fence Line Clearing", "Selective Clearing & Tree Preservation"],
  "forestry-mulching": ["Mulch Redistribution", "Post-Clear Seeding & Erosion Control", "Fence Line Clearing"],
  "vegetation-management": ["Fence Line Clearing", "Post-Clear Seeding & Erosion Control"],
  "right-of-way-clearing": ["Fence Line Clearing", "Mulch Redistribution"],
  "property-maintenance": ["Post-Clear Seeding & Erosion Control", "Fence Line Clearing"],
  "trail-cutting": ["Mulch Redistribution", "Post-Clear Seeding & Erosion Control", "Selective Clearing & Tree Preservation"],
  "multiple": ["Post-Clear Seeding & Erosion Control", "Fence Line Clearing", "Mulch Redistribution", "Selective Clearing & Tree Preservation"],
};

export default function QuotePage() {
  usePageTitle(
    "Free Forestry Mulching Quote — Middle Tennessee",
    "Request a free on-site estimate for forestry mulching or land management in Middle & West Tennessee. Veteran-owned. Fast response.",
    "/quote"
  );
  const [submitted, setSubmitted] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [ballparkRange, setBallparkRange] = useState("");
  const [ballparkNote, setBallparkNote] = useState("");

  // Parcel lookup state
  const [parcelAddress, setParcelAddress] = useState("");
  const [debouncedParcelAddress, setDebouncedParcelAddress] = useState("");
  const [parcelAutoFilled, setParcelAutoFilled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteTerm, setAutocompleteTerm] = useState("");
  const [debouncedAutocompleteTerm, setDebouncedAutocompleteTerm] = useState("");
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [parcelInfo, setParcelInfo] = useState<{
    found: boolean;
    deedAcres?: number | null;
    owner?: string | null;
    owner2?: string | null;
    countyName?: string | null;
    parcelAddress?: string | null;
    parcelId?: string | null;
    tpadLink?: string | null;
    tpvLink?: string | null;
    geocodedAddress?: string;
    reason?: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adjustedAcres, setAdjustedAcres] = useState<string>("");
  const [adjustedAcresError, setAdjustedAcresError] = useState<string>("");
  const [submittedEstimate, setSubmittedEstimate] = useState<{ range: string; note: string; adjustedAcres?: number } | null>(null);

  // Debounce parcel address input — fire lookup 1.2s after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = parcelAddress.trim();
    if (trimmed.length < 5) {
      setDebouncedParcelAddress("");
      return;
    }
    debounceRef.current = setTimeout(() => setDebouncedParcelAddress(trimmed), 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [parcelAddress]);

  const parcelQuery = trpc.quote.parcelLookup.useQuery(
    { address: debouncedParcelAddress },
    {
      enabled: debouncedParcelAddress.length >= 5,
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Debounce autocomplete term — 400ms
  useEffect(() => {
    if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
    const trimmed = autocompleteTerm.trim();
    if (trimmed.length < 3) { setDebouncedAutocompleteTerm(""); return; }
    autocompleteDebounceRef.current = setTimeout(() => setDebouncedAutocompleteTerm(trimmed), 400);
    return () => { if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current); };
  }, [autocompleteTerm]);

  const autocompleteQuery = trpc.quote.placesAutocomplete.useQuery(
    { input: debouncedAutocompleteTerm },
    { enabled: debouncedAutocompleteTerm.length >= 3, staleTime: 30_000, retry: false }
  );

  // Auto-fill county and acreage when parcel data arrives
  useEffect(() => {
    if (!parcelQuery.data || parcelAutoFilled) return;
    const p = parcelQuery.data;
    if (!p.found) { setParcelInfo(p); return; }
    setParcelInfo({ ...p, parcelId: (p as { parcelId?: string | null }).parcelId ?? null });
    const updates: Partial<typeof form> = {};
    // Auto-fill county if not already set
    if (p.countyName && !form.county) {
      const normalized = p.countyName.toLowerCase();
      const knownCounties = [
        "bedford","benton","cannon","carroll","cheatham","chester",
        "davidson","decatur","dickson","gibson","giles",
        "hardin","henderson","henry","hickman","houston","humphreys",
        "lawrence","lewis","lincoln","madison","marshall",
        "maury","montgomery","moore","perry","robertson","rutherford",
        "stewart","sumner","trousdale","wayne","weakley","williamson","wilson",
      ];
      if (knownCounties.includes(normalized)) updates.county = normalized;
    }
    // Auto-fill acreage bucket if not already set
    if (p.deedAcres && p.deedAcres > 0 && !form.acreage) {
      updates.acreage = acresBucket(p.deedAcres);
    }
    if (Object.keys(updates).length > 0) {
      setForm(prev => ({ ...prev, ...updates }));
      setParcelAutoFilled(true);
    }
  }, [parcelQuery.data]);

  // Compute a preliminary price estimate from deed acreage and selected service
  // For trail cutting, trailLf (linear feet) is used directly when available
  function computeEstimate(acres: number, service: string, trailLf?: number): { range: string; note: string } | null {
    if (service === "trail-cutting") {
      const lf = trailLf && trailLf > 0 ? trailLf : (acres > 0 ? acres * 43560 / 10 : 0);
      if (lf <= 0) return null;
      // $2.00–$4.00/lf — standard trail in Middle TN. $500 minimum.
      const low  = Math.max(500, Math.round(lf * 2.00 / 50) * 50);
      const high = Math.max(500, Math.round(lf * 4.00 / 50) * 50);
      const fmt = (n: number) => `$${n.toLocaleString()}`;
      return {
        range: `${fmt(low)} – ${fmt(high)}`,
        note: `Rough range based on ${lf.toLocaleString()} linear feet at $2.00–$4.00/lf. Width, terrain, and vegetation density affect final price. $500 minimum applies.`,
      };
    }
    if (acres <= 0) return null;
    // Base rates per acre for Middle Tennessee
    const baseRates: Record<string, [number, number]> = {
      "forestry-mulching":    [650, 1200],  // matches AI default $2,000/ac mid
      "land-management":      [550, 1000],  // matches AI default $2,200/ac mid
      "vegetation-management":[500, 900],   // matches AI default $1,800/ac mid
      "right-of-way-clearing":[600, 1100],  // matches AI default $2,400/ac mid
      "property-maintenance": [150, 350],   // brush hogging rate
      "multiple":             [650, 1200],
    };
    const rates = baseRates[service] ?? baseRates["forestry-mulching"];
    const low  = Math.round(acres * rates[0] / 100) * 100;
    const high = Math.round(acres * rates[1] / 100) * 100;
    const fmt = (n: number) => `$${n.toLocaleString()}`;
    return {
      range: `${fmt(low)} – ${fmt(high)}`,
      note: `Rough range based on ${acres.toFixed(1)} deed acres. Actual price requires a site visit and may vary based on density, terrain, and access.`,
    };
  }

  const toggleAddOn = (label: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    );
  };

  // Read calculator pre-fill params from URL on first render
  const initialForm = (() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get("service") || "";
    const acres   = parseFloat(params.get("acres") || "0");
    const density = params.get("density") || "";
    const terrain = params.get("terrain") || "";
    const access  = params.get("access")  || "";
    const county   = params.get("county")  || "";
    const city     = params.get("city")    || "";
    const state    = params.get("state")   || "TN";
    const acreage = acres > 0 ? acresBucket(acres) : "";
    const message = (density || terrain || access) ? buildPrefillNote(density, terrain, access) : "";
    return {
      name: "", phone: "", email: "",
      service, county, acreage,
      street: "", city, state, zip: "",
      message,
      trailLinearFeet: "",
      trailWidth: "",
      trailTerrain: "",
    };
  })();

  // Trail area calculator state — multi-segment trail builder
  const [trailSegments, setTrailSegments] = useState<{ id: number; length: string; width: string }[]>([{ id: 1, length: "", width: "" }]);
  const [calcOpen, setCalcOpen] = useState(false);
  const nextSegId = useRef(2);

  const addSegment = () => {
    setTrailSegments(s => [...s, { id: nextSegId.current++, length: "", width: "" }]);
  };
  const removeSegment = (id: number) => {
    setTrailSegments(s => s.filter(seg => seg.id !== id));
  };
  const updateSegment = (id: number, field: "length" | "width", val: string) => {
    setTrailSegments(s => s.map(seg => seg.id === id ? { ...seg, [field]: val } : seg));
  };
  const calcTotalLf = () => trailSegments.reduce((sum, seg) => {
    const l = parseFloat(seg.length) || 0;
    return sum + l;
  }, 0);
  const calcTotalAcres = () => trailSegments.reduce((sum, seg) => {
    const l = parseFloat(seg.length) || 0;
    const w = parseFloat(seg.width) || 0;
    return sum + (l * w) / 43560;
  }, 0);
  const applyCalcToForm = () => {
    const totalLf = calcTotalLf();
    if (totalLf > 0) {
      setForm(f => ({ ...f, trailLinearFeet: String(Math.round(totalLf)) }));
    }
  };

  const [form, setForm] = useState(initialForm);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitQuote = trpc.quote.submit.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setSubmitError(null);
      setBallparkRange((data as any)?.ballparkRange ?? "");
      setBallparkNote((data as any)?.ballparkNote ?? "");
    },
    onError: (err) => {
      setSubmitError(
        err.message || "Something went wrong. Please try again or call us directly at 615-406-4819."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (adjustedAcresError) return;
    // Capture the preliminary estimate before submitting so we can show it on the success screen
    const effectiveAcresForSubmit = adjustedAcres ? parseFloat(adjustedAcres) : (parcelInfo?.deedAcres ?? 0);
    const trailLfForSubmit = form.service === "trail-cutting" && form.trailLinearFeet ? parseFloat(form.trailLinearFeet) : undefined;
    const preSubmitEstimate = (effectiveAcresForSubmit > 0 || trailLfForSubmit) && form.service ? computeEstimate(effectiveAcresForSubmit, form.service, trailLfForSubmit) : null;
    if (preSubmitEstimate) {
      setSubmittedEstimate({
        range: preSubmitEstimate.range,
        note: preSubmitEstimate.note,
        adjustedAcres: adjustedAcres ? parseFloat(adjustedAcres) : undefined,
      });
    }
    submitQuote.mutate({
      name: form.name,
      phone: form.phone,
      email: form.email || "(not provided)",
      service: form.service,
      county: form.county || "(not specified)",
      acreage: form.acreage,
      street: form.street,
      city: form.city,
      state: form.state || "TN",
      zip: form.zip,
      message: [
        form.message,
        form.service === "trail-cutting" && form.trailLinearFeet ? `Trail Length: ${parseFloat(form.trailLinearFeet).toLocaleString()} linear feet` : "",
        form.service === "trail-cutting" && form.trailWidth && form.trailWidth !== "other" ? `Trail Width: ${form.trailWidth} ft` : "",
        form.service === "trail-cutting" && form.trailLinearFeet && form.trailWidth && form.trailWidth !== "other"
          ? `Effective Acreage: ${((parseFloat(form.trailLinearFeet) * parseFloat(form.trailWidth)) / 43560).toFixed(2)} acres`
          : "",
        form.service === "trail-cutting" && form.trailTerrain ? `Terrain Type: ${form.trailTerrain.charAt(0).toUpperCase() + form.trailTerrain.slice(1)}` : "",
      ].filter(Boolean).join("\n"),
      addOns: selectedAddOns,
      parcelOwner: parcelInfo?.owner ?? undefined,
      parcelId: parcelInfo?.parcelId ?? undefined,
      deedAcres: parcelInfo?.deedAcres ?? undefined,
      adjustedAcres: adjustedAcres ? parseFloat(adjustedAcres) : undefined,
      estimatedRange: (() => {
        const effectiveAcres = adjustedAcres ? parseFloat(adjustedAcres) : (parcelInfo?.deedAcres ?? 0);
        const trailLf = form.service === "trail-cutting" && form.trailLinearFeet ? parseFloat(form.trailLinearFeet) : undefined;
        const est = (effectiveAcres > 0 || trailLf) && form.service ? computeEstimate(effectiveAcres, form.service, trailLf) : null;
        return est?.range ?? "";
      })(),
    });
  };

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* ── HERO BANNER ── */}
      <section
        className="relative flex items-end"
        style={{
          minHeight: "38vh",
          background: "linear-gradient(135deg, #0d1a0d 0%, #1a1a0a 50%, #1a0d00 100%)",
          overflow: "hidden",
        }}
      >
        {/* Amber left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: "#E07B2A" }}
        />
        {/* Decorative diagonal stripe */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(224,123,42,0.03) 40px, rgba(224,123,42,0.03) 41px)",
          }}
        />
        <div className="container relative z-10 pb-12 pt-32">
          <a
            href="/"
            className="inline-flex items-center gap-2 mb-6"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.5)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E07B2A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,237,230,0.5)")}
          >
            <ArrowLeft size={14} /> Back to Home
          </a>
          <div
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "0.75rem",
            }}
          >
            Free Estimate — No Obligation
          </div>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.0,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "#F0EDE6",
            }}
          >
            Get Your <span style={{ color: "#E07B2A" }}>Free Quote</span>
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              color: "rgba(240,237,230,0.7)",
              marginTop: "0.75rem",
              maxWidth: "540px",
            }}
          >
            Tell us about your project and we'll respond within 24 hours with a
            detailed, no-obligation estimate.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section style={{ paddingTop: "5rem", paddingBottom: "6rem" }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* ── LEFT: Contact info ── */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Contact cards */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: <Phone size={20} />,
                    label: "Call or Text",
                    value: "615-406-4819",
                    sub: "Mon–Sat, 7am–6pm",
                    href: "tel:6154064819",
                  },
                  {
                    icon: <Mail size={20} />,
                    label: "Email Us",
                    value: "quotes@nolandearthworks.com",
                    sub: "We respond within 24 hours",
                    href: "mailto:quotes@nolandearthworks.com",
                  },
                  {
                    icon: <MapPin size={20} />,
                    label: "Service Area",
                    value: "Middle & West Tennessee",
                    sub: "35 counties — free on-site estimates",
                    href: "/#service-areas",
                  },
                ].map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    className="flex items-start gap-4 p-4"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      textDecoration: "none",
                      transition: "border-color 0.2s ease, background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(224,123,42,0.4)";
                      e.currentTarget.style.backgroundColor = "rgba(224,123,42,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 flex-shrink-0"
                      style={{
                        backgroundColor: "rgba(224,123,42,0.12)",
                        border: "1px solid rgba(224,123,42,0.25)",
                        color: "#E07B2A",
                      }}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontWeight: 400,
                          fontSize: "0.65rem",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(240,237,230,0.4)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 500,
                          fontSize: "0.9375rem",
                          color: "#F0EDE6",
                          marginBottom: "0.15rem",
                        }}
                      >
                        {c.value}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 300,
                          fontSize: "0.8rem",
                          color: "rgba(240,237,230,0.45)",
                        }}
                      >
                        {c.sub}
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* What to expect */}
              <div
                style={{
                  backgroundColor: "rgba(224,123,42,0.06)",
                  border: "1px solid rgba(224,123,42,0.2)",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    marginBottom: "1rem",
                  }}
                >
                  What Happens Next
                </div>
                {[
                  "We review your request within 24 hours",
                  "We schedule a free on-site visit",
                  "You receive a detailed written estimate",
                  "No pressure, no obligation — ever",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 mb-3">
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "#E07B2A",
                        flexShrink: 0,
                        width: "1.25rem",
                      }}
                    >
                      {i + 1}.
                    </div>
                    <span
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 300,
                        fontSize: "0.875rem",
                        color: "rgba(240,237,230,0.75)",
                        lineHeight: 1.5,
                      }}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Veteran badge */}
              <div
                className="flex items-center gap-3 p-4"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "2.5rem",
                    color: "#E07B2A",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ★
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#F0EDE6",
                    }}
                  >
                    Veteran-Owned &amp; Operated
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.8rem",
                      color: "rgba(240,237,230,0.5)",
                    }}
                  >
                    10% discount for active duty &amp; veterans — mention it in your request
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Form ── */}
            <div className="lg:col-span-3" style={{ position: "relative" }}>
              {/* Loading overlay — shown while submission is in flight */}
              {submitQuote.isPending && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    backgroundColor: "rgba(18,18,18,0.88)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1.25rem",
                    borderRadius: "4px",
                  }}
                >
                  {/* Pulsing ring + spinner */}
                  <div style={{ position: "relative", width: 72, height: 72 }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "2px solid rgba(224,123,42,0.25)",
                        animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 8,
                        borderRadius: "50%",
                        border: "2px solid rgba(224,123,42,0.15)",
                        animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite 0.3s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Loader2 size={32} style={{ color: "#E07B2A", animation: "spin 1s linear infinite" }} />
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#F0EDE6",
                    }}
                  >
                    Sending Your Request
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.85rem",
                      color: "rgba(240,237,230,0.5)",
                    }}
                  >
                    Just a moment...
                  </div>
                </div>
              )}

              {submitted ? (
                <div
                  className="flex flex-col items-center justify-center text-center p-12"
                  style={{
                    backgroundColor: "rgba(224,123,42,0.06)",
                    border: "1px solid rgba(224,123,42,0.3)",
                    minHeight: "480px",
                    animation: "fadeSlideUp 0.5s ease both",
                  }}
                >
                  {/* Animated success icon with pulse ring */}
                  <div style={{ position: "relative", marginBottom: "1.75rem" }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: -12,
                        borderRadius: "50%",
                        backgroundColor: "rgba(224,123,42,0.12)",
                        animation: "successPulse 2s ease-in-out infinite",
                      }}
                    />
                    <CheckCircle size={64} style={{ color: "#E07B2A", position: "relative", zIndex: 1 }} />
                  </div>
                  <h2
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.75rem",
                      letterSpacing: "0.02em",
                      textTransform: "none",
                      color: "#F0EDE6",
                      marginBottom: "1rem",
                    }}
                  >
                    Got It, {form.name.split(" ")[0]}
                  </h2>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "1rem",
                      color: "rgba(240,237,230,0.65)",
                      maxWidth: "440px",
                      lineHeight: 1.7,
                      marginBottom: "0.75rem",
                    }}
                  >
                    I'll reach out within one business day — usually the same day. We'll talk briefly about the property, and if it makes sense, I'll schedule a free on-site visit.
                  </p>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.9375rem",
                      color: "rgba(240,237,230,0.5)",
                      maxWidth: "440px",
                      lineHeight: 1.7,
                      marginBottom: "1.5rem",
                    }}
                  >
                    After the site visit, you'll have a written proposal within one to two days. No pressure, no obligation.
                  </p>

                  {/* Submitted details summary */}
                  {(() => {
                    const serviceLabels: Record<string, string> = {
                      "land-management": "Land Management",
                      "forestry-mulching": "Forestry Mulching",
                      "vegetation-management": "Vegetation Management",
                      "right-of-way-clearing": "Right-of-Way Clearing",
                      "property-maintenance": "Property Maintenance",
                      "trail-cutting": "Trail Cutting",
                      "multiple": "Multiple Services",
                    };
                    const acreageLabels: Record<string, string> = {
                      "half-to-one": "½ – 1 acre",
                      "one-to-two": "1 – 2 acres",
                      "two-to-five": "2 – 5 acres",
                      "five-to-ten": "5 – 10 acres",
                      "ten-plus": "10+ acres",
                      "unsure": "Not sure",
                    };
                    const countyDisplay = form.county
                      ? form.county.charAt(0).toUpperCase() + form.county.slice(1) + " County"
                      : "";
                    const serviceDisplay = serviceLabels[form.service] || form.service;
                    const acreageDisplay = acreageLabels[form.acreage] || form.acreage;
                    const streetDisplay = form.street
                      ? form.street.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                      : "";
                    const cityDisplay = form.city
                      ? form.city.charAt(0).toUpperCase() + form.city.slice(1)
                      : "";
                    const addressLine = [streetDisplay, [cityDisplay, form.state?.toUpperCase(), form.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

                    const rowStyle: React.CSSProperties = {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "0.55rem 0",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      gap: "1rem",
                    };
                    const labelStyle2: React.CSSProperties = { color: "rgba(240,237,230,0.45)", minWidth: "90px", flexShrink: 0 };
                    const valueStyle: React.CSSProperties = { color: "rgba(240,237,230,0.9)", textAlign: "right" };

                    return (
                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          padding: "1rem 1.25rem",
                          textAlign: "left",
                          width: "100%",
                          maxWidth: "440px",
                          marginBottom: "2rem",
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                        }}
                      >
                        <div style={{ color: "rgba(240,237,230,0.5)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem", fontWeight: 600 }}>Request Summary</div>
                        <div style={rowStyle}>
                          <span style={labelStyle2}>Name</span>
                          <span style={valueStyle}>{form.name}</span>
                        </div>
                        <div style={rowStyle}>
                          <span style={labelStyle2}>Service</span>
                          <span style={valueStyle}>{serviceDisplay}</span>
                        </div>
                        <div style={rowStyle}>
                          <span style={labelStyle2}>County</span>
                          <span style={valueStyle}>{countyDisplay}</span>
                        </div>
                        {acreageDisplay && (
                          <div style={rowStyle}>
                            <span style={labelStyle2}>Acreage</span>
                            <span style={valueStyle}>{acreageDisplay}</span>
                          </div>
                        )}
                        {selectedAddOns.length > 0 && (
                          <div style={rowStyle}>
                            <span style={labelStyle2}>Add-Ons</span>
                            <span style={{ ...valueStyle, maxWidth: "260px", wordBreak: "break-word" }}>{selectedAddOns.join(", ")}</span>
                          </div>
                        )}
                        {addressLine && (
                          <div style={{ ...rowStyle, borderBottom: "none" }}>
                            <span style={labelStyle2}>Address</span>
                            <span style={{ ...valueStyle, maxWidth: "260px", wordBreak: "break-word" }}>{addressLine}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Ballpark Range Block */}
                  {ballparkRange && (
                    <div
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1.25rem 1.75rem",
                        backgroundColor: "rgba(224,123,42,0.08)",
                        border: "1px solid rgba(224,123,42,0.35)",
                        borderRadius: "8px",
                        maxWidth: "440px",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontWeight: 400,
                          fontSize: "0.65rem",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(224,123,42,0.8)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Rough Project Range
                      </div>
                      <div
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontWeight: 700,
                          fontSize: "2rem",
                          letterSpacing: "0.02em",
                          color: "#E07B2A",
                          marginBottom: "0.5rem",
                          lineHeight: 1.1,
                        }}
                      >
                        {ballparkRange}
                      </div>
                      {ballparkNote && (
                        <p
                          style={{
                            fontFamily: "'Lato', sans-serif",
                            fontWeight: 300,
                            fontSize: "0.8rem",
                            color: "rgba(240,237,230,0.5)",
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {ballparkNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Parcel-based preliminary estimate — shown when parcel lookup was used */}
                  {submittedEstimate && !ballparkRange && (
                    <div
                      style={{
                        marginBottom: "1.5rem",
                        padding: "1.25rem 1.75rem",
                        backgroundColor: "rgba(224,123,42,0.06)",
                        border: "1px solid rgba(224,123,42,0.25)",
                        borderRadius: "8px",
                        maxWidth: "440px",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 400, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,123,42,0.7)", marginBottom: "0.5rem" }}>
                        Preliminary Range{submittedEstimate.adjustedAcres ? ` \u2014 ${submittedEstimate.adjustedAcres.toFixed(1)} ac adjusted` : ""}
                      </div>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "2rem", letterSpacing: "0.02em", color: "#E07B2A", marginBottom: "0.5rem", lineHeight: 1.1 }}>
                        {submittedEstimate.range}
                      </div>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "rgba(240,237,230,0.45)", lineHeight: 1.6, margin: 0 }}>
                        {submittedEstimate.note}
                      </p>
                    </div>
                  )}

                  {/* Google Review CTA */}
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1.25rem 1.75rem",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      maxWidth: "440px",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.875rem",
                        color: "rgba(240,237,230,0.6)",
                        marginBottom: "0.85rem",
                      }}
                    >
                      Been a customer before? A quick Google review helps others find us.
                    </p>
                    <a
                      href="https://g.page/r/CcglMAMbtQInEBM/review"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        backgroundColor: "transparent",
                        color: "#E07B2A",
                        border: "1px solid rgba(224,123,42,0.5)",
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "0.6rem 1.25rem",
                        textDecoration: "none",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Leave a Google Review
                    </a>
                  </div>

                  <a
                    href="/"
                    className="btn-amber"
                    style={{ textDecoration: "none" }}
                  >
                    Back to Home
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        name="name" type="text" required
                        placeholder="John Smith"
                        value={form.name} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone Number *</label>
                      <input
                        name="phone" type="tel" required
                        placeholder="(615) 555-0123"
                        value={form.phone} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input
                      name="email" type="email" required
                      placeholder="john@example.com"
                      value={form.email} onChange={handleChange}
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                  </div>

                  {/* Service + County */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Service Needed *</label>
                      <select
                        name="service" required
                        value={form.service} onChange={handleChange}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      >
                        <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select a service...</option>
                        <option value="land-management" style={{ backgroundColor: "#1a1a1a" }}>Land Management</option>
                        <option value="forestry-mulching" style={{ backgroundColor: "#1a1a1a" }}>Forestry Mulching</option>
                        <option value="vegetation-management" style={{ backgroundColor: "#1a1a1a" }}>Vegetation Management</option>
                        <option value="right-of-way-clearing" style={{ backgroundColor: "#1a1a1a" }}>Right-of-Way Clearing</option>
                        <option value="property-maintenance" style={{ backgroundColor: "#1a1a1a" }}>Property Maintenance</option>
                        <option value="trail-cutting" style={{ backgroundColor: "#1a1a1a" }}>Trail Cutting</option>
                        <option value="multiple" style={{ backgroundColor: "#1a1a1a" }}>Multiple Services</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>County</label>
                      <select
                        name="county"
                        value={form.county} onChange={handleChange}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      >
                        <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select county...</option>
                        {[
                          "Bedford","Benton","Cannon","Carroll","Cheatham","Chester",
                          "Davidson","Decatur","Dickson","Gibson","Giles",
                          "Hardin","Henderson","Henry","Hickman","Houston","Humphreys",
                          "Lawrence","Lewis","Lincoln","Madison","Marshall",
                          "Maury","Montgomery","Moore","Perry","Robertson","Rutherford",
                          "Stewart","Sumner","Trousdale","Wayne","Weakley","Williamson","Wilson"
                        ].map((c) => (
                          <option key={c} value={c.toLowerCase()} style={{ backgroundColor: "#1a1a1a" }}>{c}</option>
                        ))}
                        <option value="other" style={{ backgroundColor: "#1a1a1a" }}>Other / Not Listed</option>
                      </select>
                    </div>
                  </div>

                  {/* Acreage */}
                  <div>
                    <label style={labelStyle}>Approximate Acreage <span style={{ fontWeight: 400, opacity: 0.65, fontSize: "0.85em", textTransform: "none", letterSpacing: 0 }}>(minimum charge is 1 acre)</span></label>
                    <select
                      name="acreage"
                      value={form.acreage} onChange={handleChange}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    >
                      <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select acreage...</option>
                      <option value="under-quarter" style={{ backgroundColor: "#1a1a1a" }}>Under ¼ acre</option>
                      <option value="quarter-to-half" style={{ backgroundColor: "#1a1a1a" }}>¼ – ½ acre</option>
                      <option value="half-to-one" style={{ backgroundColor: "#1a1a1a" }}>½ – 1 acre</option>
                      <option value="one-to-two" style={{ backgroundColor: "#1a1a1a" }}>1 – 2 acres</option>
                      <option value="two-to-five" style={{ backgroundColor: "#1a1a1a" }}>2 – 5 acres</option>
                      <option value="five-to-ten" style={{ backgroundColor: "#1a1a1a" }}>5 – 10 acres</option>
                      <option value="ten-plus" style={{ backgroundColor: "#1a1a1a" }}>10+ acres</option>
                      <option value="unsure" style={{ backgroundColor: "#1a1a1a" }}>Not sure</option>
                    </select>
                  </div>

                  {/* Trail-specific fields — only shown when Trail Cutting is selected */}
                  {form.service === "trail-cutting" && (() => {
                    // Terrain multipliers: flat = 1.0, sloped = 1.2, rocky = 1.4
                    const terrainMultiplier = form.trailTerrain === "sloped" ? 1.2 : form.trailTerrain === "rocky" ? 1.4 : 1.0;
                    const trailAddOns = [
                      { key: "mulch-redistribution", label: "Mulch Redistribution" },
                      { key: "post-clear-seeding", label: "Post-Clear Seeding & Erosion Control" },
                      { key: "selective-clearing", label: "Selective Clearing & Tree Preservation" },
                    ];
                    return (
                    <div style={{ padding: "1rem", background: "rgba(224,123,42,0.05)", border: "1px solid rgba(224,123,42,0.2)", borderRadius: "4px" }}>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(224,123,42,0.8)", marginBottom: "0.75rem" }}>Trail Details</div>

                      {/* Row 1: Length + Width */}
                      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: "1rem" }}>
                        <div>
                          <label style={labelStyle}>Approximate Length <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(linear feet)</span></label>
                          <input
                            type="number"
                            name="trailLinearFeet"
                            min="0"
                            step="50"
                            placeholder="e.g. 2000"
                            value={form.trailLinearFeet}
                            onChange={handleChange}
                            style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Trail Width <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(feet)</span></label>
                          <select
                            name="trailWidth"
                            value={form.trailWidth}
                            onChange={handleChange}
                            style={{ ...inputStyle, cursor: "pointer" }}
                            onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                          >
                            <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select width...</option>
                            <option value="6" style={{ backgroundColor: "#1a1a1a" }}>6 ft — Foot/ATV path</option>
                            <option value="8" style={{ backgroundColor: "#1a1a1a" }}>8 ft — ATV / UTV</option>
                            <option value="10" style={{ backgroundColor: "#1a1a1a" }}>10 ft — Standard trail</option>
                            <option value="12" style={{ backgroundColor: "#1a1a1a" }}>12 ft — Wide trail / access road</option>
                            <option value="16" style={{ backgroundColor: "#1a1a1a" }}>16 ft — Equipment access</option>
                            <option value="other" style={{ backgroundColor: "#1a1a1a" }}>Other (describe below)</option>
                          </select>
                        </div>
                      </div>

                      {/* Area Calculator — collapsible multi-segment tool */}
                      <div style={{ marginBottom: "1rem" }}>
                        <button
                          type="button"
                          onClick={() => setCalcOpen(o => !o)}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.4rem",
                            background: "none", border: "none", cursor: "pointer",
                            fontFamily: "'Oswald', sans-serif", fontSize: "0.68rem",
                            letterSpacing: "0.14em", textTransform: "uppercase",
                            color: "rgba(224,123,42,0.75)", padding: 0,
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: calcOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                            <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Calculate My Trail Acreage
                        </button>

                        {calcOpen && (
                          <div style={{ marginTop: "0.75rem", padding: "0.85rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "3px" }}>
                            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", margin: "0 0 0.75rem" }}>Add each trail segment separately — useful when your trail has multiple legs or varying widths.</p>

                            {trailSegments.map((seg, idx) => (
                              <div key={seg.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "end" }}>
                                <div>
                                  {idx === 0 && <label style={{ ...labelStyle, fontSize: "0.65rem" }}>Length (ft)</label>}
                                  <input
                                    type="number" min="0" step="50" placeholder="e.g. 1500"
                                    value={seg.length}
                                    onChange={e => updateSegment(seg.id, "length", e.target.value)}
                                    style={{ ...inputStyle, fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                                    onFocus={e => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                                  />
                                </div>
                                <div>
                                  {idx === 0 && <label style={{ ...labelStyle, fontSize: "0.65rem" }}>Width (ft)</label>}
                                  <input
                                    type="number" min="0" step="1" placeholder="e.g. 10"
                                    value={seg.width}
                                    onChange={e => updateSegment(seg.id, "width", e.target.value)}
                                    style={{ ...inputStyle, fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}
                                    onFocus={e => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                                    onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSegment(seg.id)}
                                  disabled={trailSegments.length === 1}
                                  style={{
                                    background: "none", border: "1px solid rgba(255,255,255,0.1)",
                                    color: trailSegments.length === 1 ? "rgba(255,255,255,0.2)" : "rgba(240,100,80,0.7)",
                                    cursor: trailSegments.length === 1 ? "default" : "pointer",
                                    borderRadius: "2px", padding: "0.5rem 0.6rem", fontSize: "0.8rem",
                                    lineHeight: 1,
                                  }}
                                  title="Remove segment"
                                >✕</button>
                              </div>
                            ))}

                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={addSegment}
                                style={{
                                  background: "none", border: "1px solid rgba(224,123,42,0.35)",
                                  color: "rgba(224,123,42,0.8)", cursor: "pointer",
                                  fontFamily: "'Oswald', sans-serif", fontSize: "0.68rem",
                                  letterSpacing: "0.1em", textTransform: "uppercase",
                                  padding: "0.45rem 0.85rem", borderRadius: "2px",
                                }}
                              >+ Add Segment</button>

                              {calcTotalLf() > 0 && (
                                <div style={{ flex: 1, fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: "rgba(240,237,230,0.6)" }}>
                                  Total: <strong style={{ color: "#E07B2A" }}>{calcTotalLf().toLocaleString()} ft</strong>
                                  {calcTotalAcres() > 0 && (
                                    <span> &nbsp;/&nbsp; <strong style={{ color: "#E07B2A" }}>{calcTotalAcres().toFixed(2)} ac</strong></span>
                                  )}
                                </div>
                              )}

                              {calcTotalLf() > 0 && (
                                <button
                                  type="button"
                                  onClick={applyCalcToForm}
                                  style={{
                                    background: "rgba(224,123,42,0.15)", border: "1px solid rgba(224,123,42,0.5)",
                                    color: "#E07B2A", cursor: "pointer",
                                    fontFamily: "'Oswald', sans-serif", fontSize: "0.68rem",
                                    letterSpacing: "0.1em", textTransform: "uppercase",
                                    padding: "0.45rem 0.85rem", borderRadius: "2px",
                                  }}
                                >
                                  Apply to Form
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Row 2: Terrain Type */}
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Terrain Type</label>
                          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }} className="terrain-info-wrap">
                            <Info size={13} style={{ color: "rgba(224,123,42,0.7)", cursor: "pointer" }} />
                            <div className="terrain-tooltip" style={{
                              position: "absolute",
                              left: "50%",
                              bottom: "calc(100% + 8px)",
                              transform: "translateX(-50%)",
                              width: "260px",
                              background: "#1a1a1a",
                              border: "1px solid rgba(224,123,42,0.3)",
                              borderRadius: "4px",
                              padding: "0.75rem",
                              zIndex: 50,
                              pointerEvents: "none",
                              opacity: 0,
                              transition: "opacity 0.15s ease",
                            }}>
                              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#E07B2A", marginBottom: "0.5rem" }}>Terrain Guide</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <div>
                                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#F0EDE6", marginBottom: "2px" }}>Flat</div>
                                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.4 }}>Level ground with little to no slope. Easy machine access throughout the trail path.</div>
                                </div>
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "0.5rem" }}>
                                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#F0EDE6", marginBottom: "2px" }}>Sloped <span style={{ color: "rgba(224,123,42,0.8)" }}>+20%</span></div>
                                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.4 }}>Noticeable grade — hillsides, ridge lines, or terrain that requires the machine to work at an angle. Slows production and increases wear.</div>
                                </div>
                                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "0.5rem" }}>
                                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#F0EDE6", marginBottom: "2px" }}>Rocky <span style={{ color: "rgba(224,123,42,0.8)" }}>+40%</span></div>
                                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.4 }}>Significant rock outcroppings, ledge rock, or embedded boulders along the trail path. Increases equipment wear and slows cutting speed considerably.</div>
                                </div>
                              </div>
                              <div style={{ position: "absolute", bottom: "-5px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(224,123,42,0.3)" }} />
                            </div>
                          </div>
                        </div>
                        <style>{`.terrain-info-wrap:hover .terrain-tooltip { opacity: 1 !important; }`}</style>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {(["flat", "sloped", "rocky"] as const).map((t) => {
                            const tooltips: Record<string, string> = {
                              flat: "Level ground — easy machine access throughout",
                              sloped: "Noticeable grade or hillside — slows production (+20% to estimate)",
                              rocky: "Rock outcroppings or embedded boulders — increases wear and slows cutting (+40% to estimate)",
                            };
                            return (
                              <div key={t} style={{ flex: 1, position: "relative" }} className={`terrain-btn-wrap terrain-btn-${t}`}>
                                <button
                                  type="button"
                                  title={tooltips[t]}
                                  onClick={() => setForm(f => ({ ...f, trailTerrain: f.trailTerrain === t ? "" : t }))}
                                  style={{
                                    width: "100%",
                                    padding: "0.55rem 0",
                                    fontFamily: "'Oswald', sans-serif",
                                    fontSize: "0.75rem",
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    border: form.trailTerrain === t ? "1px solid #E07B2A" : "1px solid rgba(255,255,255,0.12)",
                                    background: form.trailTerrain === t ? "rgba(224,123,42,0.15)" : "rgba(255,255,255,0.03)",
                                    color: form.trailTerrain === t ? "#E07B2A" : "rgba(240,237,230,0.6)",
                                    cursor: "pointer",
                                    borderRadius: "2px",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {t === "flat" ? "Flat" : t === "sloped" ? "Sloped" : "Rocky"}
                                  {t === "sloped" && <span style={{ fontSize: "0.6rem", display: "block", opacity: 0.7, marginTop: "1px" }}>+20%</span>}
                                  {t === "rocky" && <span style={{ fontSize: "0.6rem", display: "block", opacity: 0.7, marginTop: "1px" }}>+40%</span>}
                                </button>
                                <div className={`terrain-btn-tooltip-${t}`} style={{
                                  position: "absolute",
                                  bottom: "calc(100% + 8px)",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  width: "180px",
                                  background: "#1a1a1a",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "4px",
                                  padding: "0.5rem 0.65rem",
                                  fontFamily: "'Lato', sans-serif",
                                  fontSize: "0.72rem",
                                  color: "rgba(240,237,230,0.75)",
                                  lineHeight: 1.4,
                                  zIndex: 50,
                                  pointerEvents: "none",
                                  opacity: 0,
                                  transition: "opacity 0.15s ease",
                                  whiteSpace: "normal",
                                }}>{tooltips[t]}<div style={{ position: "absolute", bottom: "-5px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(255,255,255,0.12)" }} /></div>
                                <style>{`.terrain-btn-wrap.terrain-btn-${t}:hover .terrain-btn-tooltip-${t} { opacity: 1 !important; }`}</style>
                              </div>
                            );
                          })}
                        </div>
                        {form.trailTerrain && (
                          <div style={{ marginTop: "0.5rem", fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.5)", lineHeight: 1.4 }}>
                            {form.trailTerrain === "flat" && "Level ground — standard rate applies."}
                            {form.trailTerrain === "sloped" && "Sloped terrain adds approximately 20% to the base rate due to reduced production speed."}
                            {form.trailTerrain === "rocky" && "Rocky terrain adds approximately 40% to the base rate due to increased equipment wear and slower cutting."}
                          </div>
                        )}
                      </div>

                      {/* Row 3: Inline add-on checkboxes */}
                      <div style={{ marginBottom: "1rem" }}>
                        <label style={{ ...labelStyle, marginBottom: "0.4rem", display: "block" }}>Common Add-Ons <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(Optional)</span></label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {trailAddOns.map((addon) => (
                            <label
                              key={addon.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                cursor: "pointer",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "3px",
                                border: selectedAddOns.includes(addon.label)
                                  ? "1px solid rgba(224,123,42,0.5)"
                                  : "1px solid rgba(255,255,255,0.07)",
                                backgroundColor: selectedAddOns.includes(addon.label)
                                  ? "rgba(224,123,42,0.08)"
                                  : "rgba(255,255,255,0.02)",
                                transition: "all 0.15s ease",
                              }}
                              onClick={() => toggleAddOn(addon.label)}
                            >
                              <div style={{
                                width: "15px", height: "15px", borderRadius: "3px", flexShrink: 0,
                                border: selectedAddOns.includes(addon.label) ? "2px solid #E07B2A" : "2px solid rgba(255,255,255,0.25)",
                                backgroundColor: selectedAddOns.includes(addon.label) ? "#E07B2A" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {selectedAddOns.includes(addon.label) && (
                                  <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "rgba(240,237,230,0.85)" }}>{addon.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Preliminary range — shown when length + width filled */}
                      {form.trailLinearFeet && form.trailWidth && form.trailWidth !== "other" && (() => {
                        const lf = parseFloat(form.trailLinearFeet);
                        const w  = parseFloat(form.trailWidth);
                        if (!lf || !w) return null;
                        const acres = (lf * w) / 43560;
                        const baseLow  = Math.round(acres * 700 * terrainMultiplier / 100) * 100;
                        const baseHigh = Math.round(acres * 1000 * terrainMultiplier / 100) * 100;
                        const minFloor = 500;
                        const low  = Math.max(minFloor, baseLow);
                        const high = Math.max(minFloor, baseHigh);
                        return (
                          <div style={{ padding: "0.75rem 1rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "2px", fontFamily: "'Lato', sans-serif" }}>
                            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(224,123,42,0.7)", marginBottom: "0.25rem" }}>Preliminary Range{form.trailTerrain ? ` — ${form.trailTerrain.charAt(0).toUpperCase() + form.trailTerrain.slice(1)} terrain` : ""}</div>
                            <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1.3rem", color: "#E07B2A" }}>
                              ${low.toLocaleString()} – ${high.toLocaleString()}
                            </div>
                            <p style={{ fontSize: "0.72rem", color: "rgba(240,237,230,0.4)", margin: "0.3rem 0 0", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: "0.3rem" }}>
                              <span
                                title={`Effective acreage = length (${lf.toLocaleString()} ft) × width (${w} ft) ÷ 43,560 sq ft per acre = ${acres.toFixed(2)} acres. Rate: $700–$1,000/acre${terrainMultiplier > 1 ? ` × ${terrainMultiplier} terrain factor` : ""}. $500 minimum applies.`}
                                style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", cursor: "help", color: "rgba(224,123,42,0.6)" }}
                              >
                                <Info size={11} />
                              </span>
                              {lf.toLocaleString()} ft × {w} ft = {acres.toFixed(2)} effective acres{form.trailTerrain && form.trailTerrain !== "flat" ? ` (${form.trailTerrain} terrain adjustment applied)` : ""}. Actual price requires a site visit.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    );
                  })()}

                  {/* Add-On Services */}
                  <div>
                    <label style={labelStyle}>Add-On Services <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(Optional)</span></label>
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: "rgba(240,237,230,0.45)", marginBottom: "0.75rem", marginTop: "0.25rem" }}>
                      {form.service
                        ? "Based on your selected service, these add-ons are commonly included."
                        : "Select any add-on services you'd like included with your quote."}
                    </p>
                    {/* Sort: suggested add-ons first, rest after */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {((): { key: string; label: string }[] => {
                        const all = [
                          { key: "post-clear-seeding", label: "Post-Clear Seeding & Erosion Control" },
                          { key: "fence-line-clearing", label: "Fence Line Clearing" },
                          { key: "mulch-redistribution", label: "Mulch Redistribution" },
                          { key: "selective-clearing", label: "Selective Clearing & Tree Preservation" },
                        ];
                        const suggested = ADDON_SUGGESTIONS[form.service] ?? [];
                        return [
                          ...all.filter((a) => suggested.includes(a.label)),
                          ...all.filter((a) => !suggested.includes(a.label)),
                        ];
                      })().map((addon) => {
                        const suggested = (ADDON_SUGGESTIONS[form.service] ?? []).includes(addon.label);
                        return (
                          <label
                            key={addon.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.65rem",
                              cursor: "pointer",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "4px",
                              border: selectedAddOns.includes(addon.label)
                                ? "1px solid rgba(224,123,42,0.5)"
                                : suggested
                                ? "1px solid rgba(224,123,42,0.25)"
                                : "1px solid rgba(255,255,255,0.08)",
                              backgroundColor: selectedAddOns.includes(addon.label)
                                ? "rgba(224,123,42,0.08)"
                                : suggested
                                ? "rgba(224,123,42,0.03)"
                                : "rgba(255,255,255,0.02)",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => toggleAddOn(addon.label)}
                          >
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "3px",
                                border: selectedAddOns.includes(addon.label)
                                  ? "2px solid #E07B2A"
                                  : "2px solid rgba(255,255,255,0.25)",
                                backgroundColor: selectedAddOns.includes(addon.label)
                                  ? "#E07B2A"
                                  : "transparent",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {selectedAddOns.includes(addon.label) && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "rgba(240,237,230,0.85)" }}>
                                {addon.label}
                              </span>
                              {suggested && form.service && (
                                <span style={{
                                  fontFamily: "'Oswald', sans-serif",
                                  fontSize: "0.6rem",
                                  fontWeight: 600,
                                  letterSpacing: "0.12em",
                                  textTransform: "uppercase",
                                  color: "#E07B2A",
                                  backgroundColor: "rgba(224,123,42,0.12)",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "2px",
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}>
                                  Recommended
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parcel Lookup */}
                  <div>
                    <label style={labelStyle}>
                      Property Address Lookup
                      <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em", marginLeft: "0.5rem" }}>(auto-fills county &amp; acreage)</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Start typing the property address..."
                        value={parcelAddress}
                        autoComplete="off"
                        onChange={(e) => {
                          const val = e.target.value;
                          setParcelAddress(val);
                          setAutocompleteTerm(val);
                          setParcelAutoFilled(false);
                          setParcelInfo(null);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        style={{ ...inputStyle, paddingRight: "2.5rem" }}
                      />
                      <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: parcelQuery.isFetching || autocompleteQuery.isFetching ? "#E07B2A" : "rgba(240,237,230,0.35)", pointerEvents: "none", transition: "color 0.2s" }}>
                        {parcelQuery.isFetching || autocompleteQuery.isFetching
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Search size={15} />}
                      </div>
                      {/* Autocomplete dropdown */}
                      {showSuggestions && autocompleteQuery.data && autocompleteQuery.data.suggestions.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                          backgroundColor: "#1a1a1a", border: "1px solid rgba(224,123,42,0.35)",
                          borderTop: "none", maxHeight: "220px", overflowY: "auto",
                        }}>
                          {autocompleteQuery.data.suggestions.map((s) => (
                            <button
                              key={s.placeId}
                              type="button"
                              onMouseDown={() => {
                                setParcelAddress(s.description);
                                setAutocompleteTerm("");
                                setDebouncedAutocompleteTerm("");
                                setShowSuggestions(false);
                                setParcelAutoFilled(false);
                                setParcelInfo(null);
                                // Trigger parcel lookup immediately
                                setTimeout(() => setDebouncedParcelAddress(s.description), 50);
                              }}
                              style={{
                                display: "block", width: "100%", textAlign: "left",
                                padding: "0.6rem 1rem", background: "transparent",
                                border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)",
                                color: "rgba(240,237,230,0.85)", fontFamily: "'Lato', sans-serif",
                                fontSize: "0.875rem", cursor: "pointer",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(224,123,42,0.12)")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              {s.description}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Parcel result card */}
                    {parcelInfo && parcelInfo.found && (
                      <div style={{
                        marginTop: "0.75rem",
                        padding: "0.875rem 1rem",
                        background: "rgba(224,123,42,0.08)",
                        border: "1px solid rgba(224,123,42,0.25)",
                        borderRadius: "2px",
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.85rem",
                        color: "rgba(240,237,230,0.85)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem", color: "#E07B2A", fontFamily: "'Oswald', sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                          <CheckCircle size={13} />
                          Parcel Found — County &amp; Acreage Auto-Filled
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem 1.5rem" }}>
                          {parcelInfo.owner && (
                            <div><span style={{ opacity: 0.5, fontSize: "0.75rem" }}>Owner of Record</span><br />{parcelInfo.owner}{parcelInfo.owner2 ? ` / ${parcelInfo.owner2}` : ""}</div>
                          )}
                          {parcelInfo.deedAcres != null && parcelInfo.deedAcres > 0 && (
                            <div><span style={{ opacity: 0.5, fontSize: "0.75rem" }}>Deed Acreage</span><br />{parcelInfo.deedAcres.toFixed(2)} acres</div>
                          )}
                          {parcelInfo.countyName && (
                            <div><span style={{ opacity: 0.5, fontSize: "0.75rem" }}>County</span><br />{parcelInfo.countyName} County</div>
                          )}
                          {parcelInfo.parcelAddress && (
                            <div><span style={{ opacity: 0.5, fontSize: "0.75rem" }}>Parcel Address</span><br />{parcelInfo.parcelAddress}</div>
                          )}
                        </div>
                        {(parcelInfo.tpadLink || parcelInfo.tpvLink) && (
                          <div style={{ marginTop: "0.6rem", display: "flex", gap: "1rem" }}>
                            {parcelInfo.tpadLink && (
                              <a href={parcelInfo.tpadLink} target="_blank" rel="noopener noreferrer" style={{ color: "#E07B2A", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" }}>
                                <ExternalLink size={11} /> TN Property Assessor
                              </a>
                            )}
                            {parcelInfo.tpvLink && (
                              <a href={parcelInfo.tpvLink} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(224,123,42,0.7)", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" }}>
                                <ExternalLink size={11} /> Property Viewer
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Adjusted acreage input — shown when parcel found with deed acreage */}
                    {parcelInfo && parcelInfo.found && parcelInfo.deedAcres && parcelInfo.deedAcres > 0 && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <label style={{ ...labelStyle, fontSize: "0.75rem", opacity: 0.7 }}>
                          Adjusted Acreage
                          <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.68rem", letterSpacing: "0.08em", marginLeft: "0.4rem" }}>(if job covers only part of the parcel)</span>
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          placeholder={`Deed: ${parcelInfo.deedAcres?.toFixed(2)} ac — enter a smaller number if applicable`}
                          value={adjustedAcres}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdjustedAcres(val);
                            if (val && parcelInfo.deedAcres && parseFloat(val) > parcelInfo.deedAcres) {
                              setAdjustedAcresError(`Cannot exceed deed acreage of ${parcelInfo.deedAcres.toFixed(2)} ac`);
                            } else {
                              setAdjustedAcresError("");
                            }
                          }}
                          style={{ ...inputStyle, fontSize: "0.85rem", borderColor: adjustedAcresError ? "rgba(239,68,68,0.7)" : undefined }}
                          onFocus={(e) => (e.target.style.borderColor = adjustedAcresError ? "rgba(239,68,68,0.7)" : "rgba(224,123,42,0.6)")}
                          onBlur={(e) => (e.target.style.borderColor = adjustedAcresError ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.12)")}
                        />
                        {adjustedAcresError && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.35rem", color: "rgba(239,68,68,0.9)", fontSize: "0.75rem", fontFamily: "'Lato', sans-serif" }}>
                            <AlertCircle size={12} />
                            {adjustedAcresError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preliminary price estimate — shown when parcel found and service selected */}
                    {parcelInfo && parcelInfo.found && form.service && (() => {
                      const effectiveAcres = adjustedAcres ? parseFloat(adjustedAcres) : (parcelInfo.deedAcres ?? 0);
                      const trailLfVal = form.service === "trail-cutting" && form.trailLinearFeet ? parseFloat(form.trailLinearFeet) : undefined;
                      if (effectiveAcres <= 0 && !trailLfVal) return null;
                      const est = computeEstimate(effectiveAcres, form.service, trailLfVal);
                      if (!est) return null;
                      return (
                        <div style={{
                          marginTop: "0.75rem",
                          padding: "0.875rem 1rem",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "2px",
                          fontFamily: "'Lato', sans-serif",
                        }}>
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(224,123,42,0.7)", marginBottom: "0.35rem" }}>
                            Preliminary Range {adjustedAcres ? `(${parseFloat(adjustedAcres).toFixed(1)} ac adjusted)` : ""}
                          </div>
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "1.4rem", color: "#E07B2A", marginBottom: "0.3rem" }}>
                            {est.range}
                          </div>
                          <p style={{ fontSize: "0.75rem", color: "rgba(240,237,230,0.4)", margin: 0, lineHeight: 1.5 }}>
                            {est.note}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Not found notice */}
                    {parcelInfo && !parcelInfo.found && (
                      <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(240,237,230,0.45)", fontSize: "0.8rem", fontFamily: "'Lato', sans-serif" }}>
                        <AlertCircle size={13} />
                        Parcel not found — please fill in county and acreage manually.
                      </div>
                    )}
                  </div>

                  {/* Property Address */}
                  <div>
                    <label style={labelStyle}>Property / Service Address <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(Optional)</span></label>
                    <input
                      name="street" type="text"
                      placeholder="Street address"
                      value={form.street} onChange={handleChange}
                      style={{ ...inputStyle, marginBottom: "0.5rem" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        name="city" type="text"
                        placeholder="City"
                        value={form.city} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                      <input
                        name="state" type="text"
                        placeholder="State"
                        value={form.state} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                      <input
                        name="zip" type="text"
                        placeholder="ZIP"
                        value={form.zip} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Project Details</label>
                    <textarea
                      name="message" rows={5}
                      placeholder="Describe your property and what you need done — type of vegetation, terrain, access, timeline, etc."
                      value={form.message} onChange={handleChange}
                      style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                  </div>

                  {submitError && (
                    <div
                      style={{
                        backgroundColor: "rgba(220,38,38,0.12)",
                        border: "1px solid rgba(220,38,38,0.3)",
                        color: "#fca5a5",
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.875rem",
                        padding: "0.75rem 1rem",
                      }}
                    >
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitQuote.isPending}
                    className="btn-amber w-full justify-center"
                    style={{ fontSize: "1rem", padding: "0.875rem 2rem", opacity: submitQuote.isPending ? 0.7 : 1 }}
                  >
                    {submitQuote.isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={16} /> Send Quote Request</>
                    )}
                  </button>

                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.8rem",
                      color: "rgba(240,237,230,0.35)",
                      textAlign: "center",
                    }}
                  >
                    We respond within 24 hours. No obligation, no pressure.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <MobileCTABar />
      <Footer />
    </div>
  );
}
