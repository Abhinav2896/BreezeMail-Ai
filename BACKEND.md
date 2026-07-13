# BreezeMail AI — Back-End Architecture

> A Next.js App Router implementation that serves the BreezeMail AI dashboard and proxies requests to the Gemini API for email generation.

---

## 1. Product Overview & Architecture

The **BreezeMail AI** backend is currently a lightweight API layer built natively into the Next.js framework using App Router API routes. It acts as a secure proxy between the client-side dashboard and the Google Gemini LLM API, ensuring that API keys are never exposed to the browser.

### Core backend responsibilities
1. **Secure proxying** — holding the `GEMINI_API_KEY` on the server and communicating with Google.
2. **RAG Retrieval** — generating semantic query embeddings via LangChain/Gemini and retrieving context chunks from the `rag-index.json` knowledge base to ground the generation using local cosine similarity.
3. **Prompt engineering** — translating the user's UI selections and retrieved RAG context into a structured prompt.
4. **Validation & parsing** — ensuring the user input is valid, and defensively parsing/cleaning the LLM's raw output into a strict JSON contract for the frontend.

---

## 2. Tech Stack

| Layer            | Technology                                    | Version  |
|------------------|-----------------------------------------------|----------|
| Framework        | **Next.js (App Router)**                      | 16.2.10 (Turbopack) |
| Language         | **TypeScript**                                | ESM      |
| Core AI API      | **Google Gemini API** (`gemini-flash-latest`)| v1beta   |
| Runtime          | **Node.js**                                   | Standard |

---

## 3. API Contracts

### 3.1 `POST /api/generate` (BE-GEN-001)

This is the primary endpoint that generates an email draft.

**Request Body** (`application/json`)
```json
{
  "description": "string (required, non-empty) - The user's brief",
  "tone": "string (optional) - e.g., 'Professional', 'Casual', 'Friendly'",
  "language": "string (optional) - e.g., 'English', 'Hinglish'",
  "length": "string (optional) - e.g., 'Short', 'Medium', 'Long'",
  "recipientName": "string (optional) - Specific person to address"
}
```

**Response Body** (`application/json`)
```json
{
  "email": {
    "subject": "string — a concise email subject line",
    "greeting": "string — the opening greeting",
    "paragraphs": ["string array — each element is one paragraph"],
    "bullets": ["string array — optional bullet points, [] if none"],
    "signOff": "string — the closing sign-off",
    "sources": [
      {
        "id": "string — unique identifier for the RAG source",
        "title": "string — human-readable title of the source"
      }
    ]
  }
}
```

**Error Matrix**

| Status | Condition | Example Error Message |
|--------|-----------|-----------------------|
| `400`  | Missing or empty `description` | "The 'description' field is required and must be a non-empty string." |
| `400`  | Invalid JSON body | "Invalid JSON in request body." |
| `500`  | `GEMINI_API_KEY` is missing | "Server misconfiguration: GEMINI_API_KEY is not set." |
| `502`  | Gemini returned a non-200 | "AI model returned an error: 429 Too Many Requests" |
| `502`  | Gemini returned malformed JSON | "AI model response was not valid JSON. Please try again." |
| `502`  | Response failed structural validation | "AI model response failed validation: Missing or invalid 'subject' field. Please try again." |
| `504`  | Gemini API took > 2 minutes | "The AI model took too long to respond. Please try again." |

### 3.2 History Persistence (BE-HIST-001) — *Future Wiring Point*

Currently, generation history is stored in local component state (`useState` in `App.tsx`) and is wiped when the page is refreshed. 

**Future implementation requires:**
- A database (e.g., PostgreSQL, Firebase, Supabase).
- A `GET /api/history` endpoint to fetch the user's past generations.
- A `POST /api/history` or side-effect in `/api/generate` to save new generations.
- The data shape must match `HistoryItem` from `src/app/types.ts`.

---

## 4. Environment Variables

BreezeMail AI separates secrets from application configuration.

**Secrets (`.env` — gitignored)**
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | **Yes** | API key for Google Gemini. Acquired from Google AI Studio. Used exclusively server-side. |

**Configuration (`.env.local` — committed or gitignored depending on team preference)**
| Variable | Default | Description |
|----------|---------|-------------|
| `RAG_ENABLED` | `true` | Set to "false" to bypass the RAG retrieval system. |
| `RAG_K` | `3` | Number of top-K chunks to retrieve from the knowledge base. |
| `RAG_MIN_SCORE` | `0.50` | Minimum cosine similarity threshold (0-1). Dense embeddings typically require higher minimums than TF-IDF. |
| `RAG_MAX_CONTEXT_CHARS` | `2400`| Maximum total character count for all injected context snippets. |

