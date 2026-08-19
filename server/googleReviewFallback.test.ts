import { describe, expect, it } from "vitest";
import { emptyGoogleReviewFetch, googleReviewSync } from "./googleReviewFallback";

describe("Google review fallback state", () => {
  it("keeps a rate-limit failure explicit without fabricating review data", () => {
    const result = emptyGoogleReviewFetch(
      googleReviewSync("rate_limited", "Google review refresh is temporarily rate limited.")
    );

    expect(result.reviews).toEqual([]);
    expect(result.averageRating).toBeNull();
    expect(result.totalReviewCount).toBeNull();
    expect(result.sync).toMatchObject({
      state: "rate_limited",
      source: "business_profile",
    });
  });

  it("labels a successful alternate-provider result as a fallback", () => {
    const sync = googleReviewSync("fallback", "Using the configured Places fallback.", "places");
    expect(sync).toEqual({
      state: "fallback",
      source: "places",
      message: "Using the configured Places fallback.",
    });
  });
});
