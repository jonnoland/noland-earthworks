/*
 * DESIGN: Heavy Equipment Grit — matches site style
 * Pricing Guide page — transparent pricing ranges for Middle & West Tennessee
 * Based on Tennessee market research for land management / forestry mulching services
 */
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import CostCalculator from "@/components/CostCalculator";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ChevronDown, ChevronUp, Phone, CheckCircle2, AlertCircle, TreePine, Layers, Ruler, Mountain, Truck, Flame, MapPin } from "lucide-react";

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
        range: "$1,000 – $1,500",
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
    note: "Minimum job size: 1 acre or $1,800, whichever is greater.",
    href: "/services/forestry-mulching",
  },
  {
    id: "land-management",
    name: "Land Management",
    tagline: "Full-site preparation for construction or agriculture",
    icon: "🏗️",
    description:
      "Complete removal of trees, stumps, brush, and debris. Site is cleared and ready for building, farming, or pasture use.",
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
    note: "Stump grinding is included. Debris disposal expectations should be discussed during the site visit.",
    href: "/services/land-management",
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
    id: "right-of-way-clearing",
    name: "Right-of-Way Clearing",
    tagline: "Access roads, utility corridors, and property boundaries",
    icon: "🛤️",
    description:
      "Dedicated ROW clearing for private access roads, driveway corridors, fence lines, pipeline easements, and property boundary lines. We cut, mulch, and maintain the corridor width you need — leaving surrounding land undisturbed.",
    priceUnit: "per linear foot or per acre",
    tiers: [
      {
        label: "Driveway / Access Road Corridor",
        range: "$2.00 – $5.00 / linear ft",
        detail: "Single-pass clearing 10–20 ft wide along a private drive or access road, light-to-moderate brush",
      },
      {
        label: "Easement / Pipeline ROW",
        range: "$1,200 – $2,800 / acre",
        detail: "Utility, pipeline, or fence-line easement, moderate growth, corridor 20–60 ft wide",
      },
      {
        label: "Overgrown ROW Reclamation",
        range: "$2,800 – $5,500+ / acre",
        detail: "Heavily overgrown corridors with mature trees, multi-stem growth, or years of neglect",
      },
    ],
    note: "Recurring annual maintenance contracts available — keep your corridor open year after year at a reduced rate.",
    href: "/services/right-of-way-clearing",
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
  {
    id: "post-clear-seeding",
    name: "Post-Clear Seeding & Erosion Control",
    tagline: "Protect bare ground after clearing",
    icon: "🌱",
    description:
      "Broadcast seeding, erosion blanket installation, and ground cover application following land management or forestry mulching. Keeps topsoil in place and establishes ground cover before the next rain.",
    priceUnit: "per acre",
    tiers: [
      {
        label: "Broadcast Seeding",
        range: "$150 – $350 / acre",
        detail: "Seed mix selected for terrain and intended use — pasture, wildlife, or erosion control",
      },
      {
        label: "Seeding + Erosion Blanket",
        range: "$350 – $700 / acre",
        detail: "Seed plus biodegradable erosion control blanket on slopes and drainage areas",
      },
      {
        label: "Full Site Stabilization",
        range: "$700 – $1,500 / acre",
        detail: "Comprehensive seeding, blanket, and straw mulch application for high-erosion or steep sites",
      },
    ],
    note: "Best scheduled immediately after clearing while ground is freshly worked. Seed mix varies by intended land use — pasture, wildlife habitat, or erosion control.",
    href: "/services/post-clear-seeding",
    isAddon: true,
  },
  {
    id: "fence-line-clearing",
    name: "Fence Line Clearing",
    tagline: "Reclaim your boundaries without a second mobilization",
    icon: "🚧",
    description:
      "Clearing overgrown brush, saplings, and encroaching vegetation along fence rows and property boundaries. Priced per linear foot and typically added to land management or pasture reclamation jobs at no additional mobilization cost.",
    priceUnit: "per linear foot",
    tiers: [
      {
        label: "Light Overgrowth",
        range: "$1.50 – $3.00 / linear ft",
        detail: "Grass, briars, and light brush along established fence lines",
      },
      {
        label: "Moderate Brush",
        range: "$3.00 – $6.00 / linear ft",
        detail: "Established brush and small saplings encroaching on fence",
      },
      {
        label: "Heavy Overgrowth",
        range: "$6.00 – $12.00 / linear ft",
        detail: "Dense brush, vines, and trees overtaking fence line — fence may not be visible",
      },
    ],
    note: "Most cost-effective when added to an existing land management or pasture job — same mobilization, no additional trip charge.",
    href: "/services/fence-line-clearing",
    isAddon: true,
  },
  {
    id: "mulch-redistribution",
    name: "Mulch Redistribution",
    tagline: "Finish the job with a clean, uniform ground cover",
    icon: "🪵",
    description:
      "After forestry mulching, redistribute or concentrate the mulch layer around specific areas — drainage channels, tree buffers, landscaping edges, or bare spots. Leaves the property with a clean, intentional finish.",
    priceUnit: "per hour",
    tiers: [
      {
        label: "Spot Redistribution",
        range: "$150 – $300",
        detail: "Targeted redistribution of mulch in specific areas — 1–2 hours of machine time",
      },
      {
        label: "Full Site Finish",
        range: "$300 – $700",
        detail: "Uniform mulch layer spread across the entire cleared area",
      },
      {
        label: "Drainage & Buffer Work",
        range: "$400 – $900",
        detail: "Concentrated mulch application along drainage channels and sensitive buffer zones",
      },
    ],
    note: "Add-on to any forestry mulching job. Scheduled same day as the primary clearing work.",
    href: "/services/mulch-redistribution",
    isAddon: true,
  },
  {
    id: "selective-clearing-consultation",
    name: "Selective Clearing & Tree Preservation",
    tagline: "Precision clearing — keep what matters, remove the rest",
    icon: "🌳",
    description:
      "Pre-job site walkthrough to identify and flag trees for preservation, mark clearing boundaries, and document scope before work begins. Reduces scope disputes, protects valuable hardwoods, and ensures the finished property matches your vision.",
    priceUnit: "flat fee",
    tiers: [
      {
        label: "Consultation Walkthrough",
        range: "$150 – $300",
        detail: "On-site walkthrough, tree flagging, and boundary marking — fee applied toward job if booked",
      },
      {
        label: "Precision Clearing Premium",
        range: "$200 – $500 / acre",
        detail: "Premium rate applied to jobs requiring detailed selective clearing around preserved trees or structures",
      },
    ],
    note: "Consultation fee is credited toward the job total when you proceed with booking. Recommended for any job where specific trees, structures, or boundary areas require special attention.",
    href: "/services/selective-clearing",
    isAddon: true,
  },
];