---

## 5. Security Notes

- **Never expose `GEMINI_API_KEY` to the client.** The Next.js API route guarantees it remains on the server. Do not prefix this variable with `NEXT_PUBLIC_`.
- **Input Validation:** The `description` field is validated to ensure it is a non-empty string before any external API calls are made.
- **Defensive Parsing:** LLMs are non-deterministic and occasionally wrap JSON in markdown code blocks (e.g., ` ```json `). The parser explicitly strips these fences before attempting `JSON.parse`.
- **Structural Validation:** The parsed JSON is strictly typed and validated against the `EmailContent` interface at runtime. If the model hallucinates keys or returns a string instead of an array, the server catches it and returns a clean 502 error instead of crashing the frontend.

---

## 6. UI ↔ Backend Linkage

To make the codebase easily greppable, UI and backend hooks share a common taxonomy.

| UI ID | Location | Action / Data Source |
|-------|----------|----------------------|
| `UI-NAV-001` | `Navbar.tsx` | Logo / wordmark (Static) |
| `UI-NAV-002` | `Navbar.tsx` | "New Generation" button → Triggers `BE-RESET-001` (Frontend reset) |
| `UI-NAV-003` | `Navbar.tsx` | "History" button → Triggers `BE-HIST-001` overlay |
| `UI-NAV-004` | `Navbar.tsx` | Dark mode toggle (Frontend only) |
| `UI-EIP-001` | `EmailInputPanel.tsx` | Description textarea → Input for `BE-GEN-001` |
| `UI-EIP-002` | `EmailInputPanel.tsx` | Tone select → Input for `BE-GEN-001` |
| `UI-EIP-003` | `EmailInputPanel.tsx` | Language select → Input for `BE-GEN-001` |
| `UI-EIP-004` | `EmailInputPanel.tsx` | Length select → Input for `BE-GEN-001` |
| `UI-EIP-005` | `EmailInputPanel.tsx` | Suggestion chips (Frontend only) |
| `UI-EIP-006` | `EmailInputPanel.tsx` | Generate Email button → Triggers `BE-GEN-001` |
| `UI-GEP-001` | `GeneratedEmailPanel.tsx` | Generated email display → Output of `BE-GEN-001` |
| `UI-GEP-002` | `GeneratedEmailPanel.tsx` | Empty state (Frontend only) |
| `UI-GEP-003` | `GeneratedEmailPanel.tsx` | "Regenerate" button → Re-triggers `BE-GEN-001` |
| `UI-GEP-004` | `GeneratedEmailPanel.tsx` | "Copy" button (Frontend only) |
| `UI-HIS-001` | `HistoryPanel.tsx` | History list (last 5) → Displays `BE-HIST-001` |
| `UI-HIS-002` | `HistoryPanel.tsx` | "View all" link → Opens `BE-HIST-001` full view |
| `UI-HISV-001`| `HistoryView.tsx` | Full-screen history list → Displays `BE-HIST-001` |
| `UI-TIP-001` | `TipsPanel.tsx` | Tips card text (Static) |

---

## 7. Constraints & Lessons Learned

- **API Key Configuration:** The server will gracefully fail with a 500 status if `GEMINI_API_KEY` is missing. This takes priority and should happen after basic request parsing but *before* building prompts. 
- **LLM JSON Formatting:** Gemini sometimes ignores the instruction to omit markdown fences. A custom `stripCodeFences()` function is essential to ensure `JSON.parse` doesn't throw.
- **Timeouts:** The Gemini API can occasionally hang. The Next.js API route implements an `AbortController` with a 2-minute timeout (`TIMEOUT_MS = 120_000`) to prevent the frontend loading state from spinning indefinitely.
- **Client-Side Cancellation:** When a user quickly changes the brief and clicks "Generate" again, the frontend aborts the previous in-flight `fetch` request using a ref-stored `AbortController`. The UI silently drops `AbortError` exceptions to avoid flashing errors to the user.

---

## 8. Local Dev Instructions

1. Ensure dependencies are installed (`npm install`).
2. Add your Gemini API key to `.env.local`:
   ```bash
   GEMINI_API_KEY=AIzaSy...
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the app at `http://localhost:3000`.
