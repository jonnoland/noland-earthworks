/*
 * DESIGN: Heavy Equipment Grit — Work gallery page
 * Single-image showcase organized by service type.
 * Images are royalty-free examples — replace with real job photos when available.
 */
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";

// Royalty-free images from Pexels (free to use under Pexels license)
// Replace these with real job photos as they become available
const IMG_OVERGROWN_BRUSH = "/manus-storage/dense-foliage-bushes_2efa77a3.jpg";
const IMG_FORESTRY_MACHINE = "/manus-storage/forestry-mulcher-machine_f900a315.jpg";
const IMG_CLEARED_LAND = "/manus-storage/open-land-treeline_3c257c04.jpg";
const IMG_FENCE_LINE = "/manus-storage/overgrown-fence-line_3a74b356.jpg";
const IMG_OPEN_PASTURE = "/manus-storage/open-pasture-1_cbdb13b4.jpg";
const IMG_OVERGROWN_PATH = "/manus-storage/overgrown-pathway_df75b768.jpg";
const IMG_CLEARED_STUMPS = "/manus-storage/cleared-pasture-stumps_3bcc4b70.jpg";

type Project = {
  id: number;
  title: string;
  county: string;
  service: string;
  acreage: string;
  image: string;
  description: string;
};

const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Dense Brush and Understory",
    county: "Middle Tennessee",
    service: "Forestry Mulching",
    acreage: "Example",
    image: IMG_OVERGROWN_BRUSH,
    description:
      "Thick invasive growth and tangled brush — the kind of property that has gotten away from its owner. A forestry mulcher handles this in a single pass.",
  },
  {
    id: 2,
    title: "Forestry Mulcher at Work",
    county: "Middle Tennessee",
    service: "Forestry Mulching",
    acreage: "Example",
    image: IMG_FORESTRY_MACHINE,
    description:
      "A tracked forestry mulcher working through heavy timber and brush. No debris piles left behind — everything is ground into a mulch layer on the ground.",
  },
  {
    id: 3,
    title: "Cleared Land with Tree Line",
    county: "Middle Tennessee",
    service: "Land Clearing",
    acreage: "Example",
    image: IMG_CLEARED_LAND,
    description:
      "Open, accessible ground after clearing. The tree line is preserved at the property edge. Mulch layer left in place to control erosion and suppress regrowth.",
  },
  {
    id: 4,
    title: "Overgrown Fence Line",
    county: "Middle Tennessee",
    service: "Vegetation Management",
    acreage: "Example",
    image: IMG_FENCE_LINE,
    description:
      "Fence lines that haven't seen daylight in years are one of the most common jobs. The mulcher clears the brush without damaging the fence posts.",
  },
  {
    id: 5,
    title: "Open Pasture Reclaimed",
    county: "Middle Tennessee",
    service: "Land Clearing",
    acreage: "Example",
    image: IMG_OPEN_PASTURE,
    description:
      "Pasture returned to productive use. Cedar encroachment and invasive species cleared. Ground cover left intact to prevent erosion.",
  },
  {
    id: 6,
    title: "Overgrown Property Access",
    county: "Middle Tennessee",
    service: "Vegetation Management",
    acreage: "Example",
    image: IMG_OVERGROWN_PATH,
    description:
      "Overgrown access paths and property boundaries cleared and opened up. No hauling required — mulch stays on the ground.",
  },
  {
    id: 7,
    title: "Reclaimed Pasture Land",
    county: "Middle Tennessee",
    service: "Land Clearing",
    acreage: "Example",
    image: IMG_CLEARED_STUMPS,
    description:
      "Land cleared and returned to open pasture. Stumps left in place or ground down depending on the landowner's needs.",
  },
];

const SERVICES = ["All", "Forestry Mulching", "Land Clearing", "Vegetation Management"];

function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
        <img
          src={project.image}
          alt={project.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
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
        <h3
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: "1rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#F0EDE6",
            margin: "0 0 0.5rem 0",
          }}
        >
          {project.title}
        </h3>
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
    "Forestry Mulching & Land Clearing Gallery — Tennessee",
    "See examples of forestry mulching and land clearing work across Middle Tennessee. Overgrown brush, fence lines, pasture reclamation, and more.",
    "/gallery"
  );

  const [activeService, setActiveService] = useState("All");

  const filtered =
    activeService === "All"
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
            Work Gallery
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
            Examples of the type of work a tracked forestry mulcher handles across Middle Tennessee — overgrown brush, fence lines, pasture reclamation, and site prep.
          </p>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              color: "rgba(240,237,230,0.35)",
              marginTop: "0.75rem",
              fontStyle: "italic",
            }}
          >
            Photos shown are representative examples. Real job photos will be added as they become available.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section
        style={{
          backgroundColor: "#0F1A0F",
          borderBottom: "1px solid rgba(224,123,42,0.15)",
          padding: "1.25rem 0",
        }}
      >
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
              Ready to Get Your Property Under Control?
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
              Free on-site estimate. I serve 35 counties across Middle Tennessee.
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
