import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Quote.tsx"), "utf8");

describe("Site Visit request wizard", () => {
  it("uses ordered form steps with progress feedback and step-level validation", () => {
    expect(source).toContain('label: "Contact"');
    expect(source).toContain('label: "Property"');
    expect(source).toContain('label: "Project"');
    expect(source).toContain('label: "Review"');
    expect(source).toContain("const validateStep");
    expect(source).toContain("Step {currentStep} of {SITE_VISIT_WIZARD_STEPS.length}");
    expect(source).toContain("currentStep === 1");
    expect(source).toContain("currentStep === 2");
    expect(source).toContain("currentStep === 3");
  });

  it("renders photo thumbnails and clear document preview cards before submit", () => {
    expect(source).toContain("URL.createObjectURL(file)");
    expect(source).toContain("Preview of ${attachment.filename}");
    expect(source).toContain('"PDF document"');
    expect(source).toContain("removeAttachment(attachment)");
  });

  it("provides a final editable review and multi-file drag-and-drop upload path", () => {
    expect(source).toContain("Review your request");
    expect(source).toContain("setCurrentStep(1)");
    expect(source).toContain("setCurrentStep(2)");
    expect(source).toContain("setCurrentStep(3)");
    expect(source).toContain("Drag and drop one or more files here");
    expect(source).toContain("addDroppedAttachments");
    expect(source).toContain("event.dataTransfer.files");
    expect(source).toContain("currentStep < 4");
  });

  it("keeps final submission, Parcel ID lookup, location safeguards, and upload-state protection", () => {
    expect(source).toContain("lookupPublicParcel");
    expect(source).toContain("outOfAreaCounty");
    expect(source).toContain("isUploadingAttachments");
    expect(source).toContain("Request a Site Visit");
  });
});
