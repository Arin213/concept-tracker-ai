import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Plus,
  RotateCcw,
  History,
  HelpCircle,
  Sun,
  Moon,
  Mic,
  LogOut,
  MoreHorizontal,
  Coffee,
  Loader2
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
  isAuthLoading?: boolean;
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
  isAuthLoading = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalConcepts = concepts.length;
  const coldCount = coldConcepts.length;
  const masteredCount = concepts.filter((c) => c.mastery_score >= 4).length;
  const avgMastery =
    totalConcepts > 0
      ? (concepts.reduce((acc, c) => acc + (Number(c.mastery_score) || 0), 0) / totalConcepts).toFixed(1)
      : '0';

  const isDark = theme === 'dark';

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-4 z-30 shrink-0 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="w-7 h-7 sm:w-8 h-8 rounded border border-[#2C3E50]/30 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#2E4053] dark:text-[#E2E8F0]">
          <Coffee className="w-3.5 h-3.5 sm:w-4 h-4 text-[#4A6572] dark:text-[#E2E8F0]" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-sm sm:text-base font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0] whitespace-nowrap">
            LoopTracker
          </span>
          <span className="text-xs text-[#546E7A] dark:text-[#94A3B8] hidden sm:inline whitespace-nowrap">
            · Visual Concept Engine
          </span>
        </div>
      </div>

      {/* Zone 2: Compact Metrics Ribbon (Tabular Numerals, Unboxed) */}
      <div className="hidden md:flex items-center gap-3 text-xs text-[#546E7A] dark:text-[#94A3B8] font-mono tabular-nums px-3 py-1 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#D5DBDB]/50 dark:bg-[#161F30]/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <span>Notes</span>
          <span className="font-bold text-[#2E4053] dark:text-[#E2E8F0]">{totalConcepts}</span>
        </div>
        <span className="text-[#2C3E50]/20 dark:text-[#2E3F59]">/</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[#C0392B] dark:text-[#EF4444]">Cold</span>
          <span className="font-bold text-[#C0392B] dark:text-[#EF4444]">{coldCount}</span>
        </div>
        <span className="text-[#2C3E50]/20 dark:text-[#2E3F59]">/</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[#27AE60] dark:text-[#10B981]">Mastered</span>
          <span className="font-bold text-[#27AE60] dark:text-[#10B981]">{masteredCount}</span>
        </div>
        <span className="text-[#2C3E50]/20 dark:text-[#2E3F59]">/</span>
        <div className="flex items-center gap-1.5">
          <span>Avg</span>
          <span className="font-bold text-[#2E4053] dark:text-[#E2E8F0]">{avgMastery}/5</span>
        </div>
      </div>

      {/* Zone 3: Organized Action Controls (Strict 1px Flat Borders, Zero Shadow) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Daily Feynman Warmup Button */}
        <button
          type="button"
          onClick={onOpenFeynmanModal}
          title="Daily Feynman active recall warmup"
          className="h-8 px-2 sm:px-2.5 rounded border border-[#C0392B]/40 dark:border-[#EF4444]/40 bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444] transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer shrink-0"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Warm-Up</span>
          {coldCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#C0392B] text-white">
              {coldCount}
            </span>
          )}
        </button>

        {/* Live Voice Coach Button (Gemini 3.8 Live API) */}
        <button
          type="button"
          onClick={onOpenLiveVoice}
          title="Live Voice Coach (Real-time 2-way audio)"
          className="h-8 px-2 sm:px-2.5 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#4A6572]/15 text-[#2E4053] dark:text-[#E2E8F0] transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer shrink-0"
        >
          <Mic className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
          <span className="hidden sm:inline">Voice</span>
        </button>

        {/* Primary CTA: Drop Notes / Code */}
        <button
          type="button"
          onClick={onOpenInputModal}
          title="Drop notes or code snippets"
          className="h-8 px-2 sm:px-2.5 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] dark:bg-[#2E3F59] hover:bg-[#3A4F59] dark:hover:bg-[#3E5478] text-[#FFFFFF] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Drop Notes</span>
        </button>

        {/* Single Unified Sign In / Account Action */}
        {user ? (
          <button
            type="button"
            onClick={onSignOut}
            disabled={isAuthLoading}
            title={`Signed in as ${user.displayName || user.email}. Click to Sign Out.`}
            className="h-8 px-2 sm:px-2.5 rounded border border-[#27AE60]/40 dark:border-[#10B981]/40 bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#C0392B]/10 hover:border-[#C0392B]/40 hover:text-[#C0392B] dark:hover:text-[#EF4444] text-[#27AE60] dark:text-[#10B981] flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer shrink-0"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-4 h-4 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse shrink-0" />
            )}
            <span className="hidden sm:inline truncate max-w-[85px]">{user.displayName?.split(' ')[0] || 'User'}</span>
            <LogOut className="w-3 h-3 opacity-70 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignInGoogle}
            disabled={isAuthLoading}
            title="Sign in with Google to sync concepts to Firestore"
            className="h-8 px-2 sm:px-2.5 rounded border border-[#2C3E50]/30 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:border-[#4A6572] hover:bg-[#E2E7E9] dark:hover:bg-[#1E293B] text-[#2E4053] dark:text-[#E2E8F0] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isAuthLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4A6572]" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Vintage Cold (Light Mode)' : 'Switch to Mystic Gothic (Dark Mode)'}
          className="h-8 w-8 sm:w-auto px-0 sm:px-2 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#E2E7E9] dark:hover:bg-[#1E293B] text-[#2E4053] dark:text-[#E2E8F0] transition-colors flex items-center justify-center gap-1 text-xs font-medium cursor-pointer shrink-0"
        >
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="hidden md:inline">Gothic</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-[#4A6572]" />
              <span className="hidden md:inline">Vintage</span>
            </>
          )}
        </button>

        {/* More Options / Utilities Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-8 w-8 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#E2E7E9] dark:hover:bg-[#1E293B] text-[#2E4053] dark:text-[#E2E8F0] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="More Options & Utilities"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded border border-[#2C3E50]/30 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#161F30] py-1 text-xs text-[#2E4053] dark:text-[#E2E8F0] z-50">
              {/* Audit Log */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAuditModal();
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#D5DBDB] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#546E7A] dark:text-[#94A3B8]" />
                <span>Audit Trail</span>
              </button>

              {/* Reset Graph */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onResetSeed();
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#D5DBDB] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#546E7A] dark:text-[#94A3B8]" />
                <span>Reset Seed Graph</span>
              </button>

              {/* About / Info */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenInfo();
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#D5DBDB] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#546E7A] dark:text-[#94A3B8]" />
                <span>About & Shortcuts</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
