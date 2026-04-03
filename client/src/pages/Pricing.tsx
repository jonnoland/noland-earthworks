/*
 * DESIGN: Heavy Equipment Grit — matches site style
 * Pricing Guide page — transparent pricing ranges for Middle & West Tennessee
 * Based on Tennessee market research for land clearing / forestry mulching services
 */
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, Phone, CheckCircle2, AlertCircle } from "lucide-react";

/* ─── Data ─────────────────────────────────────────────────────────────── */

const services = [
  {
    id: "forestry-mulching",
    name: "Forestry Mulching",
    tagline: "The cleanest, fastest way to clear land",
    icon: "🌲",
    description:
      "A single machine grinds trees, brush, and stumps into mulch in one pass — no burning, no hauling, no mess. The mulch layer protects the soil and suppresses regrowth.",
    priceUnit: "per acre",
    tiers: [
      {
        label: "Light Brush & Saplings",
        range: "$800 – $1,500",
        detail: "Thin understory, saplings under 4″ diameter, open canopy",
      },
      {
        label: "Moderate Growth",
        range: "$1,500 – $2,500",
        detail: "Mixed brush, trees up to 8″ diameter, moderate density",
      },
      {
        label: "Heavy Timber & Dense Brush",
        range: "$2,500 – $4,500+",
        detail: "Mature hardwoods, thick cedar, heavy multi-stem growth",
      },
    ],
    note: "Minimum job size: 1 acre or $1,200, whichever is greater.",
    href: "/services/forestry-mulching",
  },
  {
    id: "land-clearing",
    name: "Land Clearing",
    tagline: "Full-site preparation for construction or agriculture",
    icon: "🏗️",
    description:
      "Complete removal of trees, stumps, brush, and debris. Site is graded and ready for building, farming, or pasture use. Includes haul-away of material.",
    priceUnit: "per acre",
    tiers: [
      {
        label: "Light Clearing",
        range: "$1,500 – $3,000",
        detail: "Mostly brush and small trees, relatively flat terrain",
      },
      {
        label: "Moderate Clearing",
        range: "$3,000 – $6,000",
        detail: "Mixed timber and brush, some slope, moderate debris volume",
      },
      {
        label: "Heavy Clearing",
        range: "$6,000 – $12,000+",
        detail: "Dense mature timber, steep terrain, large stump removal",
      },
    ],
    note: "Stump grinding is included. Debris haul-away is included in the estimate.",
    href: "/services/land-clearing",
  },
  {
    id: "vegetation-management",
    name: "Vegetation Management",
    tagline: "Right-of-way, fencelines, and utility corridors",
    icon: "⚡",
    description:
      "Targeted clearing along power lines, fence rows, roads, and property boundaries. Keeps corridors open without disturbing surrounding land.",
    priceUnit: "per linear foot or per acre",
    tiers: [
      {
        label: "Fenceline / Road Edge",
        range: "$1.50 – $4.00 / linear ft",
        detail: "Single-pass brush cutting along fence or road edge",
      },
      {
        label: "Right-of-Way Corridor",
        range: "$1,200 – $2,500 / acre",
        detail: "Utility or access corridor, light-to-moderate growth",
      },
      {
        label: "Overgrown ROW Reclamation",
        range: "$2,500 – $5,000+ / acre",
        detail: "Heavily overgrown corridors, mature trees encroaching",
      },
    ],
    note: "Recurring maintenance contracts available — ask about annual pricing.",
    href: "/services/vegetation-management",
  },
  {
    id: "property-maintenance",
    name: "Property Maintenance",
    tagline: "Keep your land looking its best year-round",
    icon: "🌿",
    description:
      "Seasonal brush cutting, pasture reclamation, and ongoing land upkeep. Ideal for farms, rural estates, and hunting properties.",
    priceUnit: "per visit or per acre",
    tiers: [
      {
        label: "Pasture / Field Maintenance",
        range: "$150 – $400 / acre",
        detail: "Seasonal mowing or mulching of open fields and pastures",
      },
      {
        label: "Brush Control",
        range: "$400 – $900 / acre",
        detail: "Cutting back encroaching brush and invasive species",
      },
      {
        label: "Full Property Reclamation",
        range: "$900 – $2,000+ / acre",
        detail: "Neglected property restoration — heavy brush and small trees",
      },
    ],
    note: "Annual maintenance plans available. Discounts for multi-visit contracts.",
    href: "/services/property-maintenance",
  },
];

