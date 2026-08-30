import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getQuoteRentalCostCents, getQuoteRentalOnlyMargin, getQuoteRentalOnlyMarginStatus, getQuoteTotalWithRentalCharge, MAX_QUOTE_EVIDENCE_PHOTOS, parseQuoteSupportArtifactArray, parseQuoteSupportArtifacts } from "../shared/quoteSupportArtifacts";

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

  it("uses conservative red, amber, and green cues only for the rental-only margin", () => {
    expect(getQuoteRentalOnlyMarginStatus(null)).toEqual({ tone: "neutral", label: "Add rental cost" });
    expect(getQuoteRentalOnlyMarginStatus(24.9)).toEqual({ tone: "red", label: "Thin rental-only margin" });
    expect(getQuoteRentalOnlyMarginStatus(25)).toEqual({ tone: "amber", label: "Review rental-only margin" });
    expect(getQuoteRentalOnlyMarginStatus(40)).toEqual({ tone: "green", label: "Healthy rental-only margin" });
  });

  it("includes confirmed rental, transport, and tax in the customer total with the selected markup and whole-dollar ceiling", () => {
    expect(getQuoteTotalWithRentalCharge(1_000_000, 100_100, 15)).toEqual({
      rentalCustomerChargeCents: 115_200,
      rentalMarkupCents: 15_100,
      totalCents: 1_115_200,
    });
    expect(getQuoteTotalWithRentalCharge(1_000_000, 100_000, 10)).toEqual({
      rentalCustomerChargeCents: 110_000,
      rentalMarkupCents: 10_000,
      totalCents: 1_110_000,
    });
  });

  it("passes the selected rental markup into AI Suggest so its displayed final total includes the rental component", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(quoteForm).toContain("rentalMarkupPct: form.rentalMarkupPct");
    expect(router).toContain("rentalMarkupPct: z.number().int().min(10).max(20).optional()");
    expect(router).toContain("getQuoteTotalWithRentalCharge(totalMid * 100, getQuoteRentalCostCents(rentalEquipment), rentalMarkupPct)");
    expect(router).toContain("getQuoteTotalWithRentalCharge(serviceTotalCents, getQuoteRentalCostCents(rentalEquipment), rentalMarkupPct).totalCents");
  });

  it("fails closed to an empty support-artifact collection when a legacy quote has malformed JSON", () => {
    expect(parseQuoteSupportArtifacts("not-json", [])).toEqual([]);
    expect(parseQuoteSupportArtifactArray("not-json")).toEqual([]);
    expect(parseQuoteSupportArtifactArray('{"key":"quotes/1/evidence/example"}')).toEqual([{ key: "quotes/1/evidence/example" }]);
  });

  it("uses one twenty-photo maximum for saved evidence, AI Suggest input, and Gemini visual review", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(MAX_QUOTE_EVIDENCE_PHOTOS).toBe(20);
    expect(router).toContain("evidence.slice(0, MAX_QUOTE_EVIDENCE_PHOTOS)");
    expect(router).toContain("quoteEvidence: z.array(quoteEvidenceSchema).max(MAX_QUOTE_EVIDENCE_PHOTOS).optional()");
    expect(router).toContain("evidence: z.array(quoteEvidenceSchema).max(MAX_QUOTE_EVIDENCE_PHOTOS).optional()");
    expect(quoteForm).toContain('const maximum = kind === "evidence" ? MAX_QUOTE_EVIDENCE_PHOTOS : 12');
    expect(quoteForm).toContain("evidence: Array.isArray(form.quoteEvidence) ? form.quoteEvidence.slice(0, MAX_QUOTE_EVIDENCE_PHOTOS) : []");
    expect(quoteForm).toContain("AI Suggest can review up to 20 saved photos.");
    expect(quoteForm).toContain("Drop up to 20 site photos here or click to browse");
    expect(quoteForm).toContain("onDrop={handleEvidenceDrop}");
    expect(quoteForm).toContain("uploadProgress?.kind === \"evidence\"");
    expect(quoteForm).toContain("Preparing the visual review for");
    expect(quoteForm).toContain("Reviewing ${Math.min(form.quoteEvidence.length, MAX_QUOTE_EVIDENCE_PHOTOS)} site photo");
  });

  it("compresses evidence before upload, permits deliberate reordering, and persists internal Gemini captions and tags", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain("captionEvidence: ownerProcedure");
    expect(router).toContain('model: "gemini-3-flash-preview"');
    expect(router).toContain("quoteId: z.number().int().positive().optional()");
    expect(router).toContain("Database unavailable while saving photo captions.");
    expect(router).toContain("caption: z.string().trim().min(1).max(240).optional()");
    expect(router).toContain("tags: z.array(z.string().trim().min(1).max(48)).max(5).optional()");
    expect(quoteForm).toContain("compressQuoteEvidenceImage");
    expect(quoteForm).toContain('canvas.toBlob');
    expect(quoteForm).toContain('"image/webp", 0.82');
    expect(quoteForm).toContain('stage: "compressing"');
    expect(quoteForm).toContain("Move ${attachment.filename} earlier");
    expect(quoteForm).toContain("Move ${attachment.filename} later");
    expect(quoteForm).toContain("Writing internal photo captions and site-detail tags");
    expect(quoteForm).toContain("captionEvidenceMutation.mutate({ evidence: form.quoteEvidence");
  });

  it("exposes only selected annotated site references to the customer portal and its printable PDF", () => {
    const artifacts = source("shared/quoteSupportArtifacts.ts");
    const router = source("server/nativeQuotesRouter.ts");
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    const portal = source("client/src/pages/NativeQuotePortal.tsx");

    expect(artifacts).toContain("includeInCustomerPdf?: boolean");
    expect(router).toContain("includeInCustomerPdf: z.boolean().optional()");
    expect(router).toContain("attachment.includeInCustomerPdf !== false && attachment.caption");
    expect(router).toContain("sitePhotoReferences");
    expect(quoteForm).toContain("Customer quote PDF photo references");
    expect(quoteForm).toContain("includeInCustomerPdf: event.target.checked");
    expect(portal).toContain("Site reference photos");
    expect(portal).toContain("quote.sitePhotoReferences.length > 0");
    expect(portal).toContain("Final conditions and scope remain subject to site verification.");
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
    expect(router).toContain("Consider potential missing labor, fuel, mobilization, machine-wear, access, and scope costs");
    expect(router).toContain("aiCostFlags: JSON.stringify(flags)");
    expect(router).toContain("recommendedRentalMarkupPct");
    expect(router).toContain("markupRecommendationReason");
    expect(router).toContain("minimum: 10, maximum: 20");
    expect(router).toContain("This is internal decision support and does not set a final price.");
    expect(router).toContain("assertOwnedAttachmentKeys(ctx.user.id, input.quoteEvidence ?? [])");
    expect(router).toContain("assertOwnedAttachmentKeys(ctx.user.id, evidence)");
    expect(router).toContain("rentalMarkupPct: z.number().int().min(10).max(20).optional()");
    expect(router).toContain("getQuoteTotalWithRentalCharge(serviceTotalCents, rentalCostCents, rentalMarkupPct)");
    expect(router).toContain("getIncludedRentalCustomerCharge(quote)");
    expect(router).not.toContain("rentalEquipment: quote.rentalEquipment");
    expect(router).not.toContain("quoteEvidence: quote.quoteEvidence");
    expect(quoteForm).toContain("Open Cat Rental Store");
    expect(quoteForm).toContain("Internal rental cost:");
    expect(quoteForm).toContain("Site photos for AI Suggest");
    expect(quoteForm).toContain("Proof of insurance for the quote email");
    expect(quoteForm).toContain("Saved proof-of-insurance library");
    expect(quoteForm).toContain("Internal rental-only margin");
    expect(quoteForm).toContain("Generate concise cost review");
    expect(quoteForm).toContain("RENTAL_MARGIN_TONE_CLASSES");
    expect(quoteForm).toContain("Customer rental markup");
    expect(quoteForm).toContain("Included rental component");
    expect(quoteForm).toContain("Live customer total preview");
    expect(quoteForm).toContain("Internal rental cost breakdown");
    expect(quoteForm).toContain("Suggested rental markup:");
    expect(quoteForm).toContain("evidence: Array.isArray(form.quoteEvidence) ? form.quoteEvidence.slice(0, MAX_QUOTE_EVIDENCE_PHOTOS) : []");
    expect(quoteForm).toContain("Cost categories to verify");
    expect(quoteForm).toContain("Preview");
    expect(quoteForm).toContain("Remove");
  });

  it("generates an editable client message from completed quote facts without exposing internal cost detail", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain("generateClientMessage: ownerProcedure");
    expect(router).toContain('model: "gemini-3-flash-preview"');
    expect(router).toContain("Final quoted total:");
    expect(router).toContain("Property / work-area reference:");
    expect(router).toContain("never guarantee legal property lines, boundaries, acreage, permits, or utility locations");
    expect(router).toContain("do not break out internal costs, rental, margin, fuel, labor, discounts, or markup");
    expect(router).toContain("assertOwnedAttachmentKeys(ctx.user.id, evidence)");
    expect(quoteForm).toContain("generateClientMessageMutation");
    expect(quoteForm).toContain("Generate client message");
    expect(quoteForm).toContain("Review and edit it before sending.");
    expect(quoteForm).toContain("clientMessage: message");
  });

  it("does not display a stale no-evidence conclusion after photos or measurements change", () => {
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(quoteForm).toContain("const evidenceReviewSignature = useMemo");
    expect(quoteForm).toContain("evidence: form.quoteEvidence.map((attachment) => attachment.key)");
    expect(quoteForm).toContain("measurements: form.quoteMeasurements.map");
    expect(quoteForm).toContain('aiEvidenceSummary: ""');
    expect(quoteForm).toContain('aiCostReview: ""');
    expect(quoteForm).toContain("Site evidence changed.");
    expect(quoteForm).toContain("Run AI Suggest or Generate concise cost review again");
    expect(quoteForm).toContain("setIsEvidenceReviewStale(false);");
  });

  it("uses an in-app insurance preview with labeled download and separate-tab fallbacks instead of an unlabeled blank tab", () => {
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(quoteForm).toContain("const openInsurancePreview");
    expect(quoteForm).toContain('openInsurancePreview(document)');
    expect(quoteForm).toContain("Preview is provided for a quick check.");
    expect(quoteForm).toContain('type="application/pdf"');
    expect(quoteForm).toContain("This browser cannot show the PDF preview.");
    expect(quoteForm).toContain("Download document");
    expect(quoteForm).toContain("Open separately");
  });

  it("intercepts quote evidence thumbnail clicks and shows the same in-app attachment preview", () => {
    const quoteForm = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(quoteForm).toContain("const interceptEvidenceThumbnail");
    expect(quoteForm).toContain("document.addEventListener(\"click\", interceptEvidenceThumbnail, true)");
    expect(quoteForm).toContain("event.preventDefault();");
    expect(quoteForm).toContain("openInsurancePreview(attachment)");
    expect(quoteForm).toContain("Attachment preview");
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
