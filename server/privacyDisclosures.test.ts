import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("public privacy and form disclosures", () => {
  it("identifies the actual AI, native-record, payment, storage, mapping, and communication practices", () => {
    const policy = readFileSync(resolve(projectRoot, "client/src/pages/PrivacyPolicy.tsx"), "utf8");

    expect(policy).toContain("AI-Assisted Workflows");
    expect(policy).toContain("working source of truth");
    expect(policy).toContain("Stripe");
    expect(policy).toContain("Google Maps");
    expect(policy).toContain("Twilio");
    expect(policy).toContain("Attorney review required");
  });

  it("requires an explicit project-text acknowledgement only when text is selected", () => {
    const quote = readFileSync(resolve(projectRoot, "client/src/pages/Quote.tsx"), "utf8");
    const router = readFileSync(resolve(projectRoot, "server/quoteRouter.ts"), "utf8");

    expect(quote).toContain("validateSiteVisitRequest(form)");
    expect(quote).toContain('form.preferredContact === "text"');
    expect(quote).toContain("Reply STOP to opt out or HELP for help");
    expect(router).toContain("smsConsentAt");
  });

  it("discloses separate subscriber and contact-form record creation", () => {
    const footer = readFileSync(resolve(projectRoot, "client/src/components/Footer.tsx"), "utf8");
    const about = readFileSync(resolve(projectRoot, "client/src/pages/About.tsx"), "utf8");

    expect(footer).toContain("Unsubscribe at any time");
    expect(about).toContain("inquiry or client record");
  });
});
