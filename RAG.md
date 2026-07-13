# BreezeMail AI — RAG Architecture

> **Retrieval-Augmented Generation (RAG)** subsystem for BreezeMail AI. This module grounds the Gemini LLM's email generation in a curated knowledge base of writing best practices.

---

## 1. Overview

To ensure the AI generates high-quality, professional emails that adhere to specific writing guidelines, BreezeMail AI employs a RAG subsystem. 

Instead of relying on a legacy TF-IDF sparse index, the system uses **dense semantic embeddings** powered by **Google's `gemini-embedding-001` model** and the **LangChain** ecosystem.

### Key Benefits
- **Deep Semantic Understanding:** Captures the actual meaning and intent behind user briefs, not just keyword overlaps.
- **Robust Framework:** Built on `@langchain/google-genai` and `@langchain/textsplitters` for industry-standard chunking and embedding.
- **Serverless-Friendly Retrieval:** The heavy embedding API calls are performed at build-time. At runtime, the index is loaded from a static `rag-index.json` file and queried using a fast, in-memory cosine similarity search.

---

## 2. Knowledge Base (`knowledge/`)

The source of truth for the RAG system is a collection of Markdown files located in the `knowledge/` directory.

| Document | Purpose |
|----------|---------|
| `voice-and-tone.md` | Tone definitions (Professional, Casual, Friendly, Apologetic, Assertive). |
| `email-anatomy.md` | Structural rules for subjects, greetings, body paragraphs, and sign-offs. |
| `greetings-and-signoffs.md` | Categorized examples of openings and closings based on tone. |
| `subject-lines.md` | Best practices and anti-patterns for writing effective subject lines. |
| `common-mistakes.md` | What the AI should *avoid* (walls of text, emoji overuse, burying the lede). |
| `language-hints.md` | Guidelines for specific languages (English, Hinglish, Spanish, etc.). |
| `length-rules.md` | Word-count targets for Short, Medium, and Long emails. |

---

## 3. Build-Time Indexing (`scripts/build-index.ts`)

Because Vercel serverless environments are mostly read-only, the knowledge base is processed into a search-optimized JSON index at **build time**.

**Execution:** `npm run prebuild` (automatically runs before `next build`).

1. **Chunking:** Reads all `.md` files in `knowledge/` and splits them using LangChain's `MarkdownTextSplitter`.
2. **Embedding Formulation:** Batches the chunks and calls the Gemini API (`gemini-embedding-001`) via `@langchain/google-genai` to generate 768-dimensional dense vectors for each chunk.
3. **Serialization:** Writes the chunks, their metadata, and their corresponding dense vectors to `public/rag-index.json`.

---

## 4. Runtime Retrieval (`lib/rag/retriever.ts`)

When a user requests an email generation via `POST /api/generate`, the RAG system intercepts the request before it reaches Gemini.

1. **Lazy Load & Cache:** `lib/rag/index-cache.ts` reads `public/rag-index.json`. The Promise is memoized so concurrent requests share the same I/O operation.
2. **Query Formulation:** The system concatenates all user selections into one robust search string. For example: `tone: Professional | language: English | length: Medium | brief: [User's description]`.
3. **Live Embedding:** The combined query is sent to the Gemini API (`gemini-embedding-001`) to generate a dense semantic vector representing the user's exact need.
4. **Cosine Similarity:** A fast, local math function scans the query vector against all 80+ pre-calculated vectors in the index to find the highest-scoring contextual matches.
5. **Filtering & Truncation:** 
   - Chunks below `RAG_MIN_SCORE` are discarded.
   - Results are sorted by similarity descending.
   - The Top-K chunks are selected, up to `RAG_MAX_CONTEXT_CHARS` total length.
6. **Prompt Injection:** The selected chunks are formatted as an XML-style `<writing_guidelines>` block and appended to the LLM prompt.

---

## 5. How the RAG Search Actually Works (Example)

A common misconception is that the RAG index stores context about specific real-world topics (e.g., retrieving facts about "sick leave"). In BreezeMail AI, the index is exclusively a **read-only database of writing guidelines**.

**Example:**
If a user writes the brief `"today my friend is sick i need leave for him"` and selects a `"Professional"` tone:
- The query becomes: `tone: Professional | language: English | length: Medium | brief: today my friend is sick i need leave for him`.
- The semantic embeddings perfectly match the concept of "professionalism" and "structure".
- It retrieves chunks from `voice-and-tone.md` (explaining how to sound professional) and `email-anatomy.md` (how to structure a standard email) by calculating their mathematical vector proximity.
- The LLM uses these structural rules to properly format the specific details ("sick leave") provided by the user.

**Immutability:** The RAG system does **not** learn from user inputs. It does not store user briefs (like "sick leave") back into the database for future use. It strictly retrieves pre-defined templates based on the keywords in the query string.

---

## 7. Configuration (`.env.local`)

The RAG system is highly tunable via environment variables in `.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `RAG_ENABLED` | `true` | Kill-switch to bypass retrieval entirely. |
| `RAG_K` | `3` | Maximum number of chunks to retrieve and inject. |
| `RAG_MIN_SCORE` | `0.50` | Minimum cosine similarity threshold (0.0 to 1.0). Dense embeddings typically cluster higher than 0.5. |
| `RAG_MAX_CONTEXT_CHARS` | `2400` | Hard cap on the total character length of injected context. |

---

## 8. UI Attribution

When the AI generates an email, the backend API response includes a `sources` array detailing which chunks were retrieved. The frontend (`GeneratedEmailPanel.tsx`) renders these as "Grounded by" attribution chips, providing transparency into the AI's decision-making process.