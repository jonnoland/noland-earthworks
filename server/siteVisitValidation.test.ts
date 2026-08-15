import { describe, expect, it } from "vitest";
import { formatUsPhoneInput, validateSiteVisitRequest } from "@shared/siteVisitValidation";

const validRequest = {
  name: "Jon Noland",
  phone: "(615) 406-4819",
  email: "jon@example.com",
  service: "Forestry Mulching",
  county: "Dickson County",
  preferredContact: "call",
  smsConsent: false,
};

describe("Site Visit Request contact validation", () => {
  it("formats 10-digit phone input and removes a U.S. country-code prefix", () => {
    expect(formatUsPhoneInput("6154064819")).toBe("(615) 406-4819");
    expect(formatUsPhoneInput("+1 (615) 406-4819")).toBe("(615) 406-4819");
  });

  it("returns specific inline errors for inaccurate contact details", () => {
    const errors = validateSiteVisitRequest({ ...validRequest, name: "1", phone: "615-406", email: "invalid" });
    expect(errors.name).toContain("name");
    expect(errors.phone).toContain("10-digit");
    expect(errors.email).toContain("name@example.com");
  });

  it("requires project-text acknowledgement only for a selected text preference", () => {
    expect(validateSiteVisitRequest({ ...validRequest, preferredContact: "text", smsConsent: false }).smsConsent).toContain("acknowledge");
    expect(validateSiteVisitRequest({ ...validRequest, preferredContact: "text", smsConsent: true })).toEqual({});
  });
});
