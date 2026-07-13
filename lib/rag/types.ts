// ---------------------------------------------------------------------------
// lib/rag/types.ts — RAG subsystem type definitions
// ---------------------------------------------------------------------------

/**
 * A single chunk of text extracted from a knowledge-base document.
 * Created at build time by the splitter, enriched with a vector by the embedder.
 */
export interface RagChunk {
  /** Unique chunk identifier: `<source-filename>#<chunk-index>` */
  id: string;
  /** Source file path relative to `knowledge/` (e.g. "voice-and-tone.md") */
  source: string;
  /** Document title extracted from YAML frontmatter */
  title: string;
  /** The chunk's heading context (e.g. "## Professional Tone") */
  heading: string;
  /** The raw text content of this chunk */
  text: string;
  /** Embedding vector — populated at build time */
  vector: number[];
}

/**
 * A retrieval hit: a chunk that scored above `minScore` after cosine scan.
 */
export interface RagHit {
  /** Chunk identifier */
  id: string;
  /** Source file */
  source: string;
  /** Document title */
  title: string;
  /** The text snippet used as context */
  snippet: string;
  /** Cosine similarity score (0–1) */
  score: number;
}

/**
 * The on-disk JSON index produced by `scripts/build-index.ts`.
 */
export interface RagIndex {
  /** Embedding model used to produce vectors */
  model: string;
  /** Dimensionality of each vector */
  dim: number;
  /** All embedded chunks */
  chunks: RagChunk[];
  /** TF-IDF vocabulary: [term, index] pairs (for local embedder) */
  vocab?: [string, number][];
  /** TF-IDF IDF values: [term, idf] pairs (for local embedder) */
  idf?: [string, number][];
}

/**
 * Build manifest written alongside the index.
 */
export interface RagManifest {
  /** SHA-256 hash of all source file contents */
  hash: string;
  /** Embedding model name */
  model: string;
  /** Vector dimensionality */
  dim: number;
  /** Total number of chunks */
  count: number;
  /** ISO timestamp of build */
  builtAt: string;
}

/**
 * Runtime configuration for the retriever.
 */
export interface RagConfig {
  /** Number of top hits to return */
  k: number;
  /** Minimum cosine similarity threshold (0–1) */
  minScore: number;
  /** Maximum total character count for all context snippets */
  maxContextChars: number;
}

/**
 * Query input for retrieval — mirrors the user's generation request fields.
 */
export interface RagQuery {
  description: string;
  tone: string;
  language: string;
  length: string;
}

/**
 * Source reference returned in the API response for UI rendering.
 */
export interface SourceRef {
  id: string;
  title: string;
}
