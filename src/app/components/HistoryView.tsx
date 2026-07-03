"use client";
import React from "react";
import { ArrowLeft, FileText, Inbox } from "lucide-react";
const backgroundImage = "/Background.png";
import { HistoryItem, formatRelativeTime } from "@/app/types";

interface HistoryViewProps {
  items: HistoryItem[];
  onBack: () => void;
}

export function HistoryView({ items, onBack }: HistoryViewProps) {
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />
      <div
        className="absolute inset-0 -z-10 transition-colors duration-300 ease-in-out"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 45%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-black/0 dark:bg-black/40 transition-colors duration-300 ease-in-out"
      />

      <div className="px-4 sm:px-6 pt-4 pb-10 flex flex-col min-h-screen xl:h-screen xl:overflow-hidden">
        <div className="glass-edge h-[64px] w-full rounded-3xl bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] px-4 sm:px-6 flex items-center justify-between mt-4 gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white/15 dark:bg-white/10 backdrop-blur-2xl border border-white/55 dark:border-white/30 text-ink-700 dark:text-gray-200 hover:text-ink-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/20 font-jakarta font-semibold text-[14px] shadow-[0_2px_10px_rgba(16,90,65,0.08)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-jakarta font-bold text-[18px] text-ink-900 dark:text-white">
            History
          </h1>
          <span className="font-inter text-[13px] text-ink-500 dark:text-gray-300">
            {items.length} {items.length === 1 ? "email" : "emails"}
          </span>
        </div>

        <main className="mt-6 flex-1 xl:overflow-hidden">
          <div className="glass-edge max-w-[1100px] mx-auto h-full bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] rounded-[20px] p-4 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-jakarta font-bold text-[16px] text-ink-900 dark:text-white">
                All generated emails
              </h2>
            </div>

            {/* [UI-ID: UI-HISV-001] Full-screen history list — displays all BE-HIST-001 data */}
            {sorted.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-2xl border border-white/55 flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-ink-500 dark:text-gray-300" />
                </div>
                <p className="font-jakarta font-semibold text-[15px] text-ink-900 dark:text-white">
                  No history yet
                </p>
                <p className="font-inter text-[13px] text-ink-500 dark:text-gray-300 max-w-[320px]">
                  Generated emails will appear here. Go back to the dashboard
                  and click "Generate Email" to create your first one.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                {sorted.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white/15 backdrop-blur-2xl rounded-[16px] p-3 hover:bg-white/40 transition-colors cursor-pointer border border-white/55 shadow-[0_2px_10px_rgba(16,90,65,0.08)]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-mint-600" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-jakarta font-semibold text-[14px] text-ink-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      <span className="font-inter text-[12px] text-ink-400 dark:text-gray-400">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
