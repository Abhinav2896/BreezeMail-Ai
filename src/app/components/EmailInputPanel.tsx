"use client";
import React from "react";
import { Sparkles, MessageSquareText, Globe2, Ruler, Loader2 } from "lucide-react";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

const CHIPS = [
  "Welcome Email",
  "Event Invitation",
  "Partnership Proposal",
  "Thank You Email",
  "Feedback Request",
  "Follow Up Email",
];

interface EmailInputPanelProps {
  description: string;
  onDescriptionChange: (v: string) => void;
  tone: string;
  onToneChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  length: string;
  onLengthChange: (v: string) => void;
  onGenerate: () => void;
  isLoading?: boolean;
}

export function EmailInputPanel({
  description,
  onDescriptionChange,
  tone,
  onToneChange,
  language,
  onLanguageChange,
  length,
  onLengthChange,
  onGenerate,
  isLoading,
}: EmailInputPanelProps) {
  return (
    <div className="glass-edge bg-white/15 backdrop-blur-2xl shadow-[0_8px_32px_rgba(16,90,65,0.10)] rounded-[20px] p-4 sm:p-6 flex flex-col gap-4 h-full min-h-0">
      <div>
        <h2 className="font-jakarta font-bold text-[16px] text-ink-900 dark:text-white">Email Input</h2>
        <p className="font-inter text-[13px] text-ink-400 dark:text-gray-300 mt-1">Craft the perfect email with AI assistance.</p>
      </div>

      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center justify-between">
          <label className="font-jakarta font-medium text-[12px] text-ink-700 dark:text-gray-200">Describe your email</label>
          <span className="font-inter text-[12px] text-ink-400 dark:text-gray-400">{description.length}/1000</span>
        </div>
        {/* [UI-ID: UI-EIP-001] Description textarea — input for BE-GEN-001 */}
        <Textarea
          placeholder="Describe your email in detail..."
          className="h-[140px] resize-none bg-white/15 backdrop-blur-2xl border border-white/55 rounded-xl font-inter text-[14px] text-ink-900 dark:text-white placeholder:text-ink-400 dark:placeholder:text-gray-400 focus-visible:ring-mint-500 shadow-[0_2px_10px_rgba(16,90,65,0.08)]"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        <div className="flex flex-col gap-[6px] min-w-0">
          <label className="flex items-center gap-1.5 font-jakarta font-medium text-[12px] text-ink-700 dark:text-gray-200">
            <MessageSquareText className="w-3.5 h-3.5" /> Tone
          </label>
          {/* [UI-ID: UI-EIP-002] Tone select — input for BE-GEN-001 */}
          <Select value={tone} onValueChange={onToneChange}>
            <SelectTrigger className="bg-white/15 backdrop-blur-2xl border border-white/55 rounded-xl font-inter text-[14px] text-ink-900 dark:text-white shadow-[0_2px_10px_rgba(16,90,65,0.08)] w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Casual">Casual</SelectItem>
              <SelectItem value="Friendly">Friendly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-[6px] min-w-0">
          <label className="flex items-center gap-1.5 font-jakarta font-medium text-[12px] text-ink-700 dark:text-gray-200">
            <Globe2 className="w-3.5 h-3.5" /> Language
          </label>
          {/* [UI-ID: UI-EIP-003] Language select — input for BE-GEN-001 */}
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="bg-white/15 backdrop-blur-2xl border border-white/55 rounded-xl font-inter text-[14px] text-ink-900 dark:text-white shadow-[0_2px_10px_rgba(16,90,65,0.08)] w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Hinglish">Hinglish</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-[6px] min-w-0">
          <label className="flex items-center gap-1.5 font-jakarta font-medium text-[12px] text-ink-700 dark:text-gray-200">
            <Ruler className="w-3.5 h-3.5" /> Length
          </label>
          {/* [UI-ID: UI-EIP-004] Length select — input for BE-GEN-001 */}
          <Select value={length} onValueChange={onLengthChange}>
            <SelectTrigger className="bg-white/15 backdrop-blur-2xl border border-white/55 rounded-xl font-inter text-[14px] text-ink-900 dark:text-white shadow-[0_2px_10px_rgba(16,90,65,0.08)] w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Short">Short</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Long">Long</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-2">
        {/* [UI-ID: UI-EIP-005] Suggestion chips — frontend-only, populates description textarea */}
        <h3 className="font-jakarta font-semibold text-[14px] text-ink-900 dark:text-white mb-3">Suggestions</h3>
        <div className="grid grid-cols-2 gap-2">
          {CHIPS.map(chip => (
            <button
              key={chip}
              className="bg-white/15 backdrop-blur-2xl hover:bg-white/40 border border-white/55 rounded-xl h-11 px-3 flex items-center gap-2 text-left shadow-[0_2px_10px_rgba(16,90,65,0.08)] transition-colors"
              onClick={() => onDescriptionChange(description ? `${description} ${chip}` : chip)}
            >
              <Sparkles className="w-3.5 h-3.5 text-mint-500 shrink-0" />
              <span className="font-jakarta font-medium text-[12px] text-ink-700 dark:text-gray-200 truncate">{chip}</span>
            </button>
          ))}
        </div>
      </div>

      {/* [UI-ID: UI-EIP-006] Generate Email button — triggers BE-GEN-001 */}
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="mt-auto w-full h-[52px] rounded-2xl bg-gradient-to-br from-[#5CC794] to-[#1F9462] flex items-center justify-center gap-2 text-white font-jakarta font-bold text-[14px] shadow-[0_8px_32px_rgba(16,90,65,0.14)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 fill-white/20" />
            Generate Email
            <Sparkles className="w-4 h-4 fill-white/20" />
          </>
        )}
      </button>
    </div>
  );
}
