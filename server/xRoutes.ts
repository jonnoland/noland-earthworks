/**
 * X (Twitter) routes — OAuth 1.0a static credentials
 *
 * Posting uses OAuth 1.0a with static Consumer Key + Access Token stored as
 * environment secrets. No browser OAuth flow is required.
 *
 * GET  /api/x/status  → always returns connected: true with @nolandearthwrks
 *
 * The legacy OAuth 2.0 PKCE authorize/callback/disconnect routes are removed.
 * The getXClient() helper returns a pre-authenticated TwitterApi instance.
 */
import type { Express } from "express";
import { TwitterApi } from "twitter-api-v2";
import { ENV } from "./_core/env";

/**
 * Returns a TwitterApi client authenticated with OAuth 1.0a static credentials.
 * Throws if any required credential is missing.
 */
export function getXClient(): TwitterApi {
  const { twitterApiKey, twitterApiSecret, twitterAccessToken, twitterAccessTokenSecret } = ENV;
  if (!twitterApiKey || !twitterApiSecret || !twitterAccessToken || !twitterAccessTokenSecret) {
    throw new Error("X OAuth 1.0a credentials not configured. Check TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET secrets.");
  }
  return new TwitterApi({
    appKey: twitterApiKey,
    appSecret: twitterApiSecret,
    accessToken: twitterAccessToken,
    accessSecret: twitterAccessTokenSecret,
  });
}

export function registerXRoutes(app: Express) {
  // Status — always connected via static credentials
  app.get("/api/x/status", (_req, res) => {
    const configured =
      !!(ENV.twitterApiKey && ENV.twitterApiSecret && ENV.twitterAccessToken && ENV.twitterAccessTokenSecret);
    res.json({
      connected: configured,
      screenName: configured ? "nolandearthwrks" : null,
    });
  });
}
