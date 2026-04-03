/*
 * DESIGN: Heavy Equipment Grit — matches site style
 * Pricing Guide page — aligned with Jobber Products & Services
 * Based on Middle & West Tennessee market research
 */
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, Phone, CheckCircle2 } from "lucide-react";

/* ─── Data ─────────────────────────────────────────────────────────────── */

// Primary service categories with tiers
const serviceGroups = [
  {
    id: "forestry-mulching",
    name: "Forestry Mulching",
    tagline: "The cleanest, fastest way to clear land",
    icon: "🌲",
    description:
      "A single machine grinds trees, brush, and stumps into mulch in one pass — no burning, no hauling, no mess. The mulch layer protects the soil and suppresses regrowth.",
    tiers: [
      {
        label: "Standard Mulching",
        price: "$1,200",
        unit: "per acre",
        detail: "Light-to-moderate brush, saplings, and understory — open canopy, trees under 8″ diameter",
        tnMarket: "$1,000 – $2,500 / acre",
      },
      {
        label: "Heavy Mulching",
        price: "$1,800",
        unit: "per acre",
        detail: "Dense growth, mature hardwoods, thick cedar, heavy multi-stem vegetation",
        tnMarket: "$1,800 – $4,500 / acre",
      },
    ],
    note: "Minimum job: 1 acre or $1,800, whichever is greater. Stumps ground flush in the same pass — no extra charge.",
  },
  {
    id: "land-clearing",
    name: "Land Clearing & Grading",
    tagline: "Full-site preparation for construction or agriculture",
    icon: "🏗️",
    description:
      "Complete removal of trees, stumps, brush, and debris with rough grading. Site is ready for building, farming, or pasture use.",
    tiers: [
      {
        label: "Land Clearing & Grading",
        price: "$2,500",
        unit: "per acre",
        detail: "Full clearing including stump removal and rough grading — flat to moderate terrain",
        tnMarket: "$1,800 – $6,000 / acre",
      },
      {
        label: "Selective Clearing",
        price: "$150",
        unit: "per hour",
        detail: "Targeted removal of specific trees, brush, or problem areas without full-site clearing",
        tnMarket: "$125 – $250 / hour",
      },
      {
        label: "Stump Grinding & Removal",
        price: "$150",
        unit: "per stump",
        detail: "Individual stump grinding for stumps not covered under a full clearing package",
        tnMarket: "$75 – $400 / stump",
      },
    ],
    note: "Stump grinding is included in Land Clearing & Grading packages.",
  },
  {
    id: "vegetation-management",
    name: "Vegetation Management",
    tagline: "Right-of-way, fencelines, and utility corridors",
    icon: "⚡",
    description:
      "Targeted clearing along power lines, fence rows, roads, and property boundaries. Keeps corridors open without disturbing surrounding land.",
    tiers: [
      {
        label: "Vegetation Management — Light",
        price: "$150",
        unit: "per acre",
        detail: "Thin understory, grass, and light brush along fencelines or road edges",
        tnMarket: "$100 – $250 / acre",
      },
      {
        label: "Vegetation Management — Moderate",
        price: "$250",
        unit: "per acre",
        detail: "Mixed brush and saplings, moderate regrowth in corridors or right-of-way",
        tnMarket: "$200 – $400 / acre",
      },
      {
        label: "Vegetation Management — Heavy",
        price: "$400",
        unit: "per acre",
        detail: "Dense overgrowth, mature encroaching brush, heavily reclaimed corridors",
        tnMarket: "$350 – $600 / acre",
      },
      {
        label: "Vegetation Density Surcharge — Heavy",
        price: "$200",
        unit: "add-on",
        detail: "Applied when vegetation density significantly exceeds the standard tier estimate",
        tnMarket: "$150 – $300 add-on",
      },
    ],
    note: "Recurring maintenance contracts available — ask about annual pricing.",
  },
  {
    id: "gravel-driveway",
    name: "Gravel Driveway Services",
    tagline: "Regrading, resurfacing, and maintenance",
    icon: "🪨",
    description:
      "Restore and maintain gravel driveways with professional regrading, gravel addition, and pothole repair. Keeps your access road passable year-round.",
    tiers: [
      {
        label: "Gravel Driveway Regrading",
        price: "$350",
        unit: "flat",
        detail: "Regrade and reshape existing gravel surface — up to standard driveway length",
        tnMarket: "$300 – $800",
      },
      {
        label: "Regrading with Gravel Top-Off",
        price: "$550",
        unit: "flat",
        detail: "Regrading plus a fresh layer of gravel to restore depth and drainage",
        tnMarket: "$500 – $1,200",
      },
      {
        label: "Pothole Repair & Spot Regrading",
        price: "$250",
        unit: "flat",
        detail: "Targeted repair of potholes and low spots without full driveway regrading",
        tnMarket: "$200 – $500",
      },
      {
        label: "Gravel Addition / Resurfacing",
        price: "$85",
        unit: "per linear foot",
        detail: "Fresh gravel added along the full driveway length — priced per linear foot",
        tnMarket: "$75 – $120 / linear ft",
      },
      {
        label: "Gravel Driveway Maintenance Package",
        price: "$750",
        unit: "per visit",
        detail: "Comprehensive annual or seasonal maintenance: regrading, spot repair, and gravel top-off",
        tnMarket: "$600 – $1,200",
      },
    ],
    note: "Driveway length and gravel type affect final pricing. Free on-site estimate available.",
  },
];

