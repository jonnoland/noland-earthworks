import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "opsRouter.ts"), "utf8");

describe("client portal email delivery", () => {
  it("uses the verified sender, canonical portal domain, and records delivery only after Resend accepts the email", () => {
    const start = source.indexOf("sendPortalLink: ownerProcedure");
    const end = source.indexOf("analytics: ownerProcedure", start);
    const procedure = source.slice(start, end);

    expect(procedure).toContain("https://nolandearthworks.com");
    expect(procedure).toContain("from: 'Noland Earthworks <noreply@nolandearthworks.com>'");
    expect(procedure).toContain("replyTo: 'quotes@nolandearthworks.com'");
    expect(procedure).toContain("await resend.emails.send");
    expect(procedure.indexOf("if (error)")).toBeLessThan(procedure.indexOf("set({ status: 'sent'"));
  });
});
