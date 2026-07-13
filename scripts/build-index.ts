// ---------------------------------------------------------------------------
// scripts/build-index.ts — Build-time RAG index generator (LangChain)
// ---------------------------------------------------------------------------

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import type { RagChunk, RagIndex, RagManifest } from "../lib/rag/types";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

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
  console.log("[build-index] Starting RAG index build (LangChain)...");
  console.log(`[build-index] Corpus: ${corpusDir}`);
  console.log(`[build-index] Output: ${outDir}`);
  console.log(`[build-index] Dry run: ${isDryRun}`);

  if (!process.env.GEMINI_API_KEY) {
    console.error("[build-index] ERROR: GEMINI_API_KEY environment variable is required.");
    process.exit(1);
  }

  const corpusPath = join(process.cwd(), corpusDir);
  let files: string[];
  try {
    const entries = await readdir(corpusPath);
    files = entries.filter((f) => f.endsWith(".md"));
  } catch (err) {
    console.error(`[build-index] ERROR: Cannot read corpus directory "${corpusPath}":`, err);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("[build-index] ERROR: No .md files found in corpus.");
    process.exit(1);
  }

  const allChunks: Omit<RagChunk, "vector">[] = [];
  const contentHashes: string[] = [];

  const splitter = new MarkdownTextSplitter({
    chunkSize: 500,
    chunkOverlap: 80,
  });

  for (const file of files) {
    const filePath = join(corpusPath, file);
    const raw = await readFile(filePath, "utf-8");
    contentHashes.push(createHash("sha256").update(raw).digest("hex"));

    const title = extractFrontmatterTitle(raw) || basename(file, ".md");
    const content = stripFrontmatter(raw);

    const docs = await splitter.createDocuments([content]);
    console.log(`[build-index]   ${file}: ${docs.length} chunks`);

    for (let i = 0; i < docs.length; i++) {
      allChunks.push({
        id: `${basename(file, ".md")}#${i}`,
        source: file,
        title,
        heading: "", // LangChain's basic markdown splitter doesn't capture heading automatically
        text: docs[i].pageContent,
      });
    }
  }

  if (allChunks.length === 0) {
    console.error("[build-index] ERROR: Chunking produced 0 chunks.");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("[build-index] Dry run — skipping embedding and write.");
    return;
  }

  console.log(`[build-index] Embedding ${allChunks.length} chunks with GoogleGenAIEmbeddings...`);
  
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "gemini-embedding-001", // Default Gemini embedding model
  });

  const texts = allChunks.map((c) => c.text);
  const vectors = await embeddings.embedDocuments(texts);

  if (vectors.length !== allChunks.length) {
    console.error(`[build-index] ERROR: Got ${vectors.length} vectors for ${allChunks.length} chunks`);
    process.exit(1);
  }

  const dim = vectors[0].length;
  const modelName = "google-genai/gemini-embedding-001";

  const index: RagIndex = {
    model: modelName,
    dim,
    chunks: allChunks.map((chunk, i) => ({
      ...chunk,
      vector: vectors[i],
    })),
  };

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
    model: modelName,
    dim,
    count: allChunks.length,
    builtAt: new Date().toISOString(),
  };

  await writeFile(indexPath, JSON.stringify(index), "utf-8");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  const indexSizeKB = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1);
  console.log(`[build-index] ✓ Index written to ${indexPath} (${indexSizeKB} KB)`);
  console.log(`[build-index] ✓ Done.`);
}

function extractFrontmatterTitle(raw: string): string | null {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const titleMatch = match[1].match(/^title:\s*(.+)$/m);
  return titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : null;
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

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
    } catch {}
  }
}

loadEnv().then(() => main()).catch((err) => {
  console.error("[build-index] Fatal:", err);
  process.exit(1);
});