// Add-on / ancillary services
const addOns = [
  {
    label: "Mobilization",
    price: "$350",
    unit: "per job",
    detail: "Equipment transport to and from your property. Waived on multi-day jobs within our standard service area.",
    tnMarket: "$250 – $500",
  },
  {
    label: "Debris Management",
    price: "$200",
    unit: "add-on",
    detail: "On-site debris organization, piling, or burn-pile preparation when mulching is not the chosen method.",
    tnMarket: "$150 – $400",
  },
  {
    label: "Post-Mulch Grading",
    price: "$150",
    unit: "add-on",
    detail: "Light grading and smoothing of the cleared area after forestry mulching for a clean, usable surface.",
    tnMarket: "$150 – $300",
  },
  {
    label: "Debris Management + Post-Mulch Grading",
    price: "$350",
    unit: "bundle",
    detail: "Both services together at a bundled rate — save $50 vs. booking separately.",
    tnMarket: "$300 – $700",
  },
  {
    label: "Additional Travel Miles",
    price: "$3.50",
    unit: "per mile",
    detail: "Applied for jobs outside our standard service radius. Most Middle & West TN counties have no travel surcharge.",
    tnMarket: "$2 – $5 / mile",
  },
];

const costFactors = [
  {
    factor: "Acreage",
    impact: "High",
    detail: "Larger jobs cost more in total but often less per acre — mobilization is spread across more work.",
  },
  {
    factor: "Vegetation Density",
    impact: "High",
    detail: "Light brush clears 2–3× faster than heavy timber. Dense cedar or multi-stem hardwoods significantly increase time and cost.",
  },
  {
    factor: "Tree Size & Species",
    impact: "High",
    detail: "Mature hardwoods (oak, hickory) and large pines take more time than saplings. Trees over 12″ diameter add cost.",
  },
  {
    factor: "Terrain & Slope",
    impact: "Medium",
    detail: "Steep slopes, wet areas, or rocky ground slow equipment and may require different machinery.",
  },
  {
    factor: "Site Access",
    impact: "Medium",
    detail: "Narrow gates, soft ground, or long travel distances from the road affect mobilization and equipment positioning.",
  },
  {
    factor: "Debris Disposal",
    impact: "Medium",
    detail: "Forestry mulching leaves mulch on-site (no haul cost). Land clearing with haul-away adds disposal fees.",
  },
  {
    factor: "Distance from Base",
    impact: "Low",
    detail: "We serve 35 counties with no travel surcharge within our normal service area. $3.50/mile beyond that.",
  },
];

