
import type { DocumentChunk } from "./types";

// Split extracted document text into smaller chunks.
export function splitDocumentIntoChunks(
  text: string,
  chunkSize = 1200,
  overlap = 200
): DocumentChunk[] {
  const pages = text.split(/--- Page \d+ ---/);
  const chunks: DocumentChunk[] = [];

  let globalPage = 0;

  for (const pageTextRaw of pages) {
    const pageText = pageTextRaw.trim();

    if (!pageText) continue;

    globalPage++;

    let start = 0;

    while (start < pageText.length) {
      const end = Math.min(start + chunkSize, pageText.length);
      const chunkText = pageText.slice(start, end).trim();

      if (chunkText) {
        chunks.push({
          text: chunkText,
          page: pages.length > 1 ? globalPage : null,
        });
      }

      if (end >= pageText.length) break;

      start = end - overlap;
    }
  }

  return chunks;
}

// Return document context for the AI.
// Keep the full document for normal-sized files so important
// information such as applicant names is not filtered out.
export function getRelevantDocumentContext(
  documentText: string,
  question: string,
  maxChunks = 5
): string {
  const text = documentText.trim();

  if (!text) return "";

  // For documents up to 50,000 characters, include everything.
  // This avoids losing names, numbers, and other details.
  const MAX_FULL_DOCUMENT_LENGTH = 50_000;

  if (text.length <= MAX_FULL_DOCUMENT_LENGTH) {
    return text;
  }

  // For larger documents, select relevant chunks.
  const chunks = splitDocumentIntoChunks(text);

  const terms =
    question
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((term) => term.length > 1) ?? [];

  if (terms.length === 0) {
    return chunks
      .slice(0, maxChunks)
      .map((chunk) => chunk.text)
      .join("\n\n");
  }

  const scoredChunks = chunks.map((chunk, index) => {
    const content = chunk.text.toLowerCase();

    let score = 0;

    for (const term of terms) {
      const escaped = term.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const matches = content.match(
        new RegExp(`\\b${escaped}\\b`, "gu")
      );

      if (matches) {
        score += matches.length;
      }
    }

    return {
      ...chunk,
      index,
      score,
    };
  });

  const relevantChunks = scoredChunks
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .sort((a, b) => a.index - b.index);

  if (relevantChunks.length === 0) {
    return chunks
      .slice(0, maxChunks)
      .map((chunk) => chunk.text)
      .join("\n\n");
  }

  return relevantChunks
    .map((chunk) => {
      const pageLabel = chunk.page
        ? `Page ${chunk.page}`
        : "Document";

      return `[${pageLabel}]\n${chunk.text}`;
    })
    .join("\n\n---\n\n");
}