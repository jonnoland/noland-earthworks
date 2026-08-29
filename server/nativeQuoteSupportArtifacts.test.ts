import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getQuoteRentalCostCents, getQuoteRentalOnlyMargin, parseQuoteSupportArtifacts } from "../shared/quoteSupportArtifacts";

const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("native quote rental, evidence, and insurance support artifacts", () => {
  it("calculates only internal rental, transport, and tax costs", () => {
    expect(getQuoteRentalCostCents([
      { equipmentName: "Compact track loader", rentalCostCents: 155000, transportCostCents: 25000, taxCostCents: 16250 },
      { equipmentName: "Grapple", rentalCostCents: 22500, transportCostCents: 0, taxCostCents: 0 },
    ])).toBe(218750);
  });

  it("calculates a clearly scoped rental-only contribution and margin rather than representing it as total job profit", () => {
    expect(getQuoteRentalOnlyMargin(1000000, 250000)).toEqual({
      rentalOnlyProfitCents: 750000,
      rentalOnlyMarginPct: 75,
    });
    expect(getQuoteRentalOnlyMargin(1000000, 0)).toEqual({
      rentalOnlyProfitCents: 1000000,
      rentalOnlyMarginPct: null,
    });
  });

  it("fails closed to an empty support-artifact collection when a legacy quote has malformed JSON", () => {
    expect(parseQuoteSupportArtifacts("not-json", [])).toEqual([]);
  });

  it("keeps rental costs internal and makes evidence available only to protected quote workflows", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain("uploadAttachment: ownerProcedure");
    expect(router).toContain("quotes/${ctx.user.id}/${input.kind}/");
    expect(router).toContain("Never create a separate equipment-rental line item");
    expect(router).toContain("buildEvidenceContent(ctx.user.id, evidence)");
    expect(router).toContain("Internal rental cost context:");
    expect(router).toContain("insuranceDocumentKeys");
    expect(router).toContain("buildInsuranceEmailAttachments");
    expect(router).toContain("listInsuranceLibrary: ownerProcedure");
    expect(router).toContain("saveInsuranceLibraryDocument: ownerProcedure");
    expect(router).toContain("quoteInsuranceLibrary.ownerId");
    expect(router).toContain("reviewCost: ownerProcedure");
    expect(router).toContain('model: "gemini-3-flash-preview"');
    expect(router).toContain("Add at least one site photo or measurement before generating a cost review.");
    expect(router).toContain("assertOwnedAttachmentKeys(ctx.user.id, input.quoteEvidence ?? [])");
    expect(router).toContain("assertOwnedAttachmentKeys(ctx.user.id, evidence)");
    expect(router).not.toContain("rentalEquipment: quote.rentalEquipment");
    expect(router).not.toContain("quoteEvidence: quote.quoteEvidence");
    expect(quoteForm).toContain("Open Cat Rental Store");
    expect(quoteForm).toContain("Internal rental cost:");
    expect(quoteForm).toContain("Site photos for AI Suggest");
    expect(quoteForm).toContain("Proof of insurance for the quote email");
    expect(quoteForm).toContain("Saved proof-of-insurance library");
    expect(quoteForm).toContain("Internal rental-only margin");
    expect(quoteForm).toContain("Generate concise cost review");
  });

  it("uses explicit attachment limits and validates that documents belong to the quote owner", () => {
    const router = source("server/nativeQuotesRouter.ts");

    expect(router).toContain("Each quote attachment must be 10 MB or smaller.");
    expect(router).toContain("Attach no more than three proof-of-insurance documents at a time.");
    expect(router).toContain("cleanStoredAttachmentKey(document.key, ownerId)");
    expect(router).toContain("Quote attachments must belong to the signed-in Operations account.");
    expect(router).toContain("Selected insurance documents are too large to email together.");
  });
});
