"use client";
import React from "react";
import { FileText, Inbox } from "lucide-react";
import { HistoryItem, formatRelativeTime } from "@/app/types";

interface HistoryPanelProps {
  items: HistoryItem[];
  onViewAll: () => void;
}

export function HistoryPanel({ items, onViewAll }: HistoryPanelProps) {
  const hasItems = items.length > 0;

  return (
    <div className="glass-edge flex-1 min-h-0 bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] rounded-[20px] p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-jakarta font-bold text-[16px] text-ink-900 dark:text-white">History</h2>
        {/* [UI-ID: UI-HIS-002] "View all" link — opens full-screen history (BE-HIST-001) */}
        <button
          onClick={onViewAll}
          className="font-inter font-medium text-[13px] text-mint-600 dark:text-mint-400 hover:text-mint-700 dark:hover:text-mint-300 hover:underline"
        >
          View all
        </button>
      </div>

      {/* [UI-ID: UI-HIS-001] History list (last 5) — displays BE-HIST-001 data */}
      {hasItems ? (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white/15 backdrop-blur-2xl rounded-[16px] p-2 hover:bg-white/40 transition-colors cursor-pointer border border-white/55 shadow-[0_2px_10px_rgba(16,90,65,0.08)]"
            >
              <div className="w-9 h-9 rounded-xl bg-mint-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-mint-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-jakarta font-semibold text-[13px] text-ink-900 dark:text-white truncate">
                  {item.title}
                </span>
                <span className="font-inter text-[12px] text-ink-400 dark:text-gray-400">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-2xl border border-white/55 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-ink-500 dark:text-gray-300" />
          </div>
          <p className="font-jakarta font-semibold text-[13px] text-ink-900 dark:text-white">
            No history yet
          </p>
          <p className="font-inter text-[12px] text-ink-500 dark:text-gray-300 max-w-[200px]">
            Generated emails will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
