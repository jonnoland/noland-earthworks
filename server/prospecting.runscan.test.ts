import { describe, it, expect } from "vitest";

describe("MANUS_API_KEY validation", () => {
  it("should be set in environment", () => {
    const key = process.env.MANUS_API_KEY;
    expect(key, "MANUS_API_KEY must be set").toBeTruthy();
    expect(key!.length, "MANUS_API_KEY must be at least 10 chars").toBeGreaterThan(10);
  });

  it("should authenticate successfully against Manus usage API", async () => {
    const key = process.env.MANUS_API_KEY;
    if (!key) {
      throw new Error("MANUS_API_KEY is not set");
    }
    const res = await fetch("https://api.manus.ai/v2/usage.list?page=1&page_size=1", {
      headers: { "x-manus-api-key": key },
    });
    expect(res.ok, `Manus API returned ${res.status}`).toBe(true);
    const data = await res.json() as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});