const costFactors = [
  {
    factor: "Acreage",
    impact: "High",
    detail:
      "Larger jobs cost more in total but often less per acre due to equipment mobilization being spread across more work.",
  },
  {
    factor: "Vegetation Density",
    impact: "High",
    detail:
      "Light brush clears 2–3× faster than heavy timber. Dense cedar or multi-stem hardwoods significantly increase time and cost.",
  },
  {
    factor: "Tree Size & Species",
    impact: "High",
    detail:
      "Mature hardwoods (oak, hickory) and large pines take more time than saplings. Trees over 12″ diameter add cost.",
  },
  {
    factor: "Terrain & Slope",
    impact: "Medium",
    detail:
      "Steep slopes, wet areas, or rocky ground slow equipment and may require different machinery.",
  },
  {
    factor: "Site Access",
    impact: "Medium",
    detail:
      "Narrow gates, soft ground, or long travel distances from the road affect mobilization and equipment positioning.",
  },
  {
    factor: "Debris Disposal",
    impact: "Medium",
    detail:
      "Forestry mulching leaves mulch on-site (no haul cost). Land clearing with haul-away adds disposal fees.",
  },
  {
    factor: "Distance from Dickson, TN",
    impact: "Low",
    detail:
      "We serve 35 counties with no travel surcharge within our normal service area.",
  },
];

const faqs = [
  {
    q: "Do you charge by the acre or by the hour?",
    a: "Most jobs are priced per acre after an on-site evaluation. Hourly rates are used for small or irregular-shaped parcels where acreage pricing doesn't apply. We'll tell you which method we'll use before you commit.",
  },
  {
    q: "Is there a minimum job size?",
    a: "Yes — our minimum is 1 acre or $1,200, whichever is greater. This covers equipment mobilization and ensures we can do quality work on every job.",
  },
  {
    q: "Why is forestry mulching sometimes cheaper than land clearing?",
    a: "Forestry mulching is a single-machine operation — no separate grinder, no haul trucks, no burning. The mulch stays on-site as a soil amendment. Land clearing involves more equipment, labor, and debris disposal, which adds cost.",
  },
  {
    q: "Do you offer free estimates?",
    a: "Yes. We provide free on-site estimates for all projects. Pricing online is a guide — every property is different, and we'll walk your land before giving you a firm number.",
  },
  {
    q: "Can I get a discount for a larger job?",
    a: "Absolutely. Large acreage jobs (5+ acres) typically come in at a lower per-acre rate because mobilization costs are spread across more work. Ask us about multi-acre and recurring maintenance pricing.",
  },
  {
    q: "Do prices include stump removal?",
    a: "Forestry mulching grinds stumps flush with the ground in the same pass — included at no extra charge. For traditional land clearing, stump grinding is included in our estimates unless otherwise noted.",
  },
];

