# BreezeMail AI — Project Architecture

> A complete glassmorphic, AI-assisted email generator dashboard built on Next.js App Router and powered by the Google Gemini API.

---

## 1. System Overview

**BreezeMail AI** is a full-stack web application designed for crafting professional and personalized emails using artificial intelligence. 

The application architecture follows a modern **Serverless API + Client SPA** pattern, fully encapsulated within the Next.js App Router framework.
- **Client (Frontend)**: A React-based Single Page Application (SPA) providing a highly interactive, glassmorphic UI.
- **Server (Backend)**: A Next.js API Route serving as a secure proxy to communicate with the Gemini LLM, ensuring API keys are kept secure and responses are validated.
- **RAG Subsystem (Local + API)**: A LangChain-powered retrieval system utilizing `gemini-embedding-001` that grounds LLM generations in a curated knowledge base of writing best practices. (See [RAG.md](file:///c:/Users/Abhinav/Desktop/Projects/BreezeMail%20Ai/RAG.md))
- **External AI Service**: Google Gemini API (`gemini-flash-latest`), responsible for natural language generation.

---

## 2. Tech Stack

| Layer            | Technology                                    | Version  |
|------------------|-----------------------------------------------|----------|
| Framework        | **Next.js (App Router)**                      | 16.2.10 (Turbopack) |
| UI Library       | **React**                                     | 18.3.1   |
| Language         | **TypeScript**                                | ESM      |
| Styling          | **Tailwind CSS** (v4, via `@tailwindcss/postcss`)| 4.1.12   |
| Primitives       | **Radix UI** (headless) + **lucide-react**    | 1.x / 0.487 |
| Core AI API      | **Google Gemini API** (`gemini-flash-latest`)| v1beta   |
| Package Manager  | **npm**                                       | —        |

---

## 3. Component Architecture

The frontend is a modular hierarchy of React components with strictly separated concerns. State is maintained at the top of the tree and passed down as props to ensure unidirectional data flow.

```
<App> (Client Component - Top-level state manager)
 ├─ <BackgroundLayer />                              (Fixed background image & gradients)
 ├─ Wrapper (flex min-h-screen xl:h-screen)
 │   ├─ <Navbar />                                   (Theme toggle, new generation)
 │   └─ <main>                                       (3-col grid layout on desktop)
 │       ├─ <EmailInputPanel />                      (Form: tone/lang/length & submit)
 │       ├─ <GeneratedEmailPanel />                  (Displays AI output, loading, error states)
 │       └─ <div>
 │           ├─ <HistoryPanel />                     (Shows last 5 generations)
 │           └─ <TipsPanel />                        (Static helpful tips)
 ├─ <HistoryView />                                  (Full-screen overlay for all history)
 └─ <style>                                          (Global custom scrollbar rules)
```

---

## 4. Data Flow (The Generation Cycle)

1. **User Input:** The user fills out the `description`, selects `tone`, `language`, and `length` in the `<EmailInputPanel />`.
2. **Action Trigger:** The user clicks "Generate Email". The `handleGenerate` function in `App.tsx` is called.
3. **State Update:** `App.tsx` sets `isLoading = true`, clearing any previous errors or email data.
4. **API Request (Client → Server):** A `fetch` request is made to `POST /api/generate` with the form payload.
5. **RAG Retrieval (Server):** The Next.js API route beds the query via the Gemini API (`gemini-embedding-001`), searches the pre-built `rag-index.json` using local cosine similarity, and retrieves the top matching knowledge base chunks.
6. **Prompt Engineering (Server):** The server constructs a strict prompt for the Gemini API, requesting a structured JSON response, and injects the retrieved RAG chunks as writing guidelines.
7. **LLM Inference (Server → Gemini):** The server securely calls the Gemini API using the `GEMINI_API_KEY`.
8. **Response Parsing (Server):** The server strips any markdown code blocks from the Gemini response, strictly parses it as JSON, validates it against the `EmailContent` interface, attaches RAG source citations, and sends it back to the client.
9. **UI Rendering (Client):** `App.tsx` receives the parsed JSON, updates the `currentEmail` state, adds it to the `history` state, and sets `isLoading = false`. The `<GeneratedEmailPanel />` and `<HistoryPanel />` instantly re-render to display the new data.

---

## 5. Security & State Management

- **Client State:** 100% local React state (`useState`, `useRef`, `useEffect`). No global state managers (Redux, Zustand) are required due to the shallow component tree.
- **Server Security:** The `GEMINI_API_KEY` is completely isolated in the Node.js server environment. The client only ever communicates with `/api/generate` and never directly with Google's servers.
- **Defensive Parsing:** LLM outputs are unpredictable. The backend implements rigorous cleanup (stripping code fences) and runtime structural validation to ensure the frontend never crashes due to a hallucinated JSON structure.

---

## 6. Directory Structure

```
BreezeMail Ai/
├── app/
│   ├── api/generate/route.ts     # Backend: Gemini API proxy, Prompt Builder, RAG integration
│   ├── layout.tsx                # Next.js App Router root HTML/CSS
│   └── page.tsx                  # Client entry point rendering <App />
├── knowledge/                    # RAG Knowledge Base (Markdown files for writing guidelines)
├── lib/rag/                      # RAG implementation (embedder, retriever, splitter)
├── public/
│   ├── Background.png            # Static assets
│   └── rag-index.json            # Build-time generated dense embeddings index for RAG
├── scripts/
│   └── build-index.ts            # Build script to generate rag-index.json
├── src/
│   ├── app/
│   │   ├── App.tsx               # Frontend: Main dashboard application logic
│   │   ├── types.ts              # Global TypeScript interfaces
│   │   └── components/           # UI Components (Navbar, Panels, etc.)
│   │       └── ui/               # Radix/shadcn primitive wrappers
│   └── styles/
│       ├── index.css             # Main CSS entry (Tailwind + Theme)
│       └── theme.css             # CSS variables & design tokens
├── .env                          # Secrets (GEMINI_API_KEY)
└── .env.local                    # App Config (RAG configuration)
```
