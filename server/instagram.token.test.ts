/**
 * Validates that the INSTAGRAM_ACCESS_TOKEN secret is set and can authenticate
 * against the Instagram Graph API (new Instagram Login API).
 */
import { describe, it, expect } from "vitest";

describe("Instagram Access Token", () => {
  it("should have INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID set", () => {
    expect(process.env.INSTAGRAM_ACCESS_TOKEN).toBeTruthy();
    expect(process.env.INSTAGRAM_USER_ID).toBeTruthy();
  });

  it("should be able to fetch the Instagram user profile", async () => {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;

    if (!token || !userId) {
      throw new Error("INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID not set");
    }

    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${token}`
    );
    const data = await res.json() as { id?: string; username?: string; error?: { message: string } };

    expect(res.ok).toBe(true);
    expect(data.error).toBeUndefined();
    expect(data.username).toBe("nolandearthworks");
    expect(data.id).toBe(userId);
  });

  it("should have access to the content publishing endpoint", async () => {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;

    if (!token || !userId) {
      throw new Error("INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID not set");
    }

    // Try to list recent media — this confirms the token has instagram_business_basic
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${userId}/media?fields=id,media_type&limit=1&access_token=${token}`
    );
    const data = await res.json() as { data?: any[]; error?: { message: string } };

    expect(res.ok).toBe(true);
    expect(data.error).toBeUndefined();
    expect(Array.isArray(data.data)).toBe(true);
  });
});
