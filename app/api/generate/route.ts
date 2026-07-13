import { NextRequest, NextResponse } from "next/server";
import { retrieve, buildRagConfig } from "../../../lib/rag/retriever";
import { buildContextBlock, toSourceRef } from "../../../lib/rag/prompt";
import type { RagQuery } from "../../../lib/rag/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * [BACKEND HOOK: BE-GEN-001]
 * WHAT:   The shape returned by the email-generation API.
 * INPUT:  Server parses Gemini's JSON response into this shape.
 * OUTPUT: Populated EmailContent sent to the frontend as { email: EmailContent }.
 * See BACKEND.md §3.1 for the full contract.
 *
 * Duplicated here (rather than imported from src/app/types.ts) because this is
 * a server-only Route Handler and must not depend on client module resolution.
 */
interface EmailContent {
  subject: string;
  greeting: string;
  paragraphs: string[];
  bullets: string[];
  signOff: string;
  /** RAG source references — present when RAG retrieval found relevant chunks */
  sources?: { id: string; title: string }[];
}

interface GenerateRequest {
  description: string;
  tone: string;
  language: string;
  length: string;
  recipientName?: string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(req: GenerateRequest): string {
  const lengthGuidance: Record<string, string> = {
    Short: "Keep the email concise — 2-3 short paragraphs, no more than 80 words total.",
    Medium: "Write a moderate-length email — 3-4 paragraphs, around 120-180 words.",
    Long: "Write a detailed, thorough email — 4-6 paragraphs with bullet points where appropriate, around 250-350 words.",
  };

  const recipientLine = req.recipientName
    ? `The recipient's name is "${req.recipientName}". Address them by name in the greeting.`
    : "Use a generic greeting appropriate for the tone (no specific recipient name was provided).";

  return `You are an expert email writer. Generate a professional email based on the following brief.

**Brief:** ${req.description}

**Tone:** ${req.tone}
**Language:** ${req.language}
**Length:** ${lengthGuidance[req.length] ?? lengthGuidance["Medium"]}

${recipientLine}

Respond with ONLY a raw JSON object (no markdown fences, no commentary, no extra text) matching this exact shape:

{
  "subject": "string — a concise email subject line",
  "greeting": "string — the opening greeting (e.g. 'Dear John,' or 'Hi there,')",
  "paragraphs": ["string array — each element is one paragraph of the email body"],
  "bullets": ["string array — optional bullet points; use an empty array [] if none are needed"],
  "signOff": "string — the closing sign-off (e.g. 'Best regards,\\nYour Name')"
}

IMPORTANT:
- Output ONLY the JSON object. No markdown code fences. No explanation.
- Every field must be present. Use empty arrays [] for bullets if not needed.
- Write the email in ${req.language}.
- Match the "${req.tone}" tone precisely.`;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function stripCodeFences(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers that models sometimes add
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    // Remove opening fence (with optional language tag)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
    // Remove closing fence
    cleaned = cleaned.replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

function validateEmailContent(obj: unknown): EmailContent {
  if (
    typeof obj !== "object" ||
    obj === null ||
    Array.isArray(obj)
  ) {
    throw new Error("Response is not a JSON object");
  }

  const record = obj as Record<string, unknown>;

  if (typeof record.subject !== "string") {
    throw new Error("Missing or invalid 'subject' field");
  }
  if (typeof record.greeting !== "string") {
    throw new Error("Missing or invalid 'greeting' field");
  }
  if (!Array.isArray(record.paragraphs) || !record.paragraphs.every((p): p is string => typeof p === "string")) {
    throw new Error("Missing or invalid 'paragraphs' field");
  }
  if (!Array.isArray(record.bullets) || !record.bullets.every((b): b is string => typeof b === "string")) {
    throw new Error("Missing or invalid 'bullets' field");
  }
  if (typeof record.signOff !== "string") {
    throw new Error("Missing or invalid 'signOff' field");
  }

  return {
    subject: record.subject,
    greeting: record.greeting,
    paragraphs: record.paragraphs,
    bullets: record.bullets,
    signOff: record.signOff,
  };
}

// ---------------------------------------------------------------------------
// RAG helpers
// ---------------------------------------------------------------------------

/**
 * Check if RAG is enabled via the RAG_ENABLED environment variable.
 * Defaults to true — set RAG_ENABLED=false to disable.
 */
function isRagEnabled(): boolean {
  const val = process.env.RAG_ENABLED;
  if (val === undefined || val === "") return true;
  return val.toLowerCase() !== "false";
}

// ---------------------------------------------------------------------------
// Route Handler — POST /api/generate
// ---------------------------------------------------------------------------

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const TIMEOUT_MS = 120_000;

export async function POST(request: NextRequest) {
  // 1. Parse and validate request body (check user input before server config)
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  if (!body.description || typeof body.description !== "string" || body.description.trim().length === 0) {
    return NextResponse.json(
      { error: "The 'description' field is required and must be a non-empty string." },
      { status: 400 },
    );
  }

  // 2. Validate API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: GEMINI_API_KEY is not set." },
      { status: 500 },
    );
  }

  // 3. RAG retrieval (graceful: failures degrade to no-context)
  const ragStartTime = Date.now();
  let ragHits: Awaited<ReturnType<typeof retrieve>> = [];

  const normalizedReq = {
    description: body.description.trim(),
    tone: body.tone || "Professional",
    language: body.language || "English",
    length: body.length || "Medium",
    recipientName: body.recipientName,
  };

  if (isRagEnabled()) {
    try {
      const ragQuery: RagQuery = {
        description: normalizedReq.description,
        tone: normalizedReq.tone,
        language: normalizedReq.language,
        length: normalizedReq.length,
      };
      ragHits = await retrieve(ragQuery, buildRagConfig());
    } catch (err) {
      console.warn(
        "[rag] Retrieval failed, proceeding without context:",
        err instanceof Error ? err.message : err,
      );
      ragHits = [];
    }
  }

  const ragLatencyMs = Date.now() - ragStartTime;

  // 4. Build the prompt (with or without RAG context)
  const basePrompt = buildPrompt(normalizedReq);
  const contextBlock = buildContextBlock(ragHits);
  const prompt = basePrompt + contextBlock;

  // 5. Call Gemini with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: "The AI model took too long to respond. Please try again." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Failed to reach the AI model. Please try again later." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // 6. Handle non-OK Gemini responses
  if (!geminiResponse.ok) {
    const statusText = geminiResponse.statusText || "Unknown error";
    return NextResponse.json(
      { error: `AI model returned an error: ${geminiResponse.status} ${statusText}` },
      { status: 502 },
    );
  }

  // 7. Parse Gemini response
  let geminiBody: unknown;
  try {
    geminiBody = await geminiResponse.json();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI model response." },
      { status: 502 },
    );
  }

