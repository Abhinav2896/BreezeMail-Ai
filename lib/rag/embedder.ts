// ---------------------------------------------------------------------------
// lib/rag/embedder.ts — Local TF-IDF-based embedder (zero API dependency)
// ---------------------------------------------------------------------------
//
// Since the corpus is small (~100 chunks), we use a local TF-IDF-based
// vectorization approach. This eliminates the dependency on the embedding
// API endpoint (which some API key types don't support) and removes all
// network calls from both build-time indexing and runtime retrieval.
//
// Advantages:
// - No API key needed for embeddings
// - No network latency on retrieval hot path
// - Works with any API key type
// - Deterministic, reproducible vectors
//
// The TF-IDF vectors are high-dimensional but sparse in concept; we use
// a fixed vocabulary built at index time and stored in the index.
// ---------------------------------------------------------------------------

/** Tokenize text into lowercase terms, removing common stop words */
function tokenize(text: string): string[] {
  const STOP_WORDS = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "because", "but", "and", "or", "if", "while", "this", "that",
    "these", "those", "it", "its", "i", "me", "my", "we", "our", "you",
    "your", "he", "him", "his", "she", "her", "they", "them", "their",
    "what", "which", "who", "whom", "up", "about", "also", "like",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Compute term frequency for a list of tokens */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  const len = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / len);
  }
  return tf;
}

/**
 * Build a vocabulary and IDF values from a collection of documents.
 * Returns { vocabulary: term→index mapping, idf: term→IDF value mapping }.
 */
export function buildVocabulary(
  documents: string[],
): { vocab: Map<string, number>; idf: Map<string, number> } {
  const docFreq = new Map<string, number>();
  const N = documents.length;

  // Count document frequency for each term
  for (const doc of documents) {
    const uniqueTerms = new Set(tokenize(doc));
    for (const term of uniqueTerms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  // Filter: keep terms that appear in at least 1 doc and at most 90% of docs
  // Sort alphabetically for deterministic ordering
  const terms = [...docFreq.keys()]
    .filter((t) => {
      const df = docFreq.get(t)!;
      return df >= 1 && df <= N * 0.9;
    })
    .sort();

  const vocab = new Map<string, number>();
  const idf = new Map<string, number>();

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    vocab.set(term, i);
    // IDF with smoothing: log((N + 1) / (df + 1)) + 1
    idf.set(term, Math.log((N + 1) / (docFreq.get(term)! + 1)) + 1);
  }

  return { vocab, idf };
}

/**
 * Embed a single text into a TF-IDF vector using a pre-built vocabulary.
 * Returns a dense vector of the vocabulary dimension.
 */
export function embedTextLocal(
  text: string,
  vocab: Map<string, number>,
  idf: Map<string, number>,
): number[] {
  const dim = vocab.size;
  const vector = new Array<number>(dim).fill(0);
  const tokens = tokenize(text);
  const tf = termFrequency(tokens);

  for (const [term, tfVal] of tf) {
    const idx = vocab.get(term);
    if (idx !== undefined) {
      vector[idx] = tfVal * (idf.get(term) || 1);
    }
  }

  // L2 normalize
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vector[i] /= norm;
  }

  return vector;
}

/**
 * Embed multiple texts at build time.
 * First builds the vocabulary from all texts, then embeds each.
 * Returns { vectors, vocab, idf } — vocab and idf are serialized into the index.
 */
export function embedAllLocal(
  texts: string[],
): {
  vectors: number[][];
  vocab: [string, number][];
  idf: [string, number][];
} {
  if (texts.length === 0) {
    return { vectors: [], vocab: [], idf: [] };
  }

  const { vocab, idf } = buildVocabulary(texts);
  console.log(`[embedder] Built vocabulary: ${vocab.size} terms from ${texts.length} documents`);

  const vectors = texts.map((text, i) => {
    const vec = embedTextLocal(text, vocab, idf);
    if ((i + 1) % 20 === 0 || i === texts.length - 1) {
      console.log(`[embedder] Embedded ${i + 1}/${texts.length} chunks`);
    }
    return vec;
  });

  return {
    vectors,
    vocab: [...vocab.entries()],
    idf: [...idf.entries()],
  };
}

/**
 * Embed a query at runtime using a pre-built vocabulary.
 * The vocab and idf are loaded from the stored index.
 */
export function embedQuery(
  text: string,
  vocabEntries: [string, number][],
  idfEntries: [string, number][],
): number[] {
  const vocab = new Map(vocabEntries);
  const idf = new Map(idfEntries);
  return embedTextLocal(text, vocab, idf);
}

/** Returns the embedding model name (for manifest metadata) */
export function getEmbeddingModel(): string {
  return "tfidf-local-v1";
}
