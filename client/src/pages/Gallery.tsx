/*
 * DESIGN: Heavy Equipment Grit — Before/After gallery page
 * Shows real job photos organized by service type and county
 */
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp";
const LAND_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";

type Project = {
  id: number;
  title: string;
  county: string;
  service: string;
  acreage: string;
  before: string;
  after: string;
  description: string;
};

// Placeholder projects — replace before/after image URLs with real job photos
const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Overgrown Residential Lot",
    county: "Wilson County",
    service: "Forestry Mulching",
    acreage: "3 acres",
    before: HERO_IMG,
    after: LAND_IMG,
    description: "Dense cedar and privet hedge cleared in a single day. Mulch layer left in place to prevent erosion and suppress regrowth.",
  },
  {
    id: 2,
    title: "Farm Fence Line Reclamation",
    county: "Dickson County",
    service: "Vegetation Management",
    acreage: "1.5 acres",
    before: LAND_IMG,
    after: HERO_IMG,
    description: "Overgrown fence line cleared of invasive species and brush. Property boundary restored and accessible for the first time in years.",
  },
  {
    id: 3,
    title: "New Home Site Preparation",
    county: "Williamson County",
    service: "Land Management",
    acreage: "5 acres",
    before: HERO_IMG,
    after: LAND_IMG,
    description: "Wooded lot cleared and graded for new residential construction. Stumps ground in place, site ready for builder within 2 days.",
  },
  {
    id: 4,
    title: "Hunting Land Brush Clearing",
    county: "Maury County",
    service: "Forestry Mulching",
    acreage: "12 acres",
    before: LAND_IMG,
    after: HERO_IMG,
    description: "Dense undergrowth cleared to open food plots and shooting lanes. Mature trees preserved. Soil undisturbed.",
  },
  {
    id: 5,
    title: "Commercial Development Site",
    county: "Rutherford County",
    service: "Land Management",
    acreage: "8 acres",
    before: HERO_IMG,
    after: LAND_IMG,
    description: "Full site clearing for commercial pad. Debris removed, stumps ground, site graded and ready for construction within 3 days.",
  },
  {
    id: 6,
    title: "Pasture Reclamation",
    county: "Montgomery County",
    service: "Vegetation Management",
    acreage: "20 acres",
    before: LAND_IMG,
    after: HERO_IMG,
    description: "Overgrown pasture reclaimed from invasive species and cedar encroachment. Returned to productive grazing land.",
  },
];

const SERVICES = ["All", "Forestry Mulching", "Land Management", "Vegetation Management"];

function ProjectCard({ project }: { project: Project }) {
  const [showAfter, setShowAfter] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Image toggle */}
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
        <img
          src={showAfter ? project.after : project.before}
          alt={`${showAfter ? "After" : "Before"} — ${project.title}`}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.3s ease" }}
          loading="lazy"
        />
        {/* Before/After toggle */}
        <div
          style={{
            position: "absolute",
            bottom: "0.75rem",
            left: "0.75rem",
            display: "flex",
            gap: "0.35rem",
          }}
        >
          <button
            onClick={() => setShowAfter(false)}
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.3rem 0.75rem",
              backgroundColor: !showAfter ? "#E07B2A" : "rgba(18,18,18,0.85)",
              color: !showAfter ? "#121212" : "rgba(240,237,230,0.7)",
              border: `1px solid ${!showAfter ? "#E07B2A" : "rgba(255,255,255,0.15)"}`,
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              transition: "all 0.2s ease",
            }}
          >
            Before
          </button>
          <button
            onClick={() => setShowAfter(true)}
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.3rem 0.75rem",
              backgroundColor: showAfter ? "#E07B2A" : "rgba(18,18,18,0.85)",
              color: showAfter ? "#121212" : "rgba(240,237,230,0.7)",
              border: `1px solid ${showAfter ? "#E07B2A" : "rgba(255,255,255,0.15)"}`,
              cursor: "pointer",
              backdropFilter: "blur(6px)",
              transition: "all 0.2s ease",
            }}
          >
            After
          </button>
        </div>
        {/* Service badge */}
        <div
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#E07B2A",
            backgroundColor: "rgba(18,18,18,0.85)",
            border: "1px solid rgba(224,123,42,0.3)",
            padding: "0.25rem 0.6rem",
            backdropFilter: "blur(6px)",
          }}
        >
          {project.service}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: "1.25rem" }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              margin: 0,
            }}
          >
            {project.title}
          </h3>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(240,237,230,0.45)",
              letterSpacing: "0.06em",
            }}
          >
            {project.county}
          </span>
          <span style={{ color: "rgba(240,237,230,0.2)" }}>·</span>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(240,237,230,0.45)",
              letterSpacing: "0.06em",
            }}
          >
            {project.acreage}
          </span>
        </div>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "0.875rem",
            lineHeight: 1.65,
            color: "rgba(240,237,230,0.65)",
            margin: 0,
          }}
        >
          {project.description}
        </p>
      </div>
    </div>
  );
}

export default function Gallery() {
  usePageTitle(
    "Before & After Gallery | Noland Earthworks",
    "See real before and after photos of land management and forestry mulching projects across Middle & West Tennessee. Wilson, Dickson, Williamson, Maury, Rutherford, and Montgomery counties.",
    "/gallery"
  );

  const [activeService, setActiveService] = useState("All");

  const filtered = activeService === "All"
    ? PROJECTS
    : PROJECTS.filter((p) => p.service === activeService);

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          backgroundColor: "#0a0a0a",
          paddingTop: "8rem",
          paddingBottom: "3rem",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
          position: "relative",
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#E07B2A" }} />
        <div className="container">
          <div className="section-label mb-4">Our Work</div>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.05,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              maxWidth: "640px",
            }}
          >
            Before &amp; After Gallery
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.05rem",
              lineHeight: 1.7,
              color: "rgba(240,237,230,0.65)",
              maxWidth: "560px",
              marginTop: "1rem",
            }}
          >
            Real projects. Real results. See what professional land management and forestry mulching looks like across Middle & West Tennessee.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section style={{ backgroundColor: "#0F1A0F", borderBottom: "1px solid rgba(224,123,42,0.15)", padding: "1.25rem 0" }}>
        <div className="container">
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveService(s)}
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.4rem 1rem",
                  backgroundColor: activeService === s ? "#E07B2A" : "transparent",
                  color: activeService === s ? "#121212" : "rgba(240,237,230,0.6)",
                  border: `1px solid ${activeService === s ? "#E07B2A" : "rgba(255,255,255,0.12)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery grid */}
      <section style={{ padding: "4rem 0 6rem" }}>
        <div className="container">
          {/* Notice banner */}
          <div
            style={{
              backgroundColor: "rgba(224,123,42,0.07)",
              border: "1px solid rgba(224,123,42,0.2)",
              padding: "1rem 1.5rem",
              marginBottom: "2.5rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.875rem",
              color: "rgba(240,237,230,0.65)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "#E07B2A" }}>Note:</strong> Gallery photos are placeholders. Upload your real job photos to replace them — contact your site administrator to update the gallery with actual before/after images.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop: "4rem",
              padding: "2.5rem",
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "0.75rem",
              }}
            >
              Ready to Transform Your Property?
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1rem",
                color: "rgba(240,237,230,0.6)",
                marginBottom: "1.75rem",
              }}
            >
              Get a free on-site estimate. We serve 35 counties across Middle & West Tennessee.
            </p>
            <a
              href="/quote"
              className="btn-amber"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Get a Free Quote
            </a>
          </div>
        </div>
      </section>

      <MobileCTABar />
      <Footer />
    </div>
  );
}
