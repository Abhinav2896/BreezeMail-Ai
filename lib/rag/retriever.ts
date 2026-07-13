// ---------------------------------------------------------------------------
// lib/rag/retriever.ts — Cosine-similarity retriever (local TF-IDF)
// ---------------------------------------------------------------------------
//
// Hot-path flow:
//   1. Load index (cached after first call)
//   2. Embed the query locally (TF-IDF, no API call, ~1ms)
//   3. Cosine scan across all chunks
//   4. Filter by minScore, take top-K, cap total context chars
//
// All operations are pure CPU — no network calls in the retrieval path.
// ---------------------------------------------------------------------------

import type { RagConfig, RagHit, RagQuery } from "./types";
import { embedQuery } from "./embedder";
import { loadIndex } from "./index-cache";

// ---------------------------------------------------------------------------
// Defaults (overridable via env)
// ---------------------------------------------------------------------------

const DEFAULT_K = 3;
const DEFAULT_MIN_SCORE = 0.1; // TF-IDF cosine scores are typically lower than dense embeddings
const DEFAULT_MAX_CONTEXT_CHARS = 2400;

/**
 * Build RagConfig from environment variables with sensible defaults.
 */
export function buildRagConfig(): RagConfig {
  return {
    k: parseInt(process.env.RAG_K ?? "", 10) || DEFAULT_K,
    minScore:
      parseFloat(process.env.RAG_MIN_SCORE ?? "") || DEFAULT_MIN_SCORE,
    maxContextChars:
      parseInt(process.env.RAG_MAX_CONTEXT_CHARS ?? "", 10) ||
      DEFAULT_MAX_CONTEXT_CHARS,
  };
}

/**
 * Retrieve the top-K relevant chunks for a given query.
 *
 * Graceful degradation:
 * - If the index fails to load → returns []
 * - If embedding fails → returns []
 * - If no chunks pass minScore → returns []
 *
 * Never throws.
 */
export async function retrieve(
  query: RagQuery,
  cfg?: Partial<RagConfig>,
): Promise<RagHit[]> {
  const config: RagConfig = {
    ...buildRagConfig(),
    ...cfg,
  };

  const startTime = Date.now();

  try {
    // 1. Load index (cached after first call)
    const index = await loadIndex();

    if (index.chunks.length === 0) {
      console.warn("[rag] Index has 0 chunks — skipping retrieval");
      return [];
    }

    if (!index.vocab || !index.idf) {
      console.warn("[rag] Index missing vocab/idf — skipping retrieval");
      return [];
    }

    // 2. Embed query locally (TF-IDF, no API call, ~1ms)
    const queryString = buildQueryString(query);
    const qVec = embedQuery(queryString, index.vocab, index.idf);

    // 3. Cosine scan
    const scored: Array<RagHit & { _charCount: number }> = [];
    for (const chunk of index.chunks) {
      const score = cosineSimilarity(qVec, chunk.vector);
      if (score >= config.minScore) {
        scored.push({
          id: chunk.id,
          source: chunk.source,
          title: chunk.title,
          snippet: chunk.text,
          score,
          _charCount: chunk.text.length,
        });
      }
    }

    // 4. Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // 5. Take top-K, respecting maxContextChars
    const results: RagHit[] = [];
    let totalChars = 0;

    for (const hit of scored) {
      if (results.length >= config.k) break;
      if (totalChars + hit._charCount > config.maxContextChars) continue;
      totalChars += hit._charCount;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _charCount, ...ragHit } = hit;
      results.push(ragHit);
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `[rag] Retrieved ${results.length} hits (${scored.length} passed minScore) in ${elapsed}ms`,
    );

    return results;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.warn(
      `[rag] Retrieval failed after ${elapsed}ms:`,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a normalized query string from structured fields.
 * Including tone/language/length helps surface style-relevant chunks.
 */
function buildQueryString(query: RagQuery): string {
  return `tone: ${query.tone} | language: ${query.language} | length: ${query.length} | brief: ${query.description}`;
}

/**
 * Compute cosine similarity between two vectors.
 * Assumes vectors may not be pre-normalized.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
