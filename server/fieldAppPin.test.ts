/**
 * FIELD_APP_PIN secret validation test.
 * Confirms the secret is set and is exactly 4 digits.
 */

import { describe, it, expect } from "vitest";

describe("FIELD_APP_PIN secret", () => {
  it("is set and is exactly 4 digits", () => {
    const pin = process.env.FIELD_APP_PIN ?? "";
    expect(pin.length).toBe(4);
    expect(/^\d{4}$/.test(pin)).toBe(true);
  });
});
