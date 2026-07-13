// ---------------------------------------------------------------------------
// lib/rag/retriever.ts — LangChain Embeddings + Local Cosine Retriever
// ---------------------------------------------------------------------------
//
// Hot-path flow:
//   1. Load index (cached after first call)
//   2. Embed the query via LangChain (GoogleGenerativeAIEmbeddings)
//   3. Cosine scan across all chunks
//   4. Filter by minScore, take top-K, cap total context chars
// ---------------------------------------------------------------------------

import type { RagConfig, RagHit, RagQuery } from "./types";
import { loadIndex } from "./index-cache";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// ---------------------------------------------------------------------------
// Defaults (overridable via env)
// ---------------------------------------------------------------------------

const DEFAULT_K = 3;
// Dense embeddings typically have higher baseline cosine similarities than TF-IDF.
const DEFAULT_MIN_SCORE = 0.5;
const DEFAULT_MAX_CONTEXT_CHARS = 2400;

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

let embeddings: GoogleGenerativeAIEmbeddings | null = null;

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

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[rag] GEMINI_API_KEY missing — skipping retrieval");
      return [];
    }

    if (!embeddings) {
      embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: "gemini-embedding-001",
      });
    }

    // 2. Embed query locally (via API, but called at runtime)
    const queryString = buildQueryString(query);
    const qVec = await embeddings.embedQuery(queryString);

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

function buildQueryString(query: RagQuery): string {
  return `tone: ${query.tone} | language: ${query.language} | length: ${query.length} | brief: ${query.description}`;
}

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