const costFactors = [
  {
    factor: "Acreage",
    impact: "High",
    detail:
      "Larger jobs cost more in total but often less per acre due to equipment mobilization being spread across more work.",
    icon: "Ruler",
    expanded: {
      headline: "More acres = lower cost per acre",
      body: "Equipment mobilization — getting the machine to your property and back — is a fixed cost regardless of job size. On a 1-acre job that cost might represent $200–$350/acre of overhead. On a 10-acre job, that same mobilization cost spreads to $20–$35/acre. This is why larger jobs almost always come in at a better per-acre rate. If you're on the fence about clearing an adjacent parcel, doing it in the same visit is almost always the most cost-effective approach.",
      example: "A 2-acre forestry mulch job at $1,200/acre = $2,400 total. The same property at 5 acres might price at $1,050/acre = $5,250 — saving $750 vs. two separate jobs.",
    },
  },
  {
    factor: "Vegetation Density",
    impact: "High",
    detail:
      "Light brush clears 2–3× faster than heavy timber. Dense cedar or multi-stem hardwoods significantly increase time and cost.",
    icon: "Layers",
    expanded: {
      headline: "The single biggest driver of job cost",
      body: "A forestry mulcher can process light brush at 1–2 acres per hour. Heavy timber, thick cedar, or dense multi-stem growth slows that to 0.25–0.5 acres per hour — a 4–8× difference in machine time. When we walk your property before quoting, vegetation density is the first thing we assess. We look at canopy cover, stem count per acre, and average trunk diameter to determine which pricing tier applies.",
      example: "A 3-acre parcel with light saplings and open canopy: $1,000–$1,500/acre. The same 3 acres with mature cedar thickets and multi-stem hardwoods: $2,500–$4,500/acre.",
    },
  },
  {
    factor: "Tree Size & Species",
    impact: "High",
    detail:
      "Mature hardwoods (oak, hickory) and large pines take more time than saplings. Trees over 12″ diameter add cost.",
    icon: "TreePine",
    expanded: {
      headline: "Hardwoods and large-diameter trees take more time",
      body: "Forestry mulching machines are rated by the diameter of wood they can process efficiently. Most skid-steer mulchers handle up to 6–8″ diameter trees at full speed. Trees in the 8–14″ range require slower, more deliberate passes. Anything over 14″ may require multiple passes or a larger track machine. Species also matters: cedar and pine mulch quickly; dense hardwoods like oak and hickory take significantly longer. During your estimate, we'll note any large-diameter trees that may affect pricing.",
      example: "A field of 4″ cedar saplings: standard rate. A mix of 10–14″ oak and hickory with dense understory: expect the heavy timber tier.",
    },
  },
  {
    factor: "Terrain & Slope",
    impact: "Medium",
    detail:
      "Steep slopes, wet areas, or rocky ground slow equipment and may require different machinery.",
    icon: "Mountain",
    expanded: {
      headline: "Slope and ground conditions affect equipment speed and safety",
      body: "Tracked forestry mulchers handle slopes up to about 30–35 degrees safely. Beyond that, work slows considerably and operator safety becomes a factor. Wet or boggy ground can limit access entirely — we may need to wait for dry conditions or use different equipment. Rocky outcroppings and buried debris (old fence wire, concrete) also slow progress and can damage cutting heads. Middle Tennessee's rolling terrain is generally manageable, but we always note slope and soil conditions during the estimate walk.",
      example: "Flat, dry ground: standard rate. A hillside parcel with 25° slopes and seasonal wet areas: expect a 15–25% terrain surcharge.",
    },
  },
  {
    factor: "Site Access",
    impact: "Medium",
    detail:
      "Narrow gates, soft ground, or long travel distances from the road affect mobilization and equipment positioning.",
    icon: "Truck",
    expanded: {
      headline: "Getting equipment on-site is part of the job",
      body: "Our track machines are transported on a trailer that needs a gate or opening at least 10–12 feet wide. If your property has a narrow gate, a low-hanging power line at the entrance, or a long soft-ground driveway, that adds time and complexity to mobilization. We also factor in how far the work area is from where we can park the trailer. Properties with easy road access and a clear staging area are the most efficient — and the least expensive — to work on.",
      example: "A property with a wide gravel driveway and easy gate access: standard mobilization. A property requiring a ¼-mile drive down a soft field road to reach the work area: additional mobilization time may be quoted.",
    },
  },
  {
    factor: "Debris Disposal",
    impact: "Medium",
    detail:
      "Forestry mulching leaves mulch on-site (no haul cost). Land clearing with haul-away adds disposal fees.",
    icon: "Flame",
    expanded: {
      headline: "How you handle the material changes the price significantly",
      body: "Forestry mulching is the lowest-cost disposal method because there's nothing to haul — the machine grinds everything into a mulch layer that stays on-site. Traditional land management generates large volumes of brush, logs, and stumps that must be piled, burned (where permitted), or hauled to a disposal site. Haul-away requires additional equipment (skid steers, dump trucks) and tipping fees at the disposal site. If burning is an option on your property, it's typically the next most cost-effective method after mulching.",
      example: "Forestry mulching a 3-acre parcel: no disposal cost — mulch stays on-site. Land clearing the same 3 acres with haul-away: add $500–$1,500 in disposal costs depending on debris volume.",
    },
  },
  {
    factor: "Distance from Valneer, TN",
    impact: "Low",
    detail:
      "We serve 35 counties with no travel surcharge within our normal service area.",
    icon: "MapPin",
    expanded: {
      headline: "Most of our service area has no travel surcharge",
      body: "Our base of operations is in Valneer, TN. We serve 35 counties across Middle and West Tennessee — from Davidson and Williamson counties in the east to Shelby and Tipton in the west — with no additional travel fee. For properties outside our standard service area, we charge $3.50 per mile beyond the boundary. If you're unsure whether your property falls within our free service zone, just ask when you request your estimate.",
      example: "A job in Humphreys County (within service area): no travel surcharge. A job in an outlying county 80 miles from Valneer: approximately $280 in travel fees added to the estimate.",
    },
  },
];

