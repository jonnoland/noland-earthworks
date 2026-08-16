import { describe, expect, it } from "vitest";

describe("owner SMS recipient configuration", () => {
  it("provides two unique E.164 owner recipients for internal alerts", () => {
    const recipients = (process.env.OWNER_SMS_ALERT_RECIPIENTS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    expect(recipients).toHaveLength(2);
    expect(new Set(recipients).size).toBe(2);
    expect(recipients.every((value) => /^\+[1-9]\d{7,14}$/.test(value))).toBe(true);
  });
});
