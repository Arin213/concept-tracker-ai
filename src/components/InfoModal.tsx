import React from 'react';
import {
  X,
  Coffee,
  Flame,
  GitFork,
  Mic,
  Compass,
  Sparkles
} from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/40 dark:border-[#2E3F59] rounded-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#4A6572] dark:text-[#E2E8F0]">
              <Coffee className="w-4 h-4 text-[#4A6572] dark:text-[#E2E8F0]" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0]">
                LoopTracker · Visual Concept Engine
              </h2>
              <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8]">
                Cognitive visual canvas designed to escape the learning-forgetting loop.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#2E4053] dark:text-[#E2E8F0] leading-relaxed min-h-0 flex-1">
          {/* Problem section */}
          <div className="p-3.5 rounded border border-[#C0392B]/30 dark:border-[#EF4444]/30 bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-1">
            <div className="text-xs font-mono font-bold text-[#C0392B] dark:text-[#EF4444] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              The Problem: The Learning-Forgetting Loop
            </div>
            <p className="text-[#546E7A] dark:text-[#94A3B8] text-[11px] leading-relaxed">
              Traditional note taking apps require high friction maintenance. Returning after a break leaves you stranded—you forget where you stopped, what tripped you up, and end up restarting tutorials from zero.
            </p>
          </div>

          {/* Pillars grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-1">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#2E4053] dark:text-[#E2E8F0]">
                <Mic className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
                1. Voice &amp; Code Ingestion
              </div>
              <p className="text-[#546E7A] dark:text-[#94A3B8] text-[11px]">
                Speak voice memos or drop bug traces. AI extracts macro-concepts and merges into the continuous graph.
              </p>
            </div>

            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-1">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#2E4053] dark:text-[#E2E8F0]">
                <GitFork className="w-3.5 h-3.5 text-[#27AE60] dark:text-[#10B981]" />
                2. Anti-Explosion Merging
              </div>
              <p className="text-[#546E7A] dark:text-[#94A3B8] text-[11px]">
                New notes on an existing topic merge into that node, refreshing friction points without duplicate nodes.
              </p>
            </div>

            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-1">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#2E4053] dark:text-[#E2E8F0]">
                <Compass className="w-3.5 h-3.5 text-[#D35400] dark:text-[#F39C12]" />
                3. State of Mind Briefing
              </div>
              <p className="text-[#546E7A] dark:text-[#94A3B8] text-[11px]">
                Inspect any card to read: (1) Where you left off, (2) Exact friction point hit, and (3) Concrete next step.
              </p>
            </div>

            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-1">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-[#2E4053] dark:text-[#E2E8F0]">
                <Sparkles className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
                4. Daily Feynman Warm-Ups
              </div>
              <p className="text-[#546E7A] dark:text-[#94A3B8] text-[11px]">
                Cold nodes are surfaced daily. Explain the mechanism simply without jargon, and AI evaluates your intuitive mastery.
              </p>
            </div>
          </div>

          {/* Canvas interactions */}
          <div className="p-3.5 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-1.5 font-sans">
            <span className="font-mono font-bold text-xs text-[#2E4053] dark:text-[#E2E8F0] block">
              Canvas Controls:
            </span>
            <ul className="space-y-1 text-[11px] text-[#546E7A] dark:text-[#94A3B8] list-disc list-inside">
              <li>
                <strong className="text-[#2E4053] dark:text-[#E2E8F0]">Drag nodes:</strong> Coordinates persist automatically to disk on drag-stop.
              </li>
              <li>
                <strong className="text-[#2E4053] dark:text-[#E2E8F0]">Draw links:</strong> Drag between top/bottom/side handles to establish connections.
              </li>
              <li>
                <strong className="text-[#2E4053] dark:text-[#E2E8F0]">Theme switch:</strong> Toggle between Flat Vintage-Cold (Light) and Flat Mystic Gothic (Dark) in the top nav.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer (shrink-0) */}
        <div className="p-3.5 border-t border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] flex justify-end font-mono shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] hover:bg-[#3A4F59] dark:bg-[#2E3F59] dark:hover:bg-[#3E5478] text-white text-xs transition-colors cursor-pointer"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
