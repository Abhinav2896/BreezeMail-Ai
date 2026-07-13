/**
 * [BACKEND HOOK: BE-GEN-001]
 * WHAT:   The shape returned by the email-generation API.
 * INPUT:  Server parses Gemini's JSON response into this shape.
 * OUTPUT: Populated EmailContent sent to the frontend as { email: EmailContent }.
 * See BACKEND.md §3.1 for the full contract.
 */
export interface EmailContent {
  subject: string;
  greeting: string;
  paragraphs: string[];
  bullets: string[];
  signOff: string;
  /** RAG source references — present when RAG retrieval found relevant chunks */
  sources?: { id: string; title: string }[];
}

/**
 * [BACKEND REQUIRED: BE-HIST-001]
 * Frontend-only useState today. Needs a database (see BACKEND.md §3.2,
 * explicitly out of scope for this pass) to persist across sessions/users.
 * Shape is stable — a real implementation would store/retrieve these same fields.
 */
export interface HistoryItem {
  id: string;
  title: string;
  time: string;
  timestamp: number;
  email: EmailContent;
}

export type ViewName = "dashboard" | "history";

// [BACKEND REQUIRED: BE-HIST-001] Used to display relative timestamps in history lists.
// When history is persisted, this still runs client-side against stored `timestamp` values.
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek === 1) return "1 week ago";
  return `${diffWeek} weeks ago`;
}

// [UI-ID: UI-GEP-004] Used by the Copy button — flattens EmailContent to plain text.
// Pure frontend utility, no backend dependency.
export function emailToPlainText(email: EmailContent): string {
  const lines: string[] = [];
  if (email.subject) lines.push(`Subject: ${email.subject}`);
  if (email.greeting) lines.push("", email.greeting);
  for (const p of email.paragraphs) lines.push("", p);
  if (email.bullets.length > 0) {
    lines.push("");
    for (const b of email.bullets) lines.push(`• ${b}`);
  }
  if (email.signOff) lines.push("", email.signOff);
  return lines.join("\n");
}
