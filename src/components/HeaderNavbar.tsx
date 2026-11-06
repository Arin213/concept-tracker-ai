import React from 'react';
import {
  Flame,
  Plus,
  RotateCcw,
  History,
  HelpCircle,
  Coffee,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Mic,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import type { Concept } from '../types.js';
import type { User } from 'firebase/auth';

interface HeaderNavbarProps {
  concepts: Concept[];
  coldConcepts: Concept[];
  onOpenInputModal: () => void;
  onOpenFeynmanModal: () => void;
  onOpenAuditModal: () => void;
  onResetSeed: () => void;
  onOpenInfo: () => void;
  onOpenLiveVoice: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: User | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  concepts,
  coldConcepts,
  onOpenInputModal,
  onOpenFeynmanModal,
  onOpenAuditModal,
  onResetSeed,
  onOpenInfo,
  onOpenLiveVoice,
  theme,
  onToggleTheme,
  user,
  onSignInGoogle,
  onSignOut,
}) => {
  const totalConcepts = concepts.length;
  const coldCount = coldConcepts.length;
  const masteredCount = concepts.filter((c) => c.mastery_score >= 4).length;
  const avgMastery = totalConcepts
    ? (concepts.reduce((acc, c) => acc + c.mastery_score, 0) / totalConcepts).toFixed(1)
    : '0';

  const isDark = theme === 'dark';

  return (
    <header className="h-16 border-b border-[#C8B69F] dark:border-[#473527] bg-[#FAF5EE]/95 dark:bg-[#1C140F]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 z-30 shrink-0 transition-colors duration-200">
      {/* Brand Identity (Sketch Note Notebook Title) */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#EFE3D5] dark:bg-[#2C211A] border border-[#C8B69F] dark:border-[#473527] flex items-center justify-center text-[#7F5539] dark:text-[#E0A878] shadow-xs">
          <Coffee className="w-5 h-5" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sketch text-2xl font-bold tracking-tight text-[#2C1E16] dark:text-[#F3E9DD] leading-none">
              LoopTracker
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-sketch font-bold bg-[#EFE3D5] dark:bg-[#2C211A] text-[#7F5539] dark:text-[#E0A878] border border-[#D6C4B0] dark:border-[#473527]">
              Sketch Note Canvas
            </span>
          </div>
          <p className="text-[11px] font-hand font-bold text-[#8C6D53] dark:text-[#CBB6A1] hidden md:block mt-0.5">
            Active recall · Milk coffee study journal
          </p>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-sketch text-[#5D4636] dark:text-[#D1BEAB]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#8C6D53] dark:text-[#A7927F]">Notes:</span>
          <span className="font-bold text-[#2C1E16] dark:text-[#F3E9DD] font-mono px-1.5 py-0.5 rounded bg-[#EFE3D5] dark:bg-[#2C211A]">
            {totalConcepts}
          </span>
        </div>

        <span className="text-[#C8B69F] dark:text-[#473527]">&middot;</span>

        <div className="flex items-center gap-1.5">
          <span className="text-[#C2410C] dark:text-[#FCA5A5] flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Cold / Friction:
          </span>
          <span className="font-bold text-[#9A3412] dark:text-[#FDBA74] font-mono px-1.5 py-0.5 rounded bg-[#FFEDD5] dark:bg-[#431407]">
            {coldCount}
          </span>
        </div>

        <span className="text-[#C8B69F] dark:text-[#473527]">&middot;</span>

        <div className="flex items-center gap-1.5">
          <span className="text-[#166534] dark:text-[#86EFAC]">Mastered:</span>
          <span className="font-bold text-[#15803D] dark:text-[#4ADE80] font-mono px-1.5 py-0.5 rounded bg-[#DCFCE7] dark:bg-[#052E16]">
            {masteredCount}
          </span>
        </div>

        <span className="text-[#C8B69F] dark:text-[#473527]">&middot;</span>

        <div className="flex items-center gap-1.5">
          <span className="text-[#7F5539] dark:text-[#E0A878]">Avg Mastery:</span>
          <span className="font-bold font-mono px-1.5 py-0.5 rounded bg-[#EFE3D5] dark:bg-[#2C211A] text-[#2C1E16] dark:text-[#F3E9DD]">
            {avgMastery}/5
          </span>
        </div>
      </div>

      {/* Action Buttons & Theme Switcher */}
      <div className="flex items-center gap-2">
        {/* Light / Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Milk Coffee (Light Mode)' : 'Switch to Dark Roast (Dark Mode)'}
          className="px-3 py-1.5 rounded-xl border border-[#C8B69F] dark:border-[#473527] bg-[#FAF5EE] dark:bg-[#221913] hover:bg-[#F3EAE0] dark:hover:bg-[#2C211A] text-[#2C1E16] dark:text-[#F3E9DD] transition-all flex items-center gap-1.5 text-xs font-sketch font-bold shadow-xs"
        >
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#E0A878]" />
              <span className="hidden sm:inline">Dark Roast</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-[#CA8A04]" />
              <span className="hidden sm:inline">Milk Coffee</span>
            </>
          )}
        </button>

        {/* Reset Seed Demo */}
        <button
          type="button"
          onClick={onResetSeed}
          title="Reset Knowledge Graph to Sample Seed"
          className="p-2 rounded-xl text-[#8C6D53] dark:text-[#CBB6A1] hover:text-[#2C1E16] dark:hover:text-white hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A] transition-colors hidden sm:flex items-center gap-1.5 text-xs font-sketch"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Reset Graph</span>
        </button>

        {/* Audit Log */}
        <button
          type="button"
          onClick={onOpenAuditModal}
          title="View Learning States Audit Trail"
          className="p-2 rounded-xl text-[#5D4636] dark:text-[#D1BEAB] hover:text-[#2C1E16] dark:hover:text-white bg-[#EFE3D5]/80 dark:bg-[#2C211A]/80 border border-[#D6C4B0] dark:border-[#473527] transition-all flex items-center gap-1.5 text-xs font-sketch font-bold"
        >
          <History className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878]" />
          <span className="hidden sm:inline">Audit Trail</span>
        </button>

        {/* Live Voice Coach Button (Gemini 3.8 Live API) */}
        <button
          type="button"
          onClick={onOpenLiveVoice}
          title="Open Gemini 3.8 Live Voice Coach (Real-time 2-way audio)"
          className="px-3 py-1.5 rounded-xl text-xs font-sketch font-bold bg-[#E0A878] dark:bg-[#7F5539] text-[#2C1E16] dark:text-[#F5ECE2] border border-[#C8B69F] dark:border-[#5C4033] shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#E0A878] animate-pulse" />
          <span className="hidden md:inline">Voice Coach</span>
          <span className="px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 text-[9px] uppercase tracking-wider font-sans">
            Live
          </span>
        </button>

        {/* Daily Feynman Warmup CTA (Terracotta warm sienna ink button) */}
        <button
          type="button"
          onClick={onOpenFeynmanModal}
          className="px-3.5 py-1.5 rounded-xl text-xs font-sketch font-bold bg-[#C2410C] hover:bg-[#9A3412] dark:bg-[#B91C1C] dark:hover:bg-[#991B1B] text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Feynman Warm-Up</span>
          <span className="sm:hidden">Warm-Up</span>
          {coldCount > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-black/25 text-[10px] font-mono">
              {coldCount}
            </span>
          )}
        </button>

        {/* Hybrid Ingestion CTA (Deep coffee brown button) */}
        <button
          type="button"
          onClick={onOpenInputModal}
          className="px-3.5 py-1.5 rounded-xl text-xs font-sketch font-bold bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#D49865] dark:hover:bg-[#C28555] text-white dark:text-[#16100C] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Drop Notes / Voice</span>
          <span className="sm:hidden">Drop</span>
        </button>

        {/* Firebase Google Auth Button */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-[#C8B69F] dark:border-[#473527]">
            <div className="flex items-center gap-1.5" title={`Signed in as ${user.displayName || user.email}`}>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-[#7F5539] dark:border-[#E0A878]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#EFE3D5] dark:bg-[#2C211A] border border-[#C8B69F] flex items-center justify-center text-xs font-bold text-[#7F5539]">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <span className="hidden xl:inline text-xs font-sketch font-bold text-[#2C1E16] dark:text-[#F3E9DD] max-w-[100px] truncate">
                {user.displayName?.split(' ')[0] || 'Logged In'}
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#8C6D53] hover:text-[#C2410C] dark:hover:text-[#FCA5A5] hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignInGoogle}
            title="Sign in with Google to sync notes to Firestore"
            className="px-3 py-1.5 rounded-xl border border-[#C8B69F] dark:border-[#473527] bg-[#FAF5EE] dark:bg-[#221913] hover:bg-[#F3EAE0] dark:hover:bg-[#2C211A] text-[#2C1E16] dark:text-[#F3E9DD] transition-all flex items-center gap-1.5 text-xs font-sketch font-bold shadow-xs cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878]" />
            <span className="hidden sm:inline">Google Sign-In</span>
          </button>
        )}

        {/* Info Modal trigger */}
        <button
          type="button"
          onClick={onOpenInfo}
          className="p-2 rounded-xl text-[#8C6D53] dark:text-[#CBB6A1] hover:text-[#2C1E16] dark:hover:text-white hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A] transition-colors cursor-pointer"
          title="About LoopTracker"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
