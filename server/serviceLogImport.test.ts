import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractServiceLogDocumentText,
  getServiceLogImportFileType,
  isSupportedServiceLogDocument,
  MAX_SERVICE_LOG_IMPORT_BYTES,
} from "./serviceLogImport";
import { SERVICE_LOG_CATEGORIES } from "@shared/serviceLogCategories";

const fixture = (name: string) => readFileSync(resolve(import.meta.dirname, "fixtures", name));
const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("Field Fix service log document import", () => {
  it("recognizes the explicitly supported PDF and Word formats", () => {
    expect(getServiceLogImportFileType("service-history.pdf")).toBe("pdf");
    expect(getServiceLogImportFileType("service-history.doc")).toBe("doc");
    expect(getServiceLogImportFileType("service-history.docx")).toBe("docx");
    expect(getServiceLogImportFileType("service-history.txt")).toBeNull();
    expect(isSupportedServiceLogDocument("service-history.pdf", "application/pdf")).toBe(true);
    expect(isSupportedServiceLogDocument("service-history.doc", "application/msword")).toBe(true);
    expect(isSupportedServiceLogDocument("service-history.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(isSupportedServiceLogDocument("service-history.txt", "text/plain")).toBe(false);
    expect(SERVICE_LOG_CATEGORIES).toContain("Engine");
    expect(SERVICE_LOG_CATEGORIES).toContain("Hydraulics");
    expect(SERVICE_LOG_CATEGORIES).toContain("Electrical");
  });

  it("extracts text from a normal PDF service log without a local office suite", async () => {
    const extracted = await extractServiceLogDocumentText(fixture("service-log-sample.pdf"), "service-log-sample.pdf");
    expect(extracted.fileType).toBe("pdf");
    expect(extracted.text).toContain("Engine Oil and Filter");
    expect(extracted.text).toContain("Grease Points and Track Inspection");
  });

  it("extracts text from a modern DOCX service log", async () => {
    const extracted = await extractServiceLogDocumentText(fixture("service-log-sample.docx"), "service-log-sample.docx");
    expect(extracted.fileType).toBe("docx");
    expect(extracted.text).toContain("Engine Oil & Filter");
    expect(extracted.text).toContain("Noland Earthworks");
  });

  it("extracts text from a legacy binary DOC service log", async () => {
    const extracted = await extractServiceLogDocumentText(fixture("word-extractor-test01.doc"), "legacy-service-log.doc");
    expect(extracted.fileType).toBe("doc");
    expect(extracted.text).toContain("Unicode");
  });

  it("fails closed for unsupported, empty, or oversized documents", async () => {
    await expect(extractServiceLogDocumentText(Buffer.from("text"), "service-log.txt")).rejects.toThrow("Use a PDF, DOC, or DOCX");
    await expect(extractServiceLogDocumentText(Buffer.alloc(0), "service-log.pdf")).rejects.toThrow("10 MB or smaller");
    await expect(extractServiceLogDocumentText(Buffer.alloc(MAX_SERVICE_LOG_IMPORT_BYTES + 1), "service-log.pdf")).rejects.toThrow("10 MB or smaller");
  });

  it("stages AI-extracted entries for owner review, then adds only accepted rows with their source document", () => {
    const router = source("server/fieldFixRouter.ts");
    const page = source("client/src/pages/ops/FieldFix.tsx");
    const schema = source("drizzle/schema.ts");

    expect(router).toContain("extractServiceLogDocument: adminProcedure");
    expect(router).toContain("importServiceLogEntries: adminProcedure");
    expect(router).toContain('model: "gpt-5-mini"');
    expect(router).toContain("sourceDocumentUrl: input.sourceDocumentUrl");
    expect(router).toContain("sourceDocumentName: input.sourceDocumentName");
    expect(router).toContain("serviceCategory: entry.serviceCategory");
    expect(router).toContain("Assign exactly one serviceCategory");
    expect(page).toContain("Import Service Log");
    expect(page).toContain("ready for review");
    expect(page).toContain("Import {importEntries.length}");
    expect(page).toContain("System Category *");
    expect(page).toContain("Service log import progress");
    expect(page).toContain("Identifying maintenance items");
    expect(page).toContain("getServiceCategoryBadgeClass(log.serviceCategory)");
    expect(page).toContain("Imported from {log.sourceDocumentName");
    expect(schema).toContain('sourceDocumentUrl: text("sourceDocumentUrl")');
    expect(schema).toContain('sourceDocumentName: varchar("sourceDocumentName"');
    expect(schema).toContain('serviceCategory: varchar("serviceCategory"');
  });
});
