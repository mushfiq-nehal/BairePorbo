import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const MAX_CV_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "application/msword", // .doc (best-effort — often still zipped docx)
];

export class UnsupportedFileError extends Error {}

/**
 * Extract plain text from an uploaded CV file (PDF / DOCX / TXT).
 * Throws {@link UnsupportedFileError} for unknown types so the caller can
 * return a 400 rather than a 500.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  }

  if (type === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8").trim();
  }

  throw new UnsupportedFileError(
    "Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
  );
}
