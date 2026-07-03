"use client";
import React, { useEffect, useRef, useState } from "react";
import { Mail, RefreshCcw, Copy, Check, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { EmailContent, emailToPlainText } from "@/app/types";

interface GeneratedEmailPanelProps {
  email: EmailContent | null;
  isLoading?: boolean;
  error?: string | null;
  onRegenerate?: () => void;
}

export function GeneratedEmailPanel({ email, isLoading, error, onRegenerate }: GeneratedEmailPanelProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!email) return;
    const text = emailToPlainText(email);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      // Fallback already attempted above; ignore final failure
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="glass-edge bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] rounded-[20px] p-4 sm:p-6 flex flex-col h-full min-h-0 relative overflow-hidden">
      {/* Subtle decorative leaf in corner */}
      <svg className="absolute bottom-16 right-4 w-32 h-32 opacity-20 pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 C30 10 10 30 10 50 C10 70 30 90 50 90 C70 90 90 70 90 50 C90 30 70 10 50 10 Z" fill="url(#leafGrad)" />
        <path d="M70 20 L75 30 L85 35 L75 40 L70 50 L65 40 L55 35 L65 30 Z" fill="#34AD77" />
        <path d="M20 70 L25 75 L35 78 L25 81 L20 86 L15 81 L5 78 L15 75 Z" fill="#8FDCB6" />
        <defs>
          <linearGradient id="leafGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8FDCB6" stopOpacity="0.5" />
            <stop offset="1" stopColor="#34AD77" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-jakarta font-bold text-[16px] text-ink-900 dark:text-white">Generated Email</h2>
      </div>

      {/* Loading state — shown while BE-GEN-001 is in flight */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-2xl border border-white/55 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-mint-600 dark:text-mint-400 animate-spin" />
          </div>
          <div className="flex flex-col gap-1 max-w-[280px]">
            <p className="font-jakarta font-semibold text-[15px] text-ink-900 dark:text-white">
              Generating your email…
            </p>
            <p className="font-inter text-[13px] text-ink-500 dark:text-gray-300 leading-[1.6]">
              Our AI is crafting the perfect email for you. This usually takes a few seconds.
            </p>
          </div>
        </div>
      ) : error ? (
        /* Error state — shown when BE-GEN-001 returns an error */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
          </div>
          <div className="flex flex-col gap-1 max-w-[320px]">
            <p className="font-jakarta font-semibold text-[15px] text-ink-900 dark:text-white">
              Generation failed
            </p>
            <p className="font-inter text-[13px] text-red-600 dark:text-red-400 leading-[1.6]">
              {error}
            </p>
          </div>
        </div>
      ) : email ? (
        <>
          {/* [UI-ID: UI-GEP-001] Generated email display — output of BE-GEN-001 */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-8 flex flex-col relative z-10 custom-scrollbar">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <Badge variant="secondary" className="bg-mint-100 dark:bg-mint-900/40 text-mint-800 dark:text-mint-200 font-jakarta font-semibold text-[12px] px-2.5 py-0.5 rounded-full">
                Subject:
              </Badge>
              <span className="font-inter font-medium text-[15px] text-ink-900 dark:text-white">{email.subject}</span>
            </div>

            <div className="font-inter text-[15px] leading-[1.7] text-ink-500 dark:text-gray-300 flex flex-col gap-4 shrink-0">
              <p className="font-semibold text-ink-900 dark:text-white">{email.greeting}</p>
              {email.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {email.bullets.length > 0 && (
                <ul className="pl-6 space-y-2">
                  {email.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="relative before:absolute before:left-[-16px] before:top-[10px] before:w-[6px] before:h-[6px] before:bg-mint-500 before:rounded-full"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
              <p className="whitespace-pre-line">{email.signOff}</p>
            </div>
          </div>
        </>
      ) : (
        /* [UI-ID: UI-GEP-002] Empty state — frontend-only, shown before any generation */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-2xl border border-white/55 flex items-center justify-center">
            <Mail className="w-7 h-7 text-mint-600 dark:text-mint-400" />
          </div>
          <div className="flex flex-col gap-1 max-w-[280px]">
            <p className="font-jakarta font-semibold text-[15px] text-ink-900 dark:text-white">
              No email generated yet
            </p>
            <p className="font-inter text-[13px] text-ink-500 dark:text-gray-300 leading-[1.6]">
              Describe your email and click Generate to see it here.
            </p>
          </div>
        </div>
      )}

      <div className="pt-6 mt-auto border-t border-white/55 flex gap-2.5 relative z-10">
        {/* [UI-ID: UI-GEP-003] "Regenerate" button — re-triggers BE-GEN-001 */}
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="h-[44px] px-5 rounded-2xl bg-gradient-to-br from-[#5CC794] to-[#1F9462] flex items-center justify-center gap-2 text-white font-jakarta font-bold text-[14px] shadow-[0_8px_32px_rgba(16,90,65,0.14)] hover:opacity-90 transition-opacity border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Regenerate
          <Sparkles className="w-4 h-4" />
        </button>
        {/* [UI-ID: UI-GEP-004] "Copy" button — frontend-only, uses emailToPlainText */}
        <button
          onClick={handleCopy}
          disabled={!email || isLoading}
          className="h-[44px] px-5 rounded-2xl bg-white/15 backdrop-blur-2xl border border-white/55 flex items-center justify-center gap-2 text-ink-700 dark:text-gray-200 font-jakarta font-bold text-[14px] shadow-[0_2px_10px_rgba(16,90,65,0.08)] hover:bg-white/40 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-mint-600 dark:text-mint-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-ink-500 dark:text-gray-300" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
