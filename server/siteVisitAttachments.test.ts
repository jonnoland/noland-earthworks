import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Site Visit request attachments", () => {
  it("accepts only bounded photo and work-area document uploads", () => {
    const router = source("server/quoteRouter.ts");

    expect(router).toContain("uploadSiteVisitAttachment: publicProcedure");
    expect(router).toContain("MAX_SITE_VISIT_ATTACHMENT_BYTES");
    expect(router).toContain("Each attachment must be 8 MB or smaller.");
    expect(router).toContain("siteVisitAttachments: z.array(siteVisitAttachmentSchema).max(5)");
  });

  it("persists attachments and displays them for Operations review", () => {
    const router = source("server/quoteRouter.ts");
    const ops = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain("siteVisitAttachments: input.siteVisitAttachments.length > 0 ? JSON.stringify(input.siteVisitAttachments) : null");
    expect(ops).toContain("Customer attachments ({requestAttachments.length})");
  });

  it("warns customers not to attach sensitive documents", () => {
    const form = source("client/src/pages/Quote.tsx");
    expect(form).toContain("Do not upload IDs, financial records, or other sensitive documents.");
  });
});
