/*
 * DESIGN: Heavy Equipment Grit — public-facing reviews page
 * Fetches verified Google reviews via trpc.reviewsLive.getPublic.
 * Shows an honest empty state until verified reviews are available.
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Star, ExternalLink } from "lucide-react";
import { useEffect } from "react";

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
    "Read verified customer feedback from Noland Earthworks clients across Middle and West Tennessee.",
    "/reviews"
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data, isLoading } = trpc.reviewsLive.getPublic.useQuery();

  const reviews = data?.reviews ?? [];
  const rating = data?.googleRating ?? null;
  const reviewCount = data?.googleReviewCount ?? null;

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
            {reviews.length > 0
              ? "Verified Google reviews from landowners who hired Noland Earthworks for forestry mulching or land management work."
              : "We publish verified customer feedback only. Recent project photos and job details are available in the gallery while the review feed is updated."}
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
            {rating !== null && reviewCount !== null ? (
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
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "2.5rem", color: "#E07B2A", lineHeight: 1 }}>
                  {rating.toFixed(1)}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={18} fill={n <= Math.round(rating) ? "#E07B2A" : "none"} stroke="#E07B2A" />
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "rgba(240,237,230,0.55)", letterSpacing: "0.08em" }}>
                    {`${reviewCount} Google Review${reviewCount === 1 ? "" : "s"}`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: "rgba(224,123,42,0.08)", border: "1px solid rgba(224,123,42,0.25)", borderRadius: "4px", padding: "0.75rem 1.25rem", fontFamily: "'Lato', sans-serif", fontSize: "0.82rem", color: "rgba(240,237,230,0.72)" }}>
                Verified review feed is being connected.
              </div>
            )}
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
          ) : reviews.length > 0 ? (
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
          ) : (
            <div
              style={{
                backgroundColor: "#1A1A1A",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "4px",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <p style={{ fontFamily: "'Lato', sans-serif", color: "rgba(240,237,230,0.78)", margin: 0, lineHeight: 1.65 }}>
                We do not publish placeholder reviews. Check back for verified customer feedback, or view recent work in the gallery.
              </p>
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