const faqs = [
  {
    q: "Do you charge by the acre or by the hour?",
    a: "Most jobs are priced per acre after an on-site evaluation. Hourly rates apply to selective clearing and small or irregular-shaped parcels. We'll tell you which method applies before you commit.",
  },
  {
    q: "Is there a minimum job size?",
    a: "Yes — our minimum is 1 acre or $1,800, whichever is greater. This covers equipment mobilization and ensures we can do quality work on every job.",
  },
  {
    q: "Is mobilization always charged separately?",
    a: "Mobilization ($350) is a standard line item on most jobs. It covers equipment transport to and from your property. On multi-day jobs or larger projects, it may be waived or rolled into the overall estimate.",
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
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
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
                backgroundColor: "rgba(224,123,42,0.1)",
                border: "1px solid rgba(224,123,42,0.25)",
                borderRadius: "4px",
                padding: "0.35rem 0.85rem",
                marginBottom: "1.5rem",
              }}
            >
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A" }}>
                Transparent Pricing
              </span>
            </div>
            <h1
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                lineHeight: 1.05,
                color: "#F0EDE6",
                marginBottom: "1.25rem",
              }}
            >
              What Does It Cost?
            </h1>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1.1rem",
                lineHeight: 1.75,
                color: "rgba(240,237,230,0.7)",
                maxWidth: "620px",
              }}
            >
              These are our actual Jobber service rates — the same numbers you'll see on your estimate. We've also included Middle & West Tennessee market ranges so you can see exactly where we stand.
            </p>
          </div>
        </div>
      </section>

      {/* ── Service Groups ── */}
      {serviceGroups.map((group) => (
        <section
          key={group.id}
          style={{
            padding: "4rem 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="container">
            {/* Group header */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{group.icon}</span>
                <h2
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                    color: "#F0EDE6",
                  }}
                >
                  {group.name}
                </h2>
              </div>
              <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "0.95rem", maxWidth: "600px" }}>
                {group.description}
              </p>
            </div>

            {/* Tiers table */}
            <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(224,123,42,0.08)", borderBottom: "2px solid rgba(224,123,42,0.25)" }}>
                    <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A" }}>Service</th>
                    <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A" }}>Description</th>
                    <th style={{ padding: "0.75rem 1.25rem", textAlign: "right", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A", whiteSpace: "nowrap" }}>Our Price</th>
                    <th style={{ padding: "0.75rem 1.25rem", textAlign: "right", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(224,123,42,0.5)", whiteSpace: "nowrap" }}>TN Market</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tiers.map((tier, i) => (
                    <tr
                      key={tier.label}
                      style={{
                        backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <td style={{ padding: "1rem 1.25rem", fontFamily: "'Oswald', sans-serif", fontWeight: 500, color: "#F0EDE6", whiteSpace: "nowrap", verticalAlign: "top" }}>
                        {tier.label}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.6, verticalAlign: "top" }}>
                        {tier.detail}
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#E07B2A" }}>{tier.price}</span>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", display: "block" }}>{tier.unit}</span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "rgba(240,237,230,0.4)" }}>{tier.tnMarket}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {group.note && (
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "rgba(240,237,230,0.45)", display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                <CheckCircle2 size={12} style={{ color: "#4ade80", flexShrink: 0, marginTop: "3px" }} />
                {group.note}
              </p>
            )}
          </div>
        </section>
      ))}

      {/* ── Add-ons ── */}
      <section
        style={{
          padding: "4rem 0",
          backgroundColor: "#161616",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="container">
          <div style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                color: "#F0EDE6",
                marginBottom: "0.5rem",
              }}
            >
              Add-Ons & Ancillary Services
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "0.95rem" }}>
              These line items may appear on your estimate depending on your project scope.
            </p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(224,123,42,0.08)", borderBottom: "2px solid rgba(224,123,42,0.25)" }}>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A" }}>Add-On</th>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A" }}>Description</th>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "right", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A", whiteSpace: "nowrap" }}>Our Price</th>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "right", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(224,123,42,0.5)", whiteSpace: "nowrap" }}>TN Market</th>
                </tr>
              </thead>
              <tbody>
                {addOns.map((item, i) => (
                  <tr
                    key={item.label}
                    style={{
                      backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "'Oswald', sans-serif", fontWeight: 500, color: "#F0EDE6", whiteSpace: "nowrap", verticalAlign: "top" }}>
                      {item.label}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.6, verticalAlign: "top" }}>
                      {item.detail}
                    </td>
                    <td style={{ padding: "1rem 1.25rem", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#E07B2A" }}>{item.price}</span>
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.45)", display: "block" }}>{item.unit}</span>
                    </td>
                    <td style={{ padding: "1rem 1.25rem", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "rgba(240,237,230,0.4)" }}>{item.tnMarket}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Cost factors table ── */}
      <section
        style={{
          padding: "5rem 0",
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(224,123,42,0.1)", borderBottom: "2px solid rgba(224,123,42,0.3)" }}>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#E07B2A" }}>Factor</th>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#E07B2A" }}>Price Impact</th>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "left", fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#E07B2A" }}>Details</th>
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
                    <td style={{ padding: "1rem 1.25rem", fontFamily: "'Oswald', sans-serif", fontWeight: 500, color: "#F0EDE6", whiteSpace: "nowrap" }}>{row.factor}</td>
                    <td style={{ padding: "1rem 1.25rem", whiteSpace: "nowrap" }}>
                      <ImpactBadge impact={row.impact} />
                    </td>
                    <td style={{ padding: "1rem 1.25rem", color: "rgba(240,237,230,0.65)", lineHeight: 1.6 }}>{row.detail}</td>
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
