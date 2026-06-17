/*
 * DESIGN: Heavy Equipment Grit — Work showcase on homepage
 * Pulls featured published photos from the gallery API, with stock fallback.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { resolveGalleryItems } from "@/lib/gallery";
import { galleryPhotoTypeLabel } from "@shared/gallery";

function WorkCard({
  image,
  badge,
  caption,
}: {
  image: string;
  badge: string;
  caption: string;
}) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: "4px" }}>
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        <img
          src={image}
          alt={badge}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div
          style={{
            position: "absolute",
            top: "0.75rem",
            left: "0.75rem",
            backgroundColor: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "0.25rem 0.6rem",
            borderRadius: "2px",
          }}
        >
          {badge}
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#1A2A1A",
          borderTop: "1px solid rgba(224,123,42,0.2)",
          padding: "0.85rem 1rem",
        }}
      >
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            color: "rgba(240,237,230,0.7)",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {caption}
        </p>
      </div>
    </div>
  );
}

export default function BeforeAfterSection() {
  const { data: featuredItems } = trpc.gallery.listPublic.useQuery({ featuredOnly: true, limit: 3 });
  const { items, usingFallback } = resolveGalleryItems(featuredItems, { featuredOnly: true, limit: 3 });

  return (
    <section
      style={{
        backgroundColor: "#0F1A0F",
        padding: "5rem 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="container">
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
            The Work
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
            What Forestry Mulching Looks Like
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
            Overgrown land goes in, usable property comes out. A tracked
            forestry mulcher handles dense brush, saplings, and small trees —
            grinding everything into a mulch layer that stays on the ground.
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
              Representative examples shown — real job photos coming soon.
            </p>
          )}
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          style={{ marginBottom: "2rem" }}
        >
          {items.map((card) => (
            <WorkCard
              key={card.id}
              image={card.image}
              badge={
                card.photoType && card.photoType !== "general"
                  ? galleryPhotoTypeLabel(card.photoType)
                  : card.service
              }
              caption={card.description || card.title}
            />
          ))}
        </div>

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
