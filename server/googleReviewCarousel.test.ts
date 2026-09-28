import { describe, expect, it } from "vitest";
import { selectTopFiveStarGoogleReviews, type GoogleReviewCarouselItem } from "../client/src/components/GoogleReviewCarousel";

const review = (id: string, rating: number, source = "google", body = "Thick brush cleared and the place looked great."): GoogleReviewCarouselItem => ({
  id,
  reviewerName: `Customer ${id}`,
  rating,
  source,
  body,
  reviewedAt: "2026-09-01T00:00:00.000Z",
});

describe("five-star Google review carousel", () => {
  it("uses only written five-star Google reviews and limits the carousel to five", () => {
    const selected = selectTopFiveStarGoogleReviews([
      review("one", 5),
      review("two", 4),
      review("three", 5, "facebook"),
      review("four", 5, "google", "   "),
      review("five", 5),
      review("six", 5),
      review("seven", 5),
      review("eight", 5),
    ]);

    expect(selected.map((item) => item.id)).toEqual(["one", "five", "six", "seven", "eight"]);
  });

  it("returns no social-proof cards when no verified five-star Google review is available", () => {
    expect(selectTopFiveStarGoogleReviews([review("one", 4), review("two", 5, "facebook")])).toEqual([]);
  });
});
