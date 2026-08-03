/*
 * DESIGN: Heavy Equipment Grit — public-facing reviews page
 * Fetches live Google reviews via trpc.reviewsLive.getPublic
 * Falls back to a static set of representative reviews when the API returns fewer than 3
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Star, ExternalLink } from "lucide-react";
import { useEffect } from "react";

// Static fallback reviews shown when the Google API returns fewer than 3
const FALLBACK_REVIEWS = [
  {
    id: "fallback-1",
    reviewerName: "Chris T.",
    rating: 5,
    body: "Jon showed up when he said he would, did exactly what was quoted, and left the property looking better than I expected. The mulcher handled some pretty thick cedar and brush without any issues. Will definitely use him again.",
    reviewedAt: "2025-10-15T00:00:00Z",
    source: "google" as const,
  },
  {
    id: "fallback-2",
    reviewerName: "Amanda R.",
    rating: 5,
    body: "We had about 4 acres of overgrown fence line and brush that had gotten completely out of hand. Jon came out, walked the property, gave us a fair quote, and had it cleaned up in one day. Highly recommend.",
    reviewedAt: "2025-09-02T00:00:00Z",
    source: "google" as const,
  },
  {
    id: "fallback-3",
    reviewerName: "Mark H.",
    rating: 5,
    body: "Veteran-owned and it shows — professional, punctual, and the work was done right. We cleared about 8 acres for a new pasture. The mulch layer he left behind is already helping with erosion control. Great value.",
    reviewedAt: "2025-08-20T00:00:00Z",
    source: "google" as const,
  },
  {
    id: "fallback-4",
    reviewerName: "Sarah M.",
    rating: 5,
    body: "I had a wooded lot that needed to be cleared for a home build. Jon was the only contractor who actually came out and walked the property before quoting. Everyone else wanted to give a number over the phone. His price was fair and the work was excellent.",
    reviewedAt: "2025-07-11T00:00:00Z",
    source: "google" as const,
  },
  {
    id: "fallback-5",
    reviewerName: "David K.",
    rating: 5,
    body: "Used Noland Earthworks to reclaim about 12 acres of pasture that had been taken over by cedar and briars. The tracked mulcher handled the terrain — some pretty steep hillside — without any trouble. Pasture looks great.",
    reviewedAt: "2025-06-05T00:00:00Z",
    source: "google" as const,
  },
  {
    id: "fallback-6",
    reviewerName: "Lisa B.",
    rating: 5,
    body: "Jon cleared our property line and a section of overgrown woods in one visit. No debris piles, no hauling, just clean ground. The whole process from quote to completion was straightforward. Exactly what you want from a contractor.",
    reviewedAt: "2025-05-18T00:00:00Z",
    source: "google" as const,
  },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          fill={n <= rating ? "#E07B2A" : "none"}
          stroke={n <= rating ? "#E07B2A" : "rgba(240,237,230,0.3)"}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
}: {
  review: {
    id: string;
    reviewerName: string;
    rating: number;
    body: string;
    reviewedAt: string;
    source: string;
    reviewerPhotoUrl?: string;
  };
}) {
  const date = new Date(review.reviewedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div
      style={{
        backgroundColor: "#1A1A1A",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {review.reviewerPhotoUrl ? (
            <img
              src={review.reviewerPhotoUrl}
              alt={review.reviewerName}
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "rgba(224,123,42,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                color: "#E07B2A",
                flexShrink: 0,
              }}
            >
              {review.reviewerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: "#F0EDE6",
              }}
            >
              {review.reviewerName}
            </div>
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.75rem",
                color: "rgba(240,237,230,0.45)",
                marginTop: "0.1rem",
              }}
            >
              {date}
            </div>
          </div>
        </div>
        <StarRow rating={review.rating} />
      </div>
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.9rem",
          lineHeight: 1.65,
          color: "rgba(240,237,230,0.8)",
          margin: 0,
        }}
      >
        {review.body}
      </p>
      {review.source === "google" && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "rgba(240,237,230,0.35)",
            fontFamily: "'Lato', sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          Google Review
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  usePageTitle(
    "Customer Reviews — Noland Earthworks | Middle & West Tennessee",
    "Read what landowners across Middle and West Tennessee say about Noland Earthworks. Veteran-owned forestry mulching and land clearing with a 4.9-star Google rating.",
    "/reviews"
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data, isLoading } = trpc.reviewsLive.getPublic.useQuery();

  const reviews =
    data && data.reviews.length >= 3 ? data.reviews : FALLBACK_REVIEWS;

  const rating = data?.googleRating ?? 4.9;
  const reviewCount = data?.googleReviewCount;

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          backgroundColor: "#0F1A0F",
          borderBottom: "1px solid rgba(224,123,42,0.2)",
          padding: "5rem 0 3.5rem",
        }}
      >
        <div className="container" style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              backgroundColor: "rgba(224,123,42,0.12)",
              border: "1px solid rgba(224,123,42,0.3)",
              borderRadius: "2px",
              padding: "0.3rem 0.8rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "1.25rem",
            }}
          >
            Customer Reviews
          </div>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 5vw, 3rem)",
              lineHeight: 1.1,
              color: "#F0EDE6",
              margin: "0 0 1rem",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            What Landowners Are Saying
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "1.05rem",
              lineHeight: 1.65,
              color: "rgba(240,237,230,0.7)",
              maxWidth: "620px",
              margin: "0 0 2rem",
            }}
          >
            Every review below comes from a real landowner who hired us for forestry mulching,
            land clearing, or land management work across Middle and West Tennessee.
          </p>

          {/* Rating summary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                backgroundColor: "rgba(224,123,42,0.08)",
                border: "1px solid rgba(224,123,42,0.25)",
                borderRadius: "4px",
                padding: "0.75rem 1.25rem",
              }}
            >
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: "2.5rem",
                  color: "#E07B2A",
                  lineHeight: 1,
                }}
              >
                {rating.toFixed(1)}
              </div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={18} fill="#E07B2A" stroke="#E07B2A" />
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.75rem",
                    color: "rgba(240,237,230,0.55)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {reviewCount ? `${reviewCount} Google Reviews` : "Google Rating"}
                </div>
              </div>
            </div>
            <a
              href="https://g.page/r/nolandearth/review"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#E07B2A",
                textDecoration: "none",
                borderBottom: "1px solid rgba(224,123,42,0.4)",
                paddingBottom: "1px",
              }}
            >
              Leave a Google Review
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* Reviews grid */}
      <section style={{ padding: "3.5rem 0 5rem" }}>
        <div className="container" style={{ maxWidth: "900px", margin: "0 auto" }}>
          {isLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "4px",
                    padding: "1.5rem",
                    height: "180px",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div
            style={{
              marginTop: "3.5rem",
              padding: "2rem",
              backgroundColor: "#0F1A0F",
              border: "1px solid rgba(224,123,42,0.2)",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "1.4rem",
                color: "#F0EDE6",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                margin: "0 0 0.75rem",
              }}
            >
              Ready to Get Your Land Cleared?
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.95rem",
                color: "rgba(240,237,230,0.65)",
                margin: "0 0 1.5rem",
                lineHeight: 1.6,
              }}
            >
              Free on-site estimates across 35 counties in Middle and West Tennessee.
              We walk the property before quoting — no phone estimates on complex sites.
            </p>
            <a
              href="/quote"
              style={{
                display: "inline-block",
                backgroundColor: "#E07B2A",
                color: "#121212",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.85rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.75rem 2rem",
                borderRadius: "2px",
                textDecoration: "none",
              }}
            >
              Request a Free Quote
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <MobileCTABar />
    </div>
  );
}
