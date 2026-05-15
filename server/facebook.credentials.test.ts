import { describe, it, expect } from "vitest";

/**
 * Validates that the Facebook credentials are set and functional.
 * Calls the Graph API /me endpoint with the system user token to confirm
 * the token is valid and the app ID/secret are present.
 */
describe("Facebook credentials", () => {
  it("should have FACEBOOK_APP_ID set", () => {
    expect(process.env.FACEBOOK_APP_ID).toBeTruthy();
    expect(process.env.FACEBOOK_APP_ID).toBe("913180238394632");
  });

  it("should have FACEBOOK_APP_SECRET set", () => {
    expect(process.env.FACEBOOK_APP_SECRET).toBeTruthy();
    expect(process.env.FACEBOOK_APP_SECRET).toHaveLength(32);
  });

  it("should have FACEBOOK_PAGE_ID set", () => {
    expect(process.env.FACEBOOK_PAGE_ID).toBeTruthy();
    expect(process.env.FACEBOOK_PAGE_ID).toBe("830611640137363");
  });

  it("should have FACEBOOK_SYSTEM_USER_TOKEN set and non-empty", () => {
    expect(process.env.FACEBOOK_SYSTEM_USER_TOKEN).toBeTruthy();
    expect(process.env.FACEBOOK_SYSTEM_USER_TOKEN!.length).toBeGreaterThan(50);
  });

  it("should validate the system user token against Graph API", async () => {
    const token = process.env.FACEBOOK_SYSTEM_USER_TOKEN;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    const appAccessToken = `${appId}|${appSecret}`;
    const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appAccessToken}`;

    const res = await fetch(url);
    const data = (await res.json()) as {
      data?: { is_valid?: boolean; app_id?: string };
      error?: { message: string };
    };

    expect(data.error).toBeUndefined();
    expect(data.data?.is_valid).toBe(true);
    expect(data.data?.app_id).toBe(appId);
  }, 15000);
});
