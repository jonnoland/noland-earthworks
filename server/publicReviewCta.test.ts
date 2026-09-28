import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("public Google review call-to-action", () => {
  it("uses one verified direct review destination across public review sections", () => {
    const reviewUrl = source("client/src/lib/googleReview.ts");
    const testimonials = source("client/src/components/TestimonialsSection.tsx");
    const reviewsPage = source("client/src/pages/Reviews.tsx");

    expect(reviewUrl).toContain("https://search.google.com/local/writereview?placeid=");
    expect(testimonials).toContain('import { GOOGLE_REVIEW_URL } from "@/lib/googleReview";');
    expect(testimonials).toContain("href={GOOGLE_REVIEW_URL}");
    expect(reviewsPage).toContain('import { GOOGLE_REVIEW_URL } from "@/lib/googleReview";');
    expect(reviewsPage).toContain("href={GOOGLE_REVIEW_URL}");
  });

  it("removes the duplicate footer review link so the review section CTA remains the clear action", () => {
    const footer = source("client/src/components/Footer.tsx");

    expect(footer).not.toContain("Leave us a Google Review");
    expect(footer).not.toContain("g.page/r/");
  });

  it("places a live five-star Google review carousel below the review action on both public review sections", () => {
    const testimonials = source("client/src/components/TestimonialsSection.tsx");
    const reviewsPage = source("client/src/pages/Reviews.tsx");
    const carousel = source("client/src/components/GoogleReviewCarousel.tsx");

    expect(testimonials).toContain('import GoogleReviewCarousel from "@/components/GoogleReviewCarousel";');
    expect(testimonials).toContain("<GoogleReviewCarousel reviews={liveReviews} />");
    expect(reviewsPage).toContain('import GoogleReviewCarousel from "@/components/GoogleReviewCarousel";');
    expect(reviewsPage).toContain("<GoogleReviewCarousel reviews={reviews} />");
    expect(carousel).toContain('review.source === "google" && review.rating === 5');
    expect(carousel).toContain(".slice(0, 5)");
  });

  it("uses a short feedback prompt and accessible subtle glow on the review buttons", () => {
    const testimonials = source("client/src/components/TestimonialsSection.tsx");
    const reviewsPage = source("client/src/pages/Reviews.tsx");
    const styles = source("client/src/index.css");

    expect(testimonials).toContain("A quick review helps other landowners make a confident decision");
    expect(reviewsPage).toContain("A quick review helps other landowners make a confident decision");
    expect(testimonials).toContain('className="google-review-button"');
    expect(reviewsPage).toContain('className="google-review-button"');
    expect(styles).toContain(".google-review-button:hover");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
