// ---------------------------------------------------------------------------
// lib/rag/splitter.ts — Markdown-aware text chunker
// ---------------------------------------------------------------------------
//
// Splits markdown documents into chunks that respect:
//   - Heading boundaries (H2/H3 start new chunks)
//   - Code-fence boundaries (never splits inside a fenced block)
//   - Configurable chunk size and overlap
//   - Source/heading metadata for citation
// ---------------------------------------------------------------------------

export interface ChunkOptions {
  /** Target chunk size in characters (soft limit) */
  chunkSize?: number;
  /** Number of overlap characters between consecutive chunks */
  overlap?: number;
}

export interface RawChunk {
  /** Text content */
  text: string;
  /** Heading context (e.g. "## Professional Tone") */
  heading: string;
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 80;

/**
 * Split a markdown document into semantically aware chunks.
 *
 * Strategy:
 * 1. Split the document into "sections" at H2/H3 boundaries.
 * 2. Within each section, split into paragraph-level segments.
 * 3. Merge small segments until they approach `chunkSize`.
 * 4. Apply character overlap between consecutive chunks.
 */
export function chunkMarkdown(
  content: string,
  options: ChunkOptions = {},
): RawChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;

  if (!content.trim()) return [];

  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n");

  // Step 1: Split into heading-delimited sections
  const sections = splitByHeadings(normalized);

  // Step 2: Within each section, produce sized chunks
  const chunks: RawChunk[] = [];

  for (const section of sections) {
    const sectionChunks = splitSectionIntoChunks(
      section.body,
      chunkSize,
      overlap,
    );
    for (const text of sectionChunks) {
      const trimmed = text.trim();
      if (trimmed.length > 0) {
        chunks.push({ text: trimmed, heading: section.heading });
      }
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface Section {
  heading: string;
  body: string;
}

/**
 * Split markdown into sections at H2 (`##`) and H3 (`###`) boundaries.
 * Content before the first heading goes into a section with heading = "".
 */
function splitByHeadings(content: string): Section[] {
  const lines = content.split("\n");
  const sections: Section[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    // Match H2 or H3 headings (not H1, which is the document title)
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);

    if (headingMatch) {
      // Save the previous section
      if (currentLines.length > 0 || currentHeading) {
        sections.push({
          heading: currentHeading,
          body: currentLines.join("\n"),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentLines.length > 0 || currentHeading) {
    sections.push({
      heading: currentHeading,
      body: currentLines.join("\n"),
    });
  }

  return sections;
}

/**
 * Split a section body into chunks of approximately `chunkSize` characters.
 * Respects code-fence boundaries and paragraph breaks.
 */
function splitSectionIntoChunks(
  body: string,
  chunkSize: number,
  overlap: number,
): string[] {
  // First, split into "blocks" — paragraphs and code fences
  const blocks = splitIntoBlocks(body);

  // Merge blocks into chunks of ~chunkSize
  const chunks: string[] = [];
  let current = "";

  for (const block of blocks) {
    const combined = current
      ? current + "\n\n" + block
      : block;

    if (combined.length <= chunkSize || !current) {
      // Either fits, or current is empty (we must include at least one block)
      current = combined;
    } else {
      // The current chunk is big enough; start a new one
      chunks.push(current);

      // Apply overlap: take the last `overlap` chars from current
      if (overlap > 0 && current.length > overlap) {
        const overlapText = current.slice(-overlap);
        // Find a clean word boundary in the overlap
        const wordBoundary = overlapText.indexOf(" ");
        const cleanOverlap =
          wordBoundary > 0 ? overlapText.slice(wordBoundary + 1) : overlapText;
        current = cleanOverlap + "\n\n" + block;
      } else {
        current = block;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Split text into "blocks" — contiguous groups of lines separated by
 * blank lines, with code fences kept as single blocks.
 */
function splitIntoBlocks(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    // Detect code fence start/end
    if (line.trim().startsWith("```")) {
      if (inCodeFence) {
        // End of code fence — include the closing line and finalize block
        currentBlock.push(line);
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
        inCodeFence = false;
        continue;
      } else {
        // Start of code fence — finalize any previous block
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join("\n"));
          currentBlock = [];
        }
        currentBlock.push(line);
        inCodeFence = true;
        continue;
      }
    }

    if (inCodeFence) {
      // Inside a code fence — keep accumulating
      currentBlock.push(line);
      continue;
    }

    // Outside code fence: blank line = block separator
    if (line.trim() === "") {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }

  // Finalize any remaining block
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks.filter((b) => b.trim().length > 0);
}
