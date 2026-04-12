/**
 * Twilio SMS credentials validation test.
 * Verifies that the required env vars are set and the Twilio client can be instantiated.
 * Does NOT send a real SMS — just validates the credentials format and client init.
 */
import { describe, it, expect } from "vitest";
import twilio from "twilio";

describe("Twilio SMS credentials", () => {
  it("should have TWILIO_ACCOUNT_SID set", () => {
    expect(process.env.TWILIO_ACCOUNT_SID).toBeTruthy();
    expect(process.env.TWILIO_ACCOUNT_SID).toMatch(/^AC/);
  });

  it("should have TWILIO_AUTH_TOKEN set", () => {
    expect(process.env.TWILIO_AUTH_TOKEN).toBeTruthy();
    expect(process.env.TWILIO_AUTH_TOKEN!.length).toBeGreaterThan(10);
  });

  it("should have TWILIO_FROM_NUMBER in E.164 format", () => {
    expect(process.env.TWILIO_FROM_NUMBER).toBeTruthy();
    expect(process.env.TWILIO_FROM_NUMBER).toMatch(/^\+\d{10,15}$/);
  });

  it("should have OWNER_PHONE in E.164 format", () => {
    expect(process.env.OWNER_PHONE).toBeTruthy();
    expect(process.env.OWNER_PHONE).toMatch(/^\+\d{10,15}$/);
  });

  it("should be able to instantiate a Twilio client with the credentials", () => {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    // This will throw if credentials are malformed
    const client = twilio(sid, token);
    expect(client).toBeDefined();
    expect(typeof client.messages.create).toBe("function");
  });
});
