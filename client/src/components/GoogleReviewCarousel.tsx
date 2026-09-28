import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type GoogleReviewCarouselItem = {
  id: string;
  reviewerName: string;
  rating: number;
  body: string;
  reviewedAt: string;
  source: string;
  reviewerPhotoUrl?: string;
};

export function selectTopFiveStarGoogleReviews(reviews: GoogleReviewCarouselItem[]) {
  return reviews
    .filter((review) => review.source === "google" && review.rating === 5 && review.body.trim().length > 0)
    .slice(0, 5);
}

function CarouselStars() {
  return (
    <div className="flex items-center gap-1" aria-label="Five out of five stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className="h-3.5 w-3.5 text-[#E07B2A]" fill="currentColor" aria-hidden="true" />
      ))}
    </div>
  );
}

export default function GoogleReviewCarousel({ reviews }: { reviews: GoogleReviewCarouselItem[] }) {
  const fiveStarReviews = useMemo(
    () => selectTopFiveStarGoogleReviews(reviews),
    [reviews]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [fiveStarReviews.length]);

  useEffect(() => {
    if (fiveStarReviews.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % fiveStarReviews.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [fiveStarReviews.length]);

  if (fiveStarReviews.length === 0) return null;

  const review = fiveStarReviews[activeIndex] ?? fiveStarReviews[0];
  const reviewDate = new Date(review.reviewedAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const changeReview = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + fiveStarReviews.length) % fiveStarReviews.length);
  };

  return (
    <section className="google-review-carousel" aria-label="Five-star Google customer reviews">
      <div className="google-review-carousel__eyebrow">
        <span>Five-star feedback</span>
        <CarouselStars />
      </div>
      <div className="google-review-carousel__content" aria-live="polite">
        <p className="google-review-carousel__quote">“{review.body}”</p>
        <div className="google-review-carousel__author">
          {review.reviewerPhotoUrl ? (
            <img src={review.reviewerPhotoUrl} alt="" className="google-review-carousel__avatar" />
          ) : (
            <span className="google-review-carousel__avatar google-review-carousel__avatar--initial" aria-hidden="true">
              {review.reviewerName.charAt(0).toUpperCase()}
            </span>
          )}
          <span>
            <strong>{review.reviewerName}</strong>
            <span>Google review · {reviewDate}</span>
          </span>
        </div>
      </div>
      {fiveStarReviews.length > 1 && (
        <div className="google-review-carousel__controls">
          <button type="button" onClick={() => changeReview(-1)} aria-label="Show previous five-star review">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="google-review-carousel__dots" aria-label="Review carousel position">
            {fiveStarReviews.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={index === activeIndex ? "is-active" : ""}
                aria-label={`Show five-star review ${index + 1} of ${fiveStarReviews.length}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
          <button type="button" onClick={() => changeReview(1)} aria-label="Show next five-star review">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
