import { extname } from "node:path";
import WordExtractor from "word-extractor";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_SERVICE_LOG_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_SERVICE_LOG_IMPORT_PAGES = 40;
export const MAX_SERVICE_LOG_IMPORT_TEXT_CHARS = 80_000;

export const SERVICE_LOG_IMPORT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ServiceLogImportFileType = "pdf" | "doc" | "docx";

export function getServiceLogImportFileType(filename: string): ServiceLogImportFileType | null {
  const extension = extname(filename).toLowerCase();
  if (extension === ".pdf") return "pdf";
  if (extension === ".doc") return "doc";
  if (extension === ".docx") return "docx";
  return null;
}

export function sanitizeServiceLogImportFilename(filename: string): string {
  const cleaned = filename
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(-140);
  return cleaned || "service-log-import";
}

export function isSupportedServiceLogDocument(filename: string, mimeType: string): boolean {
  const type = getServiceLogImportFileType(filename);
  if (!type) return false;
  return !mimeType || SERVICE_LOG_IMPORT_MIME_TYPES.has(mimeType.toLowerCase());
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_SERVICE_LOG_IMPORT_TEXT_CHARS);
}

/**
 * Extracts text from the supported service-log source formats in memory. No
 * temporary files or host-level office installation are required in production.
 */
export async function extractServiceLogDocumentText(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string; fileType: ServiceLogImportFileType }> {
  const fileType = getServiceLogImportFileType(filename);
  if (!fileType) {
    throw new Error("Use a PDF, DOC, or DOCX service log.");
  }
  if (buffer.length === 0 || buffer.length > MAX_SERVICE_LOG_IMPORT_BYTES) {
    throw new Error("Each service log document must be 10 MB or smaller.");
  }

  let extracted = "";
  if (fileType === "pdf") {
    const document = await getDocumentProxy(new Uint8Array(buffer), {
      maxImageSize: 16_777_216,
    });
    if (document.numPages > MAX_SERVICE_LOG_IMPORT_PAGES) {
      throw new Error(`Service log PDFs are limited to ${MAX_SERVICE_LOG_IMPORT_PAGES} pages.`);
    }
    const result = await extractText(document, { mergePages: true });
    extracted = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
  } else {
    const document = await new WordExtractor().extract(buffer);
    extracted = [
      document.getBody(),
      document.getHeaders(),
      document.getFootnotes(),
      document.getEndnotes(),
      document.getTextboxes(),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const text = normalizeExtractedText(extracted);
  if (text.length < 12) {
    throw new Error(
      "No readable text was found. For a scanned PDF, upload a text-searchable PDF or a Word document instead.",
    );
  }
  return { text, fileType };
}
