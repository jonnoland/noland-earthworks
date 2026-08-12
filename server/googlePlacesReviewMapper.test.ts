import { describe, expect, it } from "vitest";
import { mapGooglePlaceV1Review } from "./googlePlacesReviewMapper";

describe("mapGooglePlaceV1Review", () => {
  it("maps the current Places API review shape into display-safe review data", () => {
    const mapped = mapGooglePlaceV1Review({
      name: "places/abc/reviews/123",
      rating: 5,
      text: { text: "Jon did what he said he would do." },
      publishTime: "2026-08-12T10:00:00Z",
      authorAttribution: { displayName: "Property Owner", photoUri: "https://example.com/photo.jpg" },
    }, 0);

    expect(mapped).toEqual({
      id: "places/abc/reviews/123",
      reviewerName: "Property Owner",
      reviewerPhotoUrl: "https://example.com/photo.jpg",
      rating: 5,
      body: "Jon did what he said he would do.",
      reviewedAt: "2026-08-12T10:00:00Z",
    });
  });

  it("returns safe values when Google omits optional review fields", () => {
    const mapped = mapGooglePlaceV1Review({}, 3);
    expect(mapped.id).toBe("google-3");
    expect(mapped.reviewerName).toBe("Google User");
    expect(mapped.rating).toBe(0);
    expect(mapped.body).toBe("");
  });
});