/* ─── Sub-components ─────────────────────────────────────────────────── */

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    High: "#dc2626",
    Medium: "#E07B2A",
    Low: "#4ade80",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors[impact] ?? "#F0EDE6",
        border: `1px solid ${colors[impact] ?? "#F0EDE6"}`,
        backgroundColor: `${colors[impact] ?? "#F0EDE6"}18`,
      }}
    >
      {impact} Impact
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center justify-between gap-4 py-5"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 500,
            fontSize: "1rem",
            color: "#F0EDE6",
            letterSpacing: "0.02em",
          }}
        >
          {q}
        </span>
        {open ? (
          <ChevronUp size={18} style={{ color: "#E07B2A", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={18} style={{ color: "#E07B2A", flexShrink: 0 }} />
        )}
      </button>
      {open && (
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            color: "rgba(240,237,230,0.75)",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            paddingBottom: "1.25rem",
          }}
        >
          {a}
        </p>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: "10rem",
          paddingBottom: "5rem",
          background: "linear-gradient(180deg, #1a1a1a 0%, #121212 100%)",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
        }}
      >
        <div className="container">
          <div className="max-w-3xl">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(224,123,42,0.12)",
                border: "1px solid rgba(224,123,42,0.3)",
                borderRadius: "9999px",
                padding: "0.35rem 1rem",
                marginBottom: "1.5rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#E07B2A" }}>
                Transparent Pricing
              </span>
            </div>
            <h1
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                lineHeight: 1.1,
                color: "#F0EDE6",
                marginBottom: "1.25rem",
              }}
            >
              What Does Land Clearing<br />
              <span style={{ color: "#E07B2A" }}>Cost in Tennessee?</span>
            </h1>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "1.1rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.75)",
                maxWidth: "600px",
                marginBottom: "2rem",
              }}
            >
              We believe in honest, upfront pricing. The ranges below are based on real Tennessee market rates for Middle &amp; West Tennessee properties. Every job is different — get a free on-site estimate for your exact parcel.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a
                href="/quote"
                className="btn-amber"
                style={{ textDecoration: "none", padding: "0.75rem 2rem" }}
              >
                Get a Free Estimate
              </a>
              <a
                href="tel:6154064819"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  border: "1px solid rgba(240,237,230,0.2)",
                  borderRadius: "4px",
                  color: "#F0EDE6",
                  textDecoration: "none",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  fontSize: "0.9rem",
                }}
              >
                <Phone size={16} style={{ color: "#E07B2A" }} />
                Call 615-406-4819
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer banner ── */}
      <div
        style={{
          backgroundColor: "rgba(224,123,42,0.08)",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
          padding: "0.85rem 0",
        }}
      >
        <div className="container">
          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.85rem",
              color: "rgba(240,237,230,0.6)",
            }}
          >
            <AlertCircle size={14} style={{ color: "#E07B2A", flexShrink: 0 }} />
            Prices shown are market-range estimates. Your actual quote depends on site conditions. All estimates are free and require no commitment.
          </p>
        </div>
      </div>

      {/* ── Service pricing cards ── */}
      <section style={{ padding: "5rem 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                color: "#F0EDE6",
                marginBottom: "0.75rem",
              }}
            >
              Pricing by Service
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "1rem" }}>
              Typical ranges for Middle &amp; West Tennessee properties
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
              gap: "2rem",
            }}
          >
            {services.map((svc) => (
              <div
                key={svc.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(224,123,42,0.15)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    padding: "1.75rem 1.75rem 1.25rem",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "2rem", lineHeight: 1 }}>{svc.icon}</span>
                    <div>
                      <h3
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontWeight: 700,
                          fontSize: "1.35rem",
                          color: "#F0EDE6",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {svc.name}
                      </h3>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "#E07B2A", fontStyle: "italic" }}>
                        {svc.tagline}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.9rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.6 }}>
                    {svc.description}
                  </p>
                </div>

                {/* Pricing tiers */}
                <div style={{ padding: "1.25rem 1.75rem" }}>
                  <p
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(240,237,230,0.4)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Typical Range — {svc.priceUnit}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {svc.tiers.map((tier) => (
                      <div
                        key={tier.label}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "1rem",
                          padding: "0.75rem 1rem",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          borderRadius: "4px",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontFamily: "'Oswald', sans-serif",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              color: "#F0EDE6",
                              marginBottom: "0.2rem",
                            }}
                          >
                            {tier.label}
                          </p>
                          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: "rgba(240,237,230,0.5)" }}>
                            {tier.detail}
                          </p>
                        </div>
                        <span
                          style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 700,
                            fontSize: "1rem",
                            color: "#E07B2A",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {tier.range}
                        </span>
                      </div>
                    ))}
                  </div>
                  {svc.note && (
                    <p
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.78rem",
                        color: "rgba(240,237,230,0.45)",
                        marginTop: "0.75rem",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.4rem",
                      }}
                    >
                      <CheckCircle2 size={12} style={{ color: "#4ade80", flexShrink: 0, marginTop: "2px" }} />
                      {svc.note}
                    </p>
                  )}
                </div>

                {/* Card footer */}
                <div
                  style={{
                    padding: "1rem 1.75rem 1.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <a
                    href={svc.href}
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 500,
                      fontSize: "0.8rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                  >
                    Learn more about {svc.name} →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cost factors table ── */}
      <section
        style={{
          padding: "5rem 0",
          backgroundColor: "#161616",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                color: "#F0EDE6",
                marginBottom: "0.75rem",
              }}
            >
              What Affects Your Price?
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "1rem", maxWidth: "540px", margin: "0 auto" }}>
              These are the main factors our estimators evaluate when pricing a job.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "rgba(224,123,42,0.1)",
                    borderBottom: "2px solid rgba(224,123,42,0.3)",
                  }}
                >
                  <th
                    style={{
                      padding: "0.85rem 1.25rem",
                      textAlign: "left",
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                    }}
                  >
                    Factor
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1.25rem",
                      textAlign: "left",
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                    }}
                  >
                    Price Impact
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1.25rem",
                      textAlign: "left",
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                    }}
                  >
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {costFactors.map((row, i) => (
                  <tr
                    key={row.factor}
                    style={{
                      backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td
                      style={{
                        padding: "1rem 1.25rem",
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 500,
                        color: "#F0EDE6",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.factor}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", whiteSpace: "nowrap" }}>
                      <ImpactBadge impact={row.impact} />
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.6 }}>
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Forestry mulching vs land clearing comparison ── */}
      <section style={{ padding: "5rem 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                color: "#F0EDE6",
                marginBottom: "0.75rem",
              }}
            >
              Forestry Mulching vs. Traditional Land Clearing
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "1rem", maxWidth: "560px", margin: "0 auto" }}>
              Not sure which method is right for your property? Here's how they compare.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(224,123,42,0.3)" }}>
                  <th
                    style={{
                      padding: "0.85rem 1.25rem",
                      textAlign: "left",
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "rgba(240,237,230,0.5)",
                      width: "25%",
                    }}
                  >
                    Consideration
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1.25rem",
                      textAlign: "center",
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#E07B2A",
                      width: "37.5%",
                      backgroundColor: "rgba(224,123,42,0.06)",
                    }}
                  >
                    🌲 Forestry Mulching
                  </th>
                  <th
                    style={{
                      padding: "0.85rem 1.25rem",
                      textAlign: "center",
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(240,237,230,0.7)",
                      width: "37.5%",
                    }}
                  >
                    🏗️ Traditional Land Clearing
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Typical Cost / Acre", "$800 – $4,500", "$1,500 – $12,000+"],
                  ["Speed", "Fast (1 machine, 1 pass)", "Slower (multiple machines)"],
                  ["Debris Disposal", "Mulch stays on-site", "Haul-away required"],
                  ["Soil Disturbance", "Minimal", "Significant"],
                  ["Erosion Risk", "Low (mulch protects soil)", "Higher without cover"],
                  ["Best For", "Pasture, trails, light development", "Construction pads, heavy timber"],
                  ["Stump Removal", "Ground flush in same pass", "Separate stump grinding"],
                  ["Regrowth Suppression", "Good (mulch layer)", "Varies"],
                ].map(([label, mulch, clearing], i) => (
                  <tr
                    key={label}
                    style={{
                      backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.9rem 1.25rem",
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        color: "rgba(240,237,230,0.6)",
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "0.9rem 1.25rem",
                        textAlign: "center",
                        color: "#F0EDE6",
                        backgroundColor: "rgba(224,123,42,0.04)",
                      }}
                    >
                      {mulch}
                    </td>
                    <td
                      style={{
                        padding: "0.9rem 1.25rem",
                        textAlign: "center",
                        color: "rgba(240,237,230,0.7)",
                      }}
                    >
                      {clearing}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        style={{
          padding: "5rem 0",
          backgroundColor: "#161616",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                color: "#F0EDE6",
                marginBottom: "0.75rem",
              }}
            >
              Pricing FAQs
            </h2>
          </div>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            {faqs.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          padding: "5rem 0",
          background: "linear-gradient(135deg, #1a1a1a 0%, #1e1208 100%)",
          borderTop: "1px solid rgba(224,123,42,0.2)",
        }}
      >
        <div className="container" style={{ textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "#F0EDE6",
              marginBottom: "1rem",
            }}
          >
            Ready for a Real Number?
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "1.05rem",
              color: "rgba(240,237,230,0.7)",
              maxWidth: "500px",
              margin: "0 auto 2rem",
              lineHeight: 1.7,
            }}
          >
            Skip the guesswork. We'll walk your property and give you a firm, no-obligation estimate — usually within 48 hours.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/quote"
              className="btn-amber"
              style={{ textDecoration: "none", padding: "0.85rem 2.5rem", fontSize: "1rem" }}
            >
              Request a Free Estimate
            </a>
            <a
              href="tel:6154064819"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.85rem 2rem",
                border: "1px solid rgba(240,237,230,0.25)",
                borderRadius: "4px",
                color: "#F0EDE6",
                textDecoration: "none",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.06em",
                fontSize: "0.95rem",
              }}
            >
              <Phone size={16} style={{ color: "#E07B2A" }} />
              Call 615-406-4819
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
