import { describe, it, expect } from "vitest";

describe("Google OAuth Credentials", () => {
  it("GOOGLE_CLIENT_ID is set and has correct format", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("GOOGLE_CLIENT_SECRET is set and has correct format", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    expect(clientSecret).toMatch(/^GOCSPX-/);
  });

  it("GOOGLE_CLIENT_ID matches expected project number", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toContain("468042821349");
  });
});
