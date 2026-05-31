/**
 * Validates that the X (Twitter) OAuth 1.0a static credentials are present
 * in the environment and that the /api/x/status endpoint returns connected=true.
 */
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { registerXRoutes } from "./xRoutes";

function buildApp() {
  const app = express();
  registerXRoutes(app);
  return app;
}

describe("X OAuth 1.0a credentials", () => {
  it("TWITTER_API_KEY is set and non-empty", () => {
    expect(process.env.TWITTER_API_KEY).toBeTruthy();
  });

  it("TWITTER_API_SECRET is set and non-empty", () => {
    expect(process.env.TWITTER_API_SECRET).toBeTruthy();
  });

  it("TWITTER_ACCESS_TOKEN is set and non-empty", () => {
    expect(process.env.TWITTER_ACCESS_TOKEN).toBeTruthy();
  });

  it("TWITTER_ACCESS_TOKEN_SECRET is set and non-empty", () => {
    expect(process.env.TWITTER_ACCESS_TOKEN_SECRET).toBeTruthy();
  });
});

describe("GET /api/x/status", () => {
  it("returns connected: true when credentials are configured", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/x/status");
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.screenName).toBe("nolandearthwrks");
  });
});
