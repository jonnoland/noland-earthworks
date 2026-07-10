/**
 * govContracts.secrets.test.ts
 * Validates that CAGE_CODE and UNIQUE_ENTITY_ID environment variables are set
 * and match the expected format for SAM.gov federal contracting.
 */

import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("SAM.gov credentials", () => {
  it("CAGE_CODE is set and matches expected format (5 alphanumeric chars)", () => {
    expect(ENV.cageCode).toBeTruthy();
    expect(ENV.cageCode.length).toBe(5);
    expect(/^[A-Z0-9]{5}$/i.test(ENV.cageCode)).toBe(true);
  });

  it("UNIQUE_ENTITY_ID is set and matches expected format (12 alphanumeric chars)", () => {
    expect(ENV.uniqueEntityId).toBeTruthy();
    expect(ENV.uniqueEntityId.length).toBe(12);
    expect(/^[A-Z0-9]{12}$/i.test(ENV.uniqueEntityId)).toBe(true);
  });

  it("CAGE_CODE matches the registered value 17VJ2", () => {
    expect(ENV.cageCode.toUpperCase()).toBe("17VJ2");
  });

  it("UNIQUE_ENTITY_ID matches the registered value G6E8E4SDM2K4", () => {
    expect(ENV.uniqueEntityId.toUpperCase()).toBe("G6E8E4SDM2K4");
  });
});
