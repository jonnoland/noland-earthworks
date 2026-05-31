/**
 * Tests for the Instagram token refresh module.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    instagramAccessToken: "test_token_abc123",
    instagramUserId: "27187698034196564",
  },
}));

describe("refreshInstagramToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.BUILT_IN_FORGE_API_URL = "";
    process.env.BUILT_IN_FORGE_API_KEY = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns error when INSTAGRAM_ACCESS_TOKEN is not set", async () => {
    const { ENV } = await import("./_core/env");
    const originalToken = (ENV as any).instagramAccessToken;
    (ENV as any).instagramAccessToken = "";

    const { refreshInstagramToken } = await import("./instagramTokenRefresh");
    const result = await refreshInstagramToken();

    expect(result.refreshed).toBe(false);
    expect(result.error).toContain("INSTAGRAM_ACCESS_TOKEN not set");

    (ENV as any).instagramAccessToken = originalToken;
  });

  it("returns error when the token debug check fails", async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Invalid OAuth access token" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { refreshInstagramToken } = await import("./instagramTokenRefresh");
    const result = await refreshInstagramToken();

    expect(result.refreshed).toBe(false);
    expect(result.error).toContain("Invalid OAuth access token");
  });

  it("returns error when the refresh API fails", async () => {
    const mockFetch = vi.fn()
      // First call: token debug check succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "27187698034196564" }),
      })
      // Second call: refresh fails
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Token refresh failed", type: "OAuthException", code: 190 } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { refreshInstagramToken } = await import("./instagramTokenRefresh");
    const result = await refreshInstagramToken();

    expect(result.refreshed).toBe(false);
    expect(result.error).toContain("Token refresh failed");
  });

  it("successfully refreshes the token and updates ENV", async () => {
    const newToken = "IGAAiEu6neZCxNBZAGJNewRefreshedToken";
    const mockFetch = vi.fn()
      // First call: token debug check succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "27187698034196564" }),
      })
      // Second call: refresh succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: newToken,
          token_type: "bearer",
          expires_in: 5183944,
        }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { refreshInstagramToken } = await import("./instagramTokenRefresh");
    const result = await refreshInstagramToken();

    expect(result.refreshed).toBe(true);
    expect(result.expiresIn).toBe(5183944);
    expect(process.env.INSTAGRAM_ACCESS_TOKEN).toBe(newToken);
  });
});
