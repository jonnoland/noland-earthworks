/**
 * Twilio SMS Proxy — Unit Tests
 *
 * Tests the parsing logic for owner reply formats without hitting
 * the real Twilio API or database.
 */

import { describe, it, expect } from "vitest";

// ─── Inline the parsing helpers so we can test them in isolation ─────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

interface ParsedReply {
  format: "explicit_phone" | "name_prefix" | "plain";
  targetPhone?: string;
  targetName?: string;
  body: string;
}

function parseOwnerReply(rawBody: string): ParsedReply {
  const body = rawBody.trim();

  // Format 1: "REPLY +16151234567: message"
  const replyMatch = body.match(/^REPLY\s+(\+?[\d\s\-().]+):\s*([\s\S]+)$/i);
  if (replyMatch) {
    return {
      format: "explicit_phone",
      targetPhone: normalizePhone(replyMatch[1].trim()),
      body: replyMatch[2].trim(),
    };
  }

  // Format 2: "[Name]: message"
  const nameMatch = body.match(/^\[([^\]]+)\]:\s*([\s\S]+)$/);
  if (nameMatch) {
    return {
      format: "name_prefix",
      targetName: nameMatch[1].trim(),
      body: nameMatch[2].trim(),
    };
  }

  // Format 3: plain text → route to most recent conversation
  return { format: "plain", body };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("normalizePhone", () => {
  it("adds +1 to 10-digit numbers", () => {
    expect(normalizePhone("6154064819")).toBe("+16154064819");
  });

  it("handles numbers with dashes and spaces", () => {
    expect(normalizePhone("615-406-4819")).toBe("+16154064819");
    expect(normalizePhone("(615) 406-4819")).toBe("+16154064819");
  });

  it("handles 11-digit numbers starting with 1", () => {
    expect(normalizePhone("16154064819")).toBe("+16154064819");
  });

  it("handles E.164 format passthrough", () => {
    expect(normalizePhone("+16154064819")).toBe("+16154064819");
  });
});

describe("parseOwnerReply — format 1: explicit phone", () => {
  it("parses REPLY +1XXXXXXXXXX: message", () => {
    const result = parseOwnerReply("REPLY +16151234567: Hey, Tuesday works for me");
    expect(result.format).toBe("explicit_phone");
    expect(result.targetPhone).toBe("+16151234567");
    expect(result.body).toBe("Hey, Tuesday works for me");
  });

  it("parses REPLY with 10-digit number", () => {
    const result = parseOwnerReply("REPLY 6151234567: Can you do Thursday?");
    expect(result.format).toBe("explicit_phone");
    expect(result.targetPhone).toBe("+16151234567");
    expect(result.body).toBe("Can you do Thursday?");
  });

  it("is case-insensitive for REPLY keyword", () => {
    const result = parseOwnerReply("reply +16151234567: message");
    expect(result.format).toBe("explicit_phone");
    expect(result.targetPhone).toBe("+16151234567");
  });

  it("handles multi-line message body", () => {
    const result = parseOwnerReply("REPLY +16151234567: Line one\nLine two");
    expect(result.format).toBe("explicit_phone");
    expect(result.body).toBe("Line one\nLine two");
  });
});

describe("parseOwnerReply — format 2: name prefix", () => {
  it("parses [Name]: message", () => {
    const result = parseOwnerReply("[Mike Johnson]: Hey, Tuesday works for me");
    expect(result.format).toBe("name_prefix");
    expect(result.targetName).toBe("Mike Johnson");
    expect(result.body).toBe("Hey, Tuesday works for me");
  });

  it("handles single-word names", () => {
    const result = parseOwnerReply("[Mike]: Got your message");
    expect(result.format).toBe("name_prefix");
    expect(result.targetName).toBe("Mike");
    expect(result.body).toBe("Got your message");
  });

  it("handles names with commas (city, state format)", () => {
    const result = parseOwnerReply("[Columbia, TN]: I'll be there at 8");
    expect(result.format).toBe("name_prefix");
    expect(result.targetName).toBe("Columbia, TN");
    expect(result.body).toBe("I'll be there at 8");
  });
});

describe("parseOwnerReply — format 3: plain text", () => {
  it("treats plain text as plain format", () => {
    const result = parseOwnerReply("Sounds good, I'll be there Monday morning.");
    expect(result.format).toBe("plain");
    expect(result.body).toBe("Sounds good, I'll be there Monday morning.");
  });

  it("trims leading/trailing whitespace", () => {
    const result = parseOwnerReply("  Hello there  ");
    expect(result.format).toBe("plain");
    expect(result.body).toBe("Hello there");
  });

  it("does not match partial REPLY prefix without colon", () => {
    const result = parseOwnerReply("REPLY to your question: no that is not right");
    // "REPLY to your question" is not a phone number, so it falls through to plain
    // Actually it won't match because "to your question" is not a phone number pattern
    expect(result.format).toBe("plain");
  });
});

describe("parseOwnerReply — edge cases", () => {
  it("does not confuse name format with REPLY format", () => {
    const replyResult = parseOwnerReply("REPLY +16151234567: test");
    expect(replyResult.format).toBe("explicit_phone");

    const nameResult = parseOwnerReply("[+16151234567]: test");
    expect(nameResult.format).toBe("name_prefix");
    expect(nameResult.targetName).toBe("+16151234567");
  });

  it("handles empty body after colon gracefully", () => {
    // This would fail the regex since ([\s\S]+) requires at least 1 char
    const result = parseOwnerReply("REPLY +16151234567:");
    expect(result.format).toBe("plain"); // Falls through to plain
  });
});
