// ---------------------------------------------------------------------------
// scripts/build-index.ts — Build-time RAG index generator
// ---------------------------------------------------------------------------
//
// Reads all Markdown files from `knowledge/`, chunks them using the
// markdown-aware splitter, embeds locally via TF-IDF, and writes
// the index + manifest to `public/`.
//
// Usage:
//   npx tsx scripts/build-index.ts
//   npx tsx scripts/build-index.ts --dry-run
//   npx tsx scripts/build-index.ts --corpus=knowledge --out=public
//
// Wired to `prebuild` in package.json → runs automatically on `npm run build`.
// ---------------------------------------------------------------------------

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { chunkMarkdown } from "../lib/rag/splitter";
import { embedAllLocal, getEmbeddingModel } from "../lib/rag/embedder";
import type { RagChunk, RagIndex, RagManifest } from "../lib/rag/types";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const getArg = (name: string, fallback: string): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : fallback;
};
const isDryRun = args.includes("--dry-run");
const corpusDir = getArg("corpus", "knowledge");
const outDir = getArg("out", "public");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[build-index] Starting RAG index build...");
  console.log(`[build-index] Corpus: ${corpusDir}`);
  console.log(`[build-index] Output: ${outDir}`);
  console.log(`[build-index] Dry run: ${isDryRun}`);

  // 1. Read all .md files from the corpus directory
  const corpusPath = join(process.cwd(), corpusDir);
  let files: string[];
  try {
    const entries = await readdir(corpusPath);
    files = entries.filter((f) => f.endsWith(".md"));
  } catch (err) {
    console.error(
      `[build-index] ERROR: Cannot read corpus directory "${corpusPath}":`,
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(
      `[build-index] ERROR: No .md files found in "${corpusPath}". ` +
        `Refusing to ship a 0-chunk index.`,
    );
    process.exit(1);
  }

  console.log(`[build-index] Found ${files.length} corpus files: ${files.join(", ")}`);

  // 2. Read and chunk each file
  const allChunks: Omit<RagChunk, "vector">[] = [];
  const contentHashes: string[] = [];

  for (const file of files) {
    const filePath = join(corpusPath, file);
    const raw = await readFile(filePath, "utf-8");
    contentHashes.push(
      createHash("sha256").update(raw).digest("hex"),
    );

    // Extract title from YAML frontmatter
    const title = extractFrontmatterTitle(raw) || basename(file, ".md");

    // Strip frontmatter before chunking
    const content = stripFrontmatter(raw);

    // Chunk
    const rawChunks = chunkMarkdown(content, { chunkSize: 500, overlap: 80 });

    console.log(
      `[build-index]   ${file}: ${rawChunks.length} chunks`,
    );

    for (let i = 0; i < rawChunks.length; i++) {
      allChunks.push({
        id: `${basename(file, ".md")}#${i}`,
        source: file,
        title,
        heading: rawChunks[i].heading,
        text: rawChunks[i].text,
      });
    }
  }

  console.log(
    `[build-index] Total chunks: ${allChunks.length}`,
  );

  if (allChunks.length === 0) {
    console.error(
      "[build-index] ERROR: Chunking produced 0 chunks. Check corpus content.",
    );
    process.exit(1);
  }

  if (isDryRun) {
    console.log("[build-index] Dry run — skipping embedding and write.");
    console.log("[build-index] Chunks preview:");
    for (const chunk of allChunks.slice(0, 5)) {
      console.log(
        `  [${chunk.id}] "${chunk.heading}" (${chunk.text.length} chars)`,
      );
    }
    return;
  }

  // 3. Embed all chunks locally (TF-IDF — no API key required)
  console.log(
    `[build-index] Embedding ${allChunks.length} chunks with ${getEmbeddingModel()} (local)...`,
  );

  const texts = allChunks.map((c) => c.text);
  const { vectors, vocab, idf } = embedAllLocal(texts);

  if (vectors.length !== allChunks.length) {
    console.error(
      `[build-index] ERROR: Got ${vectors.length} vectors for ${allChunks.length} chunks`,
    );
    process.exit(1);
  }

  const dim = vectors[0].length;

  // 4. Assemble index (includes vocab + idf for runtime query embedding)
  const index: RagIndex = {
    model: getEmbeddingModel(),
    dim,
    chunks: allChunks.map((chunk, i) => ({
      ...chunk,
      vector: vectors[i],
    })),
    vocab,
    idf,
  };

  // 5. Write index and manifest
  const outputPath = join(process.cwd(), outDir);
  await mkdir(outputPath, { recursive: true });

  const indexPath = join(outputPath, "rag-index.json");
  const manifestPath = join(outputPath, "rag-manifest.json");

  const contentHash = createHash("sha256")
    .update(contentHashes.join("|"))
    .digest("hex")
    .slice(0, 16);

  const manifest: RagManifest = {
    hash: contentHash,
    model: getEmbeddingModel(),
    dim,
    count: allChunks.length,
    builtAt: new Date().toISOString(),
  };

  await writeFile(indexPath, JSON.stringify(index), "utf-8");
  await writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  const indexSizeKB = (
    Buffer.byteLength(JSON.stringify(index)) / 1024
  ).toFixed(1);

  console.log(`[build-index] ✓ Index written to ${indexPath} (${indexSizeKB} KB)`);
  console.log(`[build-index] ✓ Manifest written to ${manifestPath}`);
  console.log(
    `[build-index] ✓ Done: ${allChunks.length} chunks, dim=${dim}, vocab=${vocab.length} terms, model=${getEmbeddingModel()}`,
  );
}

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

function extractFrontmatterTitle(raw: string): string | null {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const frontmatter = match[1];
  const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
  return titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : null;
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

// Load .env and .env.local (simple dotenv without a dependency)
async function loadEnv() {
  const envFiles = [".env", ".env.local"];
  for (const envFile of envFiles) {
    try {
      const envPath = join(process.cwd(), envFile);
      const envContent = await readFile(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // File doesn't exist — that's fine
    }
  }
}

loadEnv().then(() => main()).catch((err) => {
  console.error("[build-index] Fatal:", err);
  process.exit(1);
});
