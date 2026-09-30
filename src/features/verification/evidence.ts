import { mediaPath } from "@/features/catalog/resource";

/**
 * Where this dashboard serves one piece of evidence: the private folder's own
 * route, which attaches the session's token and lets nothing be cached.
 *
 * Built from the key rather than taken from the API's `evidenceUrl`, which
 * points wherever the API's media base URI does — possibly at the API itself,
 * where the browser holds no token and the picture would never load. A key
 * outside the private folder is not evidence and gets no link.
 */
export function evidenceHref(key: string | null | undefined): string | null {
  return key && key.startsWith("verification/") ? mediaPath(key) : null;
}

/** Evidence is an invoice as a PDF, or a photo of one; a PDF has no thumbnail. */
export function isPdfEvidence(key: string | null | undefined): boolean {
  return Boolean(key && key.toLowerCase().endsWith(".pdf"));
}

/** What the evidence picker takes. The API reads the bytes and holds it to the same list. */
export const EVIDENCE_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** What the dashboard's upload route takes per file. */
export const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
