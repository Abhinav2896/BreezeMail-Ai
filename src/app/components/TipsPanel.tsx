"use client";
import React from "react";
import { Lightbulb } from "lucide-react";

export function TipsPanel() {
  return (
    <div className="glass-edge flex-[0.55] min-h-[140px] bg-white/22 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] rounded-[20px] p-4 sm:p-5 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 relative z-10">
        <div className="w-8 h-8 rounded-full bg-mint-100 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-mint-600" />
        </div>
        <h2 className="font-jakarta font-bold text-[16px] text-ink-900 dark:text-white">Tips</h2>
      </div>

      {/* [UI-ID: UI-TIP-001] Tips card text — static, no backend dependency */}
      <div className="flex-1 min-h-0 flex items-start justify-center pt-10 relative z-10">
        <p className="font-inter text-[13px] text-ink-600 dark:text-gray-300 leading-[1.6] text-center max-w-[85%]">
          Be specific about your email's purpose to get better, more accurate
          results from AI. Mention the audience, tone, and a clear call to
          action.
        </p>
      </div>
    </div>
  );
}
