"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { Navbar } from "./components/Navbar";
import { EmailInputPanel } from "./components/EmailInputPanel";
import { GeneratedEmailPanel } from "./components/GeneratedEmailPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { TipsPanel } from "./components/TipsPanel";
import { HistoryView } from "./components/HistoryView";
import { EmailContent, HistoryItem, ViewName } from "./types";

const DEFAULT_TONE = "Professional";
const DEFAULT_LANGUAGE = "English";
const DEFAULT_LENGTH = "Medium";

export default function App() {
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  // [BACKEND REQUIRED: BE-HIST-001] Frontend-only useState today. Needs a database
  // (see BACKEND.md §3.2, explicitly out of scope for this pass) to persist across
  // sessions/users.
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentEmail, setCurrentEmail] = useState<EmailContent | null>(null);
  const [view, setView] = useState<ViewName>("dashboard");
  const [isDark, setIsDark] = useState(false);

  // [BACKEND HOOK: BE-GEN-001] Loading and error states for API calls
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the AbortController so we can cancel in-flight requests on unmount
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  // Cleanup: abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleToggleDark = useCallback(() => setIsDark((v) => !v), []);

  /**
   * [BACKEND HOOK: BE-GEN-001]
   * WHAT:    Generates an email from the user's description + options.
   * INPUT:   { description, tone, language, length }
   * PROCESS: Calls POST /api/generate which proxies to Gemini server-side.
   * OUTPUT:  EmailContent → sets currentEmail + prepends to history.
   * See BACKEND.md §3.1 for the full contract.
   */
  const handleGenerate = useCallback(async () => {
    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          tone,
          language,
          length,
        }),
        signal: controller.signal,
      });

      const data: { email?: EmailContent; error?: string } = await response.json();

      if (!response.ok || !data.email) {
        setError(data.error || `Request failed with status ${response.status}`);
        return;
      }

      const email = data.email;
      setCurrentEmail(email);

      const now = Date.now();
      const item: HistoryItem = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        title: email.subject || "Untitled email",
        time: "Just now",
        timestamp: now,
        email,
      };
      setHistory((prev) => [item, ...prev]);
    } catch (err: unknown) {
      // Don't show error for intentional aborts (user triggered a new generation)
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error — please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [description, tone, language, length]);

  const handleReset = useCallback(() => {
    // Abort any in-flight generation
    abortRef.current?.abort();
    setDescription("");
    setTone(DEFAULT_TONE);
    setLanguage(DEFAULT_LANGUAGE);
    setLength(DEFAULT_LENGTH);
    setCurrentEmail(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return (
    <div className="relative min-h-screen selection:bg-mint-200 overflow-x-hidden">
      <BackgroundLayer />
      <div className="px-4 sm:px-6 pt-4 pb-10 flex flex-col min-h-screen xl:h-screen xl:overflow-hidden">
        <Navbar onOpenHistory={() => setView("history")} onNewGeneration={handleReset} isDark={isDark} onToggleDark={handleToggleDark} />
        <main className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_1fr_0.85fr] gap-4 sm:gap-6 w-full flex-1 min-h-0 xl:overflow-hidden items-stretch">
          <div className="h-full min-h-0 flex flex-col">
            <EmailInputPanel
              description={description}
              onDescriptionChange={setDescription}
              tone={tone}
              onToneChange={setTone}
              language={language}
              onLanguageChange={setLanguage}
              length={length}
              onLengthChange={setLength}
              onGenerate={handleGenerate}
              isLoading={isLoading}
            />
          </div>
          <div className="h-full min-h-0 flex flex-col">
            <GeneratedEmailPanel
              email={currentEmail}
              isLoading={isLoading}
              error={error}
              onRegenerate={handleGenerate}
            />
          </div>
          <div className="flex flex-col gap-6 h-full min-h-0">
            <HistoryPanel items={history.slice(0, 5)} onViewAll={() => setView("history")} />
            <TipsPanel />
          </div>
        </main>
      </div>

      {view === "history" && (
        <HistoryView items={history} onBack={() => setView("dashboard")} />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.8);
        }
      `}} />
    </div>
  );
}