  // Extract the text content from Gemini's response structure
  const candidates = (geminiBody as Record<string, unknown>)?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json(
      { error: "AI model returned an empty response. Please try again." },
      { status: 502 },
    );
  }

  const firstCandidate = candidates[0] as Record<string, unknown>;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = content?.parts as Array<Record<string, unknown>> | undefined;
  const rawText = parts?.[0]?.text;

  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return NextResponse.json(
      { error: "AI model returned an empty text response. Please try again." },
      { status: 502 },
    );
  }

  // 8. Parse and validate the JSON email content
  const cleaned = stripCodeFences(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "AI model response was not valid JSON. Please try again." },
      { status: 502 },
    );
  }

  let email: EmailContent;
  try {
    email = validateEmailContent(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown validation error";
    return NextResponse.json(
      { error: `AI model response failed validation: ${message}. Please try again.` },
      { status: 502 },
    );
  }

  // 9. Attach RAG source references to the email
  const sources = ragHits.map(toSourceRef);
  if (sources.length > 0) {
    email.sources = sources;
  }

  // 10. Build response with RAG stats header
  const responseBody = { email };
  const response = NextResponse.json(responseBody);

  // Add RAG observability header
  response.headers.set(
    "X-RAG-Stats",
    `enabled=${isRagEnabled()} k=${buildRagConfig().k} hits=${ragHits.length} latency_ms=${ragLatencyMs}`,
  );

  return response;
}
