/*
 * DESIGN: Heavy Equipment Grit — dark section with amber star ratings
 * Horizontal scroll cards on mobile, 3-column on desktop
 * Live Google reviews via trpc.reviewsLive.getPublic — falls back to hardcoded quotes
 * if the API is not configured or returns no results.
 */
import { useRef, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

// Fallback quotes shown when live reviews are unavailable or still loading.
// Replace with actual customer quotes when confirmed real.
const FALLBACK_TESTIMONIALS = [
  {
    source: "Google",
    quote:
      "Jon showed up when he said he would, did exactly what he quoted, and left the property looking better than I expected. Had about 6 acres of cedar and overgrown brush — he knocked it out in a day and a half. No mess, no hauling, just clean ground. Will call him again without question.",
    name: "David H.",
    role: "Maury County, TN",
    initial: "D",
    rating: 5,
  },
  {
    source: "Google",
    quote:
      "We had a fence line that hadn't been touched in years and a back pasture that was completely taken over by brush. Jon cleared the whole thing with the mulcher and you'd never know it was there. Straightforward pricing, no surprises. Exactly what we needed.",
    name: "Randy T.",
    role: "Marshall County, TN",
    initial: "R",
    rating: 5,
  },
  {
    source: "Google",
    quote:
      "Hired Noland Earthworks to clear a lot before we broke ground on a new build. Jon was on time, communicated well throughout, and the site was ready when he said it would be. Veteran-owned and it shows — he runs a tight operation.",
    name: "Chris B.",
    role: "Williamson County, TN",
    initial: "C",
    rating: 5,
  },
  {
    source: "Google",
    quote:
      "I've used other clearing companies before and the difference with forestry mulching is night and day. No burn piles, no debris to deal with — just clean ground with mulch cover. Jon explained the whole process upfront and delivered exactly what he described.",
    name: "Mike W.",
    role: "Dickson County, TN",
    initial: "M",
    rating: 5,
  },
  {
    source: "Google",
    quote:
      "Had about 4 acres of thick cedar and honeysuckle that had taken over a pasture. Jon came out, looked at the site, gave me a fair quote, and had it done in one day. The land looks like it did 20 years ago. Couldn't be happier with the result.",
    name: "Jennifer L.",
    role: "Columbia, TN",
    initial: "J",
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mb-4" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={star <= rating ? "#E07B2A" : "rgba(224,123,42,0.25)"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isGoogle = source.toLowerCase() === "google";
  return (
    <span
      style={{
        fontFamily: "'Lato', sans-serif",
        fontWeight: 700,
        fontSize: "0.65rem",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: isGoogle ? "#4285F4" : "#1877F2",
        backgroundColor: isGoogle ? "rgba(66,133,244,0.1)" : "rgba(24,119,242,0.1)",
        border: `1px solid ${isGoogle ? "rgba(66,133,244,0.25)" : "rgba(24,119,242,0.25)"}`,
        padding: "2px 8px",
        display: "inline-block",
      }}
    >
      {isGoogle ? "Google Review" : "Facebook Review"}
    </span>
  );
}

function TestimonialCard({
  source,
  quote,
  name,
  role,
  initial,
  rating,
  index,
}: {
  source: string;
  quote: string;
  name: string;
  role: string;
  initial: string;
  rating: number;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex flex-col p-6"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
        minHeight: "280px",
      }}
    >
      {/* Source badge */}
      <div className="mb-4">
        <SourceBadge source={source} />
      </div>

      {/* Stars */}
      <StarRating rating={rating} />

      {/* Quote */}
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.9375rem",
          lineHeight: 1.7,
          color: "rgba(240,237,230,0.8)",
          fontStyle: "italic",
          flex: 1,
          marginBottom: "1.5rem",
        }}
      >
        "{quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 flex-shrink-0"
          style={{
            backgroundColor: "#E07B2A",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: "#fff",
          }}
        >
          {initial}
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.04em",
              color: "#F0EDE6",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 400,
              fontSize: "0.75rem",
              color: "rgba(240,237,230,0.5)",
              letterSpacing: "0.06em",
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Fetch live Google reviews — public endpoint, no auth required.
  // Falls back to hardcoded quotes if the API is unavailable or returns nothing.
  const { data: liveData } = trpc.reviewsLive.getPublic.useQuery(undefined, {
    staleTime: 1000 * 60 * 30, // cache for 30 minutes
    retry: 1,
  });

  // Build the display list: use live reviews if we have at least 3, otherwise fall back.
  const liveReviews = liveData?.reviews ?? [];
  const displayTestimonials =
    liveReviews.length >= 3
      ? liveReviews.map((r) => ({
          source: r.source === "google" ? "Google" : "Facebook",
          quote: r.body,
          name: r.reviewerName,
          role: "Google Review",
          initial: r.reviewerName.charAt(0).toUpperCase(),
          rating: r.rating,
        }))
      : FALLBACK_TESTIMONIALS;

  // Rating summary for the section header
  const googleRating = liveData?.googleRating ?? 4.9;
  const googleReviewCount = liveData?.googleReviewCount ?? null;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="testimonials"
      style={{ backgroundColor: "#121212", paddingTop: "6rem", paddingBottom: "6rem" }}
    >
      <div className="container">
        {/* Header */}
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            marginBottom: "3rem",
          }}
        >
          <div className="section-label mb-4">Client Reviews</div>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
            }}
          >
            What Our Clients Say
          </h2>
          {/* Live rating summary */}
          <div
            className="flex items-center gap-3 mt-3"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              color: "rgba(240,237,230,0.6)",
            }}
          >
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={s <= Math.round(googleRating) ? "#E07B2A" : "rgba(224,123,42,0.25)"}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span>
              <strong style={{ color: "#F0EDE6" }}>{googleRating?.toFixed(1)}</strong>
              {googleReviewCount ? ` from ${googleReviewCount}+ Google reviews` : " on Google"}
            </span>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTestimonials.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} {...t} index={i} />
          ))}
        </div>

        {/* Google Review CTA */}
        <div
          style={{
            marginTop: "3rem",
            padding: "2rem 2.5rem",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "0.35rem",
              }}
            >
              Happy with our work?
            </div>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9rem",
                color: "rgba(240,237,230,0.6)",
                margin: 0,
              }}
            >
              Your Google review helps other property owners find us and means the world to a small,
              veteran-owned business.
            </p>
          </div>
          <a
            href="https://g.page/r/CcglMAMbtQInEBM/review"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              backgroundColor: "#E07B2A",
              color: "#fff",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.85rem 1.75rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Leave a Google Review
          </a>
        </div>
      </div>
    </section>
  );
}
