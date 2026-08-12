import { describe, expect, it } from "vitest";
import { formatQuotePhone, validateQuoteContact, validateQuoteContactField } from "../shared/quoteContactValidation";

describe("quote contact validation", () => {
  it("requires usable name, phone, email, and service values", () => {
    expect(validateQuoteContact({ name: "J", phone: "615", email: "wrong", service: "" })).toEqual({
      name: "Enter your full name so we know who to contact.",
      phone: "Enter a valid 10-digit phone number.",
      email: "Enter a valid email address for your written estimate.",
      service: "Choose the service that best matches your project.",
    });
  });

  it("accepts a complete customer contact record", () => {
    expect(validateQuoteContact({
      name: "Jordan Smith",
      phone: "(615) 555-0123",
      email: "jordan@example.com",
      service: "forestry-mulching",
    })).toEqual({});
    expect(validateQuoteContactField("email", "jordan@example.com")).toBeUndefined();
  });

  it("formats phone numbers consistently while a customer types", () => {
    expect(formatQuotePhone("615")).toBe("615");
    expect(formatQuotePhone("615555")).toBe("(615) 555");
    expect(formatQuotePhone("6155550123")).toBe("(615) 555-0123");
    expect(formatQuotePhone("615-555-0123 ext 9")).toBe("(615) 555-0123");
  });
});
