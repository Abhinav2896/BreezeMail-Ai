"use client";
import React from "react";
import { Plus, Clock, Send, Moon, Sun } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface NavbarProps {
  onOpenHistory: () => void;
  onNewGeneration: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function Navbar({ onOpenHistory, onNewGeneration, isDark, onToggleDark }: NavbarProps) {
  return (
    <nav className="w-full mt-4 grid grid-cols-1 xl:grid-cols-[1fr_1fr_0.85fr] gap-3 sm:gap-6 items-center">
      {/* Left pill — logo + wordmark, sized to its content and aligned to start of the first grid column */}
      {/* [UI-ID: UI-NAV-001] Logo / wordmark — static, no backend dependency */}
      <div className="glass-edge h-[60px] rounded-2xl bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] px-4 sm:px-5 flex items-center justify-self-start">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5CC794] to-[#1F9462] flex items-center justify-center shadow-[0_2px_10px_rgba(16,90,65,0.08)]">
            <Send className="w-4 h-4 text-white -rotate-12" />
          </div>
          <span className="font-jakarta font-bold text-[17px] text-ink-900 dark:text-white tracking-tight">
            BreezeMail <span className="text-mint-600 dark:text-mint-400">AI</span>
          </span>
        </div>
      </div>

      {/* Right pill — action buttons, fills the third grid column so its outer edges match the History card exactly */}
      <div
        className="glass-edge h-[60px] rounded-2xl bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] px-2 sm:px-3 flex items-center gap-2 xl:col-start-3 xl:col-end-4 min-w-0"
      >
        {/* [UI-ID: UI-NAV-002] "New Generation" button — triggers BE-RESET-001 (frontend-only, no network call) */}
        <Button
          variant="ghost"
          onClick={onNewGeneration}
          className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-gradient-to-br from-[#5CC794] to-[#1F9462] text-white hover:text-white font-jakarta font-semibold text-[13px] shadow-[0_2px_10px_rgba(16,90,65,0.08)] border border-transparent inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">New Generation</span>
          <span className="sm:hidden">New</span>
        </Button>
        {/* [UI-ID: UI-NAV-003] "History" button — triggers BE-HIST-001 (opens history view) */}
        <Button
          variant="ghost"
          onClick={onOpenHistory}
          className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-white/15 backdrop-blur-2xl text-ink-700 dark:text-gray-200 hover:text-ink-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/20 font-jakarta font-medium text-[13px] border border-white/55 shadow-[0_2px_10px_rgba(16,90,65,0.08)] inline-flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4 text-ink-500 dark:text-gray-300 shrink-0" />
          <span className="hidden sm:inline">History</span>
          <span className="sm:hidden">Hist.</span>
        </Button>
        {/* [UI-ID: UI-NAV-004] Dark mode toggle — frontend-only, no backend dependency */}
        <button
          type="button"
          aria-label="Toggle dark mode"
          onClick={onToggleDark}
          className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-white/15 backdrop-blur-2xl border border-white/55 flex items-center justify-center gap-2 text-ink-700 dark:text-gray-200 hover:text-ink-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/20 font-jakarta font-medium text-[13px] shadow-[0_2px_10px_rgba(16,90,65,0.08)]"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-ink-500 dark:text-gray-300 shrink-0" />
          )}
          {isDark ? (
            <>
              <span className="hidden sm:inline">Light</span>
              <span className="sm:hidden">Lt</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Dark</span>
              <span className="sm:hidden">Dk</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
