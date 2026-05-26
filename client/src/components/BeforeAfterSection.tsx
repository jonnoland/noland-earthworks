/*
 * DESIGN: Heavy Equipment Grit — Before/After showcase on homepage
 * Three image pairs with project type, county, and acreage labels.
 * Hover or tap to reveal the "after" photo.
 * Placeholder images used — replace with real job photos.
 */
import { useState } from "react";
import { Link } from "wouter";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp";
const LAND_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";

type Pair = {
  before: string;
  after: string;
  service: string;
  county: string;
  acreage: string;
  note: string;
};

const PAIRS: Pair[] = [
  {
    before: HERO_IMG,
    after: LAND_IMG,
    service: "Forestry Mulching",
    county: "Williamson County",
    acreage: "4 acres",
    note: "Dense cedar and privet cleared in one day. Mulch layer left as ground cover.",
  },
  {
    before: LAND_IMG,
    after: HERO_IMG,
    service: "Land Management",
    county: "Maury County",
    acreage: "8 acres",
    note: "Overgrown pasture reclaimed for cattle. Fence line cleared and fence posts preserved.",
  },
  {
    before: HERO_IMG,
    after: LAND_IMG,
    service: "Forestry Mulching",
    county: "Rutherford County",
    acreage: "2.5 acres",
    note: "Residential lot cleared for new construction. No debris hauled — mulch stays.",
  },
];

function PairCard({ pair }: { pair: Pair }) {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <div
      className="relative overflow-hidden cursor-pointer select-none"
      style={{ borderRadius: "4px" }}
      onMouseEnter={() => setShowAfter(true)}
      onMouseLeave={() => setShowAfter(false)}
      onClick={() => setShowAfter((v) => !v)}
      aria-label={`${showAfter ? "After" : "Before"}: ${pair.service} in ${pair.county}`}
    >
      {/* Image */}
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        <img
          src={showAfter ? pair.after : pair.before}
          alt={`${showAfter ? "After" : "Before"} — ${pair.service}, ${pair.county}`}
          className="w-full h-full object-cover"
          style={{
            transition: "opacity 0.3s ease",
          }}
        />
        {/* Before / After badge */}
        <div
          style={{
            position: "absolute",
            top: "0.75rem",
            left: "0.75rem",
            backgroundColor: showAfter ? "#E07B2A" : "rgba(0,0,0,0.75)",
            color: "#fff",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "0.25rem 0.6rem",
            borderRadius: "2px",
            transition: "background-color 0.3s ease",
          }}
        >
          {showAfter ? "After" : "Before"}
        </div>
        {/* Hover hint on desktop */}
        {!showAfter && (
          <div
            style={{
              position: "absolute",
              bottom: "0.75rem",
              right: "0.75rem",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "rgba(240,237,230,0.8)",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              padding: "0.2rem 0.5rem",
              borderRadius: "2px",
            }}
            className="hidden sm:block"
          >
            Hover to see after
          </div>
        )}
        {!showAfter && (
          <div
            style={{
              position: "absolute",
              bottom: "0.75rem",
              right: "0.75rem",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "rgba(240,237,230,0.8)",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              padding: "0.2rem 0.5rem",
              borderRadius: "2px",
            }}
            className="sm:hidden"
          >
            Tap to see after
          </div>
        )}
      </div>

      {/* Labels */}
      <div
        style={{
          backgroundColor: "#1A2A1A",
          borderTop: "1px solid rgba(224,123,42,0.2)",
          padding: "0.75rem 1rem",
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "#E07B2A",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {pair.service}
          </span>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              color: "rgba(240,237,230,0.5)",
              letterSpacing: "0.08em",
            }}
          >
            {pair.county} &middot; {pair.acreage}
          </span>
        </div>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8rem",
            color: "rgba(240,237,230,0.65)",
            marginTop: "0.35rem",
            lineHeight: 1.5,
          }}
        >
          {pair.note}
        </p>
      </div>
    </div>
  );
}

export default function BeforeAfterSection() {
  return (
    <section
      style={{
        backgroundColor: "#0F1A0F",
        padding: "5rem 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="container">
        {/* Heading */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "0.5rem",
            }}
          >
            Real Jobs. Real Results.
          </p>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              color: "#F0EDE6",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            Before &amp; After
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "1rem",
              color: "rgba(240,237,230,0.65)",
              maxWidth: "520px",
              lineHeight: 1.6,
            }}
          >
            Hover over any photo to see the finished result. Every job is
            different — these are a few examples of what a tracked forestry
            mulcher can do in a single day.
          </p>
        </div>

        {/* Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          style={{ marginBottom: "2rem" }}
        >
          {PAIRS.map((pair, i) => (
            <PairCard key={i} pair={pair} />
          ))}
        </div>

        {/* CTA link to full gallery */}
        <div>
          <Link
            href="/gallery"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#E07B2A",
              textDecoration: "none",
              borderBottom: "1px solid rgba(224,123,42,0.4)",
              paddingBottom: "2px",
            }}
          >
            View full gallery &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
