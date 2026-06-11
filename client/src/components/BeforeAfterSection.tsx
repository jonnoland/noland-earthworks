/*
 * DESIGN: Heavy Equipment Grit — Work showcase on homepage
 * Three image cards showing the type of work done.
 * Images are royalty-free examples — replace with real job photos when available.
 */
import { Link } from "wouter";

// Royalty-free images from Pexels (free to use under Pexels license)
// Replace these with real job photos as they become available
const IMG_OVERGROWN_BRUSH =
  "/manus-storage/dense-foliage-bushes_2efa77a3.jpg";
const IMG_FORESTRY_MACHINE =
  "/manus-storage/forestry-mulcher-machine_f900a315.jpg";
const IMG_CLEARED_LAND =
  "/manus-storage/open-land-treeline_3c257c04.jpg";
const IMG_FENCE_LINE =
  "/manus-storage/overgrown-fence-line_3a74b356.jpg";
const IMG_OPEN_PASTURE =
  "/manus-storage/open-pasture-1_cbdb13b4.jpg";
const IMG_OVERGROWN_PATH =
  "/manus-storage/overgrown-pathway_df75b768.jpg";

type Card = {
  image: string;
  service: string;
  caption: string;
};

const CARDS: Card[] = [
  {
    image: IMG_OVERGROWN_BRUSH,
    service: "Before: Overgrown Property",
    caption:
      "Dense brush, invasive growth, and tangled understory — the kind of property that has gotten away from its owner.",
  },
  {
    image: IMG_FORESTRY_MACHINE,
    service: "Forestry Mulching in Action",
    caption:
      "A tracked forestry mulcher grinds through heavy vegetation. No debris piles, no hauling, no burning.",
  },
  {
    image: IMG_CLEARED_LAND,
    service: "After: Usable Land",
    caption:
      "Open, accessible ground with a mulch layer left in place. Ready for whatever the landowner needs it for.",
  },
];

function WorkCard({ card }: { card: Card }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ borderRadius: "4px" }}
    >
      {/* Image */}
      <div className="relative" style={{ aspectRatio: "16/9" }}>
        <img
          src={card.image}
          alt={card.service}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Service badge */}
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
          {card.service}
        </div>
      </div>

      {/* Caption */}
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
          {card.caption}
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
        </div>

        {/* Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          style={{ marginBottom: "2rem" }}
        >
          {CARDS.map((card, i) => (
            <WorkCard key={i} card={card} />
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
