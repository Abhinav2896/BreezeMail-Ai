// ---------------------------------------------------------------------------
// lib/rag/prompt.ts — RAG-augmented prompt builder
// ---------------------------------------------------------------------------
//
// Wraps the existing `buildPrompt` function and appends a context block
// from retrieved RAG hits. This is a pure addition — when hits are empty,
// the output is identical to the original buildPrompt.
// ---------------------------------------------------------------------------

import type { RagHit, SourceRef } from "./types";

/**
 * Build a context block from RAG hits to append to the prompt.
 *
 * The context is framed as "reference excerpts" with explicit instructions
 * to use them as style/voice guidance only — not to copy verbatim.
 * Each excerpt is delimited and attributed to prevent confusion.
 */
export function buildContextBlock(hits: RagHit[]): string {
  if (hits.length === 0) return "";

  const excerpts = hits
    .map(
      (h) =>
        `--- [${h.id}] from "${h.title}" (score: ${h.score.toFixed(2)}) ---\n${h.snippet}`,
    )
    .join("\n\n");

  return (
    `\n\n**Reference excerpts (use only as style/voice guidance, do not copy verbatim):**\n\n` +
    excerpts +
    `\n\n---\nUse the above excerpts to inform your writing style, tone, structure, and word choice. ` +
    `Do NOT quote them directly. Do NOT reference them in your output. ` +
    `They are invisible background guidance.`
  );
}

/**
 * Convert a RagHit to a SourceRef for the API response.
 */
export function toSourceRef(hit: RagHit): SourceRef {
  return {
    id: hit.id,
    title: hit.title,
  };
}
