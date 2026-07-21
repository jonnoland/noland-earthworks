/*
 * Public Work Gallery — pulls live photos from the database.
 * Photos are managed in /ops/gallery and marked visible=true to appear here.
 * Falls back to an empty state with a CTA when no photos have been uploaded yet.
 */
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";

const SERVICE_LABELS: Record<string, string> = {
  "forestry-mulching": "Forestry Mulching",
  "land-management": "Land Management",
  "brush-hogging": "Brush Hogging",
  "vegetation-management": "Vegetation Management",
  "gravel-driveway": "Gravel / Driveway",
  other: "Other",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Work" },
  { value: "forestry-mulching", label: "Forestry Mulching" },
  { value: "land-management", label: "Land Management" },
  { value: "brush-hogging", label: "Brush Hogging" },
  { value: "vegetation-management", label: "Vegetation Management" },
];

const PHOTO_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  before: { label: "Before", color: "#b91c1c" },
  after: { label: "After", color: "#15803d" },
  general: { label: "", color: "" },
};

function PhotoCard({ photo }: { photo: {
  id: number;
  url: string;
  title: string;
  description: string | null;
  serviceType: string;
  county: string;
  acreage: string | null;
  photoType: string;
} }) {
  const badge = PHOTO_TYPE_BADGE[photo.photoType] ?? PHOTO_TYPE_BADGE.general;

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
          src={photo.url}
          alt={photo.title ? `${photo.title} — Noland Earthworks, Tennessee` : (SERVICE_LABELS[photo.serviceType] ? `${SERVICE_LABELS[photo.serviceType]} job — Noland Earthworks, Middle Tennessee` : "Forestry mulching job photo — Noland Earthworks, Tennessee")}
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
          {SERVICE_LABELS[photo.serviceType] ?? photo.serviceType}
        </div>
        {/* Before/After badge */}
        {badge.label && (
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              left: "0.75rem",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#fff",
              backgroundColor: badge.color,
              padding: "0.25rem 0.6rem",
            }}
          >
            {badge.label}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "1.25rem" }}>
        {photo.title && (
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
            {photo.title}
          </h3>
        )}
        <div className="flex items-center gap-3 mb-3">
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.72rem",
              color: "rgba(240,237,230,0.45)",
              letterSpacing: "0.06em",
            }}
          >
            {photo.county}
            {photo.acreage ? ` — ${photo.acreage}` : ""}
          </span>
        </div>
        {photo.description && (
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
            {photo.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Gallery() {
  usePageTitle(
    "Forestry Mulching & Land Management Gallery — Tennessee",
    "See examples of forestry mulching and land management work across Middle Tennessee. Overgrown brush, fence lines, pasture reclamation, and more.",
    "/gallery"
  );

  const [activeService, setActiveService] = useState<string>("all");

  const { data: photos = [], isLoading } = trpc.gallery.listPublic.useQuery({
    serviceType: activeService as "all" | "forestry-mulching" | "land-management" | "brush-hogging" | "vegetation-management" | "gravel-driveway" | "other",
  });

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
            Real job photos from forestry mulching, land management, and vegetation management work across Middle Tennessee.
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
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveService(opt.value)}
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "0.4rem 1rem",
                  backgroundColor: activeService === opt.value ? "#E07B2A" : "transparent",
                  color: activeService === opt.value ? "#121212" : "rgba(240,237,230,0.6)",
                  border: `1px solid ${activeService === opt.value ? "#E07B2A" : "rgba(255,255,255,0.12)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery grid */}
      <section style={{ padding: "4rem 0 6rem" }}>
        <div className="container">
          {isLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "16/9",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "5rem 2rem",
                color: "rgba(240,237,230,0.4)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: "1.25rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: "0.75rem",
                  color: "rgba(240,237,230,0.5)",
                }}
              >
                Photos Coming Soon
              </p>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Real job photos are being added. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </div>
          )}

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
