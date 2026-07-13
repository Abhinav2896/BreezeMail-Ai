// ---------------------------------------------------------------------------
// lib/rag/index-cache.ts — In-process RAG index cache
// ---------------------------------------------------------------------------
//
// Lazy-loads and memoizes the RagIndex from rag-index.json.
// The Promise itself is cached, so concurrent requests share the same load.
// ---------------------------------------------------------------------------

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RagIndex } from "./types";

// ---------------------------------------------------------------------------
// Index cache (Promise memoization)
// ---------------------------------------------------------------------------

let cachedIndex: Promise<RagIndex> | null = null;

/**
 * Lazily load and cache the RAG index from disk.
 * The Promise is memoized so concurrent requests share the same I/O.
 * Throws on parse/read failure — callers should catch and degrade.
 */
export function loadIndex(): Promise<RagIndex> {
  if (!cachedIndex) {
    cachedIndex = doLoadIndex().catch((err) => {
      // Clear the cache on failure so the next call retries
      cachedIndex = null;
      throw err;
    });
  }
  return cachedIndex;
}

async function doLoadIndex(): Promise<RagIndex> {
  // In Next.js, `process.cwd()` points to the project root at runtime.
  // The index is written to `public/rag-index.json` at build time.
  const indexPath = join(process.cwd(), "public", "rag-index.json");
  const raw = await readFile(indexPath, "utf-8");
  const parsed = JSON.parse(raw) as RagIndex;

  // Validate basic shape
  if (!parsed.model || !parsed.dim || !Array.isArray(parsed.chunks)) {
    throw new Error(
      "[rag] rag-index.json is malformed: missing model, dim, or chunks",
    );
  }

  console.log(
    `[rag] Index loaded: ${parsed.chunks.length} chunks, model=${parsed.model}, dim=${parsed.dim}`,
  );

  return parsed;
}

/** Clear the cached index (useful for testing) */
export function clearIndexCache(): void {
  cachedIndex = null;
}