const faqs = [
  {
    q: "Do you charge by the acre or by the hour?",
    a: "Most jobs are priced per acre after an on-site evaluation. Hourly rates are used for small or irregular-shaped parcels where acreage pricing doesn't apply. We'll tell you which method we'll use before you commit.",
  },
  {
    q: "Is there a minimum job size?",
    a: "Yes — our minimum is 1 acre or $1,800, whichever is greater. This covers equipment mobilization and ensures we can do quality work on every job.",
  },
  {
    q: "Why is forestry mulching sometimes cheaper than land management?",
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
    a: "Forestry mulching grinds stumps flush with the ground in the same pass — included at no extra charge. For traditional land management, stump grinding is included in our estimates unless otherwise noted.",
  },
  {
    q: "How is right-of-way clearing priced differently from general land management?",
    a: "ROW clearing is priced by the linear foot for narrow corridors (driveways, fence lines) or by the acre for wider easements. Because ROW work is long and narrow, equipment must make more passes per acre than open-field clearing — which is why per-acre rates are sometimes slightly higher than general land management. We'll measure your corridor and quote whichever unit makes more sense for your project.",
  },
  {
    q: "Do you offer recurring ROW maintenance contracts?",
    a: "Yes. Many landowners, utility easement holders, and pipeline companies need their corridors cleared on an annual or bi-annual schedule. We offer maintenance contracts with preferred pricing for repeat customers — typically 10–20% below one-time rates. Ask about this when you request your estimate.",
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

/* ─── CostFactorCard ────────────────────────────────────────────────── */

const iconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Ruler,
  Layers,
  TreePine,
  Mountain,
  Truck,
  Flame,
  MapPin,
};

function CostFactorCard({ row }: { row: typeof costFactors[number] }) {
  const [open, setOpen] = useState(false);
  const Icon = iconMap[row.icon] ?? MapPin;
  const impactColors: Record<string, string> = {
    High: "#dc2626",
    Medium: "#E07B2A",
    Low: "#4ade80",
  };
  const color = impactColors[row.impact] ?? "#F0EDE6";

  return (
    <div
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "6px",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(224,123,42,0.3)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      {/* Card header */}
      <div style={{ padding: "1.5rem 1.5rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "6px",
              backgroundColor: `${color}15`,
              border: `1px solid ${color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
              <h3
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: "1.05rem",
                  color: "#F0EDE6",
                  margin: 0,
                }}
              >
                {row.factor}
              </h3>
              <ImpactBadge impact={row.impact} />
            </div>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "rgba(240,237,230,0.6)", lineHeight: 1.6, margin: 0 }}>
              {row.detail}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div
          style={{
            padding: "0 1.5rem 1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "1.25rem",
          }}
        >
          <p
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "#E07B2A",
              letterSpacing: "0.04em",
              marginBottom: "0.6rem",
              textTransform: "uppercase",
            }}
          >
            {row.expanded.headline}
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.9rem", color: "rgba(240,237,230,0.75)", lineHeight: 1.75, marginBottom: "1rem" }}>
            {row.expanded.body}
          </p>
          <div
            style={{
              backgroundColor: "rgba(224,123,42,0.06)",
              border: "1px solid rgba(224,123,42,0.15)",
              borderRadius: "4px",
              padding: "0.85rem 1rem",
            }}
          >
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "rgba(240,237,230,0.6)", lineHeight: 1.65, margin: 0 }}>
              <span style={{ fontWeight: 700, color: "#E07B2A", marginRight: "0.4rem" }}>Example:</span>
              {row.expanded.example}
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          padding: "0.65rem",
          background: "none",
          border: "none",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          cursor: "pointer",
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 500,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(224,123,42,0.7)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E07B2A"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(224,123,42,0.7)"; }}
      >
        {open ? (
          <><ChevronUp size={13} /> Less detail</>
        ) : (
          <><ChevronDown size={13} /> More detail</>
        )}
      </button>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function PricingPage() {
  usePageTitle(
    "Land Management & Forestry Mulching Pricing Guide — Middle & West Tennessee | Noland Earthworks",
    "Transparent pricing for land management and forestry mulching in Tennessee. Typical costs range $1,000–$4,500/acre. Use our free estimate calculator to get a rough number in 30 seconds.",
    "/pricing"
  );
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
              What Does Land Management<br />
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

      {/* ── Cost calculator ── */}
      <section
        style={{
          padding: "5rem 0",
          background: "linear-gradient(180deg, #121212 0%, #1a1208 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "rgba(224,123,42,0.1)",
                border: "1px solid rgba(224,123,42,0.25)",
                borderRadius: "4px",
                padding: "0.35rem 0.85rem",
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E07B2A" }}>
                Estimate Tool
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                color: "#F0EDE6",
                marginBottom: "0.75rem",
              }}
            >
              Get a Rough Number
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "1rem", maxWidth: "520px", margin: "0 auto" }}>
              Plug in your property details and see a ballpark range in seconds. For a firm quote, we’ll walk your land — free.
            </p>
          </div>
          <CostCalculator />
        </div>
      </section>

      {/* ── Cost factors — expanded cards ── */}
      <section
        style={{
          padding: "5rem 0",
          backgroundColor: "#161616",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
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
              What Affects Your Price?
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.6)", fontSize: "1rem", maxWidth: "580px", margin: "0 auto" }}>
              Seven factors determine the final cost of any land management or forestry mulching job. Here's exactly how each one works — and what it means for your estimate.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))",
              gap: "1.5rem",
            }}
          >
            {costFactors.map((row) => (
              <CostFactorCard key={row.factor} row={row} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Forestry mulching vs land management comparison ── */}
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
              Forestry Mulching vs. Traditional Land Management
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
                    🏗️ Traditional Land Management
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

      <MobileCTABar />
      <Footer />
    </div>
  );
}
