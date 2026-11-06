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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C140F]/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FAF5EE] dark:bg-[#1E1611] border border-[#C8B69F] dark:border-[#473527] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFE3D5] dark:bg-[#2C211A] border border-[#C8B69F] dark:border-[#473527] flex items-center justify-center text-[#7F5539] dark:text-[#E0A878]">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sketch text-xl font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                LoopTracker · Sketch Note Method
              </h2>
              <p className="text-xs text-[#5D4636] dark:text-[#C5B3A1]">
                Tactile cognitive canvas designed to escape tutorial hell.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C6D53] dark:text-[#CBB6A1] hover:text-[#2C1E16] dark:hover:text-white hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#3E2C1E] dark:text-[#D1BEAB] leading-relaxed">
          {/* Problem section */}
          <div className="p-4 rounded-xl bg-[#FFEDD5]/60 dark:bg-[#431407]/40 border border-[#FDBA74] dark:border-[#991B1B]/40 space-y-1">
            <div className="font-sketch text-sm font-bold text-[#9A3412] dark:text-[#FCA5A5] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#C2410C]" />
              The Trap: The Tutorial Hell &amp; Forgetting Loop
            </div>
            <p className="text-[#7C2D12] dark:text-[#FECACA] text-xs">
              Traditional note taking apps require high friction maintenance. Returning after a few days or weeks leaves you stranded—you forget where you stopped, what tripped you up, and end up restarting tutorials from zero.
            </p>
          </div>

          {/* Pillars grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1.5">
              <div className="flex items-center gap-2 font-sketch font-bold text-sm text-[#2C1E16] dark:text-[#F3E9DD]">
                <Mic className="w-4 h-4 text-[#7F5539] dark:text-[#E0A878]" />
                1. Spoken &amp; Code Ingestion
              </div>
              <p className="text-[#5D4636] dark:text-[#C5B3A1] text-[11px]">
                Speak quick voice memos or paste messy bug traces. AI transcribes and structures macro-concepts in seconds.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1.5">
              <div className="flex items-center gap-2 font-sketch font-bold text-sm text-[#2C1E16] dark:text-[#F3E9DD]">
                <GitFork className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
                2. Anti-Explosion Auto-Merging
              </div>
              <p className="text-[#5D4636] dark:text-[#C5B3A1] text-[11px]">
                New notes on an existing topic automatically merge into that node, refreshing friction points without spawning 50 duplicate cards.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1.5">
              <div className="flex items-center gap-2 font-sketch font-bold text-sm text-[#2C1E16] dark:text-[#F3E9DD]">
                <Compass className="w-4 h-4 text-[#CA8A04] dark:text-[#FBBF24]" />
                3. State of Mind Briefing
              </div>
              <p className="text-[#5D4636] dark:text-[#C5B3A1] text-[11px]">
                Inspect any card to read: (1) Where you left off, (2) Exact friction point hit, and (3) Concrete next step to take right now.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1.5">
              <div className="flex items-center gap-2 font-sketch font-bold text-sm text-[#2C1E16] dark:text-[#F3E9DD]">
                <Sparkles className="w-4 h-4 text-[#7F5539] dark:text-[#E0A878]" />
                4. Daily Feynman Warm-Ups
              </div>
              <p className="text-[#5D4636] dark:text-[#C5B3A1] text-[11px]">
                Cold nodes are surfaced daily. Explain the mechanism simply without jargon, and AI grades your intuitive mastery!
              </p>
            </div>
          </div>

          {/* Canvas interactions */}
          <div className="p-4 rounded-xl bg-[#F7F0E6] dark:bg-[#241A13] border border-[#C8B69F] dark:border-[#473527] space-y-1.5">
            <span className="font-sketch font-bold text-sm text-[#2C1E16] dark:text-[#F3E9DD] block">
              Sketch Canvas Gestures:
            </span>
            <ul className="space-y-1 text-[11px] text-[#5D4636] dark:text-[#C5B3A1] list-disc list-inside">
              <li>
                <strong className="text-[#2C1E16] dark:text-[#F3E9DD]">Drag cards:</strong> Coordinates persist automatically to disk on drag-stop.
              </li>
              <li>
                <strong className="text-[#2C1E16] dark:text-[#F3E9DD]">Draw arrow links:</strong> Drag between top/bottom/side handles to establish prerequisite connections.
              </li>
              <li>
                <strong className="text-[#2C1E16] dark:text-[#F3E9DD]">Theme switch:</strong> Click the &ldquo;Milk Coffee&rdquo; / &ldquo;Dark Roast&rdquo; button in the header to switch between creamy latte and dark mocha themes.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80 flex justify-end font-sketch font-bold">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] text-white dark:text-[#16100C] transition-all shadow-xs"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
