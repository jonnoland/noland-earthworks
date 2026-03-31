import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe("RESEND_API_KEY validation", () => {
  it("should have RESEND_API_KEY set in environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    expect(key?.length).toBeGreaterThan(10);
  });

  it("should be able to instantiate Resend client with the key", () => {
    const key = process.env.RESEND_API_KEY ?? "";
    expect(() => new Resend(key)).not.toThrow();
  });

  it("should confirm the key is a sending-only or full-access key (not unauthorized)", async () => {
    const key = process.env.RESEND_API_KEY ?? "";
    const resend = new Resend(key);
    // Attempt to list emails — a valid key returns data or a restricted_api_key error,
    // but NOT a 401 "API key is invalid" error.
    const { error } = await resend.emails.get("nonexistent-id-for-test");
    // A valid key will return "not_found" (404) for a fake ID, not "invalid_api_key" (401)
    const isValidKey = !error || error.name !== "invalid_api_key";
    expect(isValidKey).toBe(true);
  }, 15000);
});
