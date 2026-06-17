/*
 * DESIGN: Heavy Equipment Grit — Work gallery page
 * Published job photos from ops gallery, with stock fallback when empty.
 */
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { resolveGalleryItems } from "@/lib/gallery";
import type { GalleryDisplayItem } from "@shared/gallery";

const SERVICES = ["All", "Forestry Mulching", "Land Clearing", "Vegetation Management"];

function ProjectCard({ project }: { project: GalleryDisplayItem }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
        <img
          src={project.image}
          alt={project.title}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
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
            {project.acreage ? ` · ${project.acreage}` : ""}
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
    "See real forestry mulching and land clearing work across Middle Tennessee. Overgrown brush, fence lines, pasture reclamation, and more.",
    "/gallery"
  );

  const [activeService, setActiveService] = useState("All");
  const { data: publishedItems } = trpc.gallery.listPublic.useQuery();
  const { items: allItems, usingFallback } = resolveGalleryItems(publishedItems);

  const filtered =
    activeService === "All"
      ? allItems
      : allItems.filter((p) => p.service === activeService);

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

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
            {usingFallback
              ? "Examples of the type of work a tracked forestry mulcher handles across Middle Tennessee — overgrown brush, fence lines, pasture reclamation, and site prep."
              : "Real job photos from forestry mulching and land clearing projects across Middle and West Tennessee."}
          </p>
          {usingFallback && (
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
          )}
        </div>
      </section>

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

      <section style={{ padding: "4rem 0 6rem" }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

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
