/**
 * Validates that the Facebook webhook verify token is correctly configured.
 */
import { describe, it, expect } from "vitest";

describe("Facebook Webhook Verify Token", () => {
  it("should have FACEBOOK_WEBHOOK_VERIFY_TOKEN set", () => {
    const token = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(0);
  });

  it("should have a token with minimum length for security", () => {
    const token = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? "";
    expect(token.length).toBeGreaterThanOrEqual(10);
  });

  it("should have all required Facebook secrets set", () => {
    expect(process.env.FACEBOOK_APP_ID).toBeDefined();
    expect(process.env.FACEBOOK_APP_SECRET).toBeDefined();
    expect(process.env.FACEBOOK_SYSTEM_USER_TOKEN).toBeDefined();
    expect(process.env.FACEBOOK_PAGE_ID).toBeDefined();
    expect(process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN).toBeDefined();
  });
});
