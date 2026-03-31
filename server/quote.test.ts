import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("contact.submit", () => {
  it("validates required fields — rejects empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "",
        email: "test@example.com",
        phone: "",
        subject: "General Question",
        message: "Hello there",
      })
    ).rejects.toThrow();
  });

  it("validates required fields — rejects missing message", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test User",
        email: "test@example.com",
        phone: "",
        subject: "General Question",
        message: "",
      })
    ).rejects.toThrow();
  });
});

describe("quote.submit", () => {
  it("validates required fields — rejects empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.quote.submit({
        name: "",
        phone: "615-555-0100",
        email: "test@example.com",
        service: "land-clearing",
        county: "davidson",
        acreage: "one-to-two",
        message: "Test project",
      })
    ).rejects.toThrow();
  });

  it("validates required fields — rejects invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.quote.submit({
        name: "Test User",
        phone: "615-555-0100",
        email: "not-an-email",
        service: "land-clearing",
        county: "davidson",
        acreage: "one-to-two",
        message: "Test project",
      })
    ).rejects.toThrow();
  });

  it("RESEND_API_KEY env var is configured", () => {
    // This confirms the secret was injected into the environment
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(0);
  });
});
