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
  LogIn,
  LogOut,
  User as UserIcon,
  MoreHorizontal,
  Compass
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalConcepts = concepts.length;
  const coldCount = coldConcepts.length;
  const masteredCount = concepts.filter((c) => c.mastery_score >= 4).length;
  const avgMastery = totalConcepts
    ? (concepts.reduce((acc, c) => acc + c.mastery_score, 0) / totalConcepts).toFixed(1)
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
    <header className="h-14 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] px-4 flex items-center justify-between gap-4 z-30 shrink-0 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded border border-[#2C3E50]/30 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#2E4053] dark:text-[#E2E8F0]">
          <Compass className="w-4 h-4 text-[#4A6572] dark:text-[#E2E8F0]" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0] whitespace-nowrap">
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
      <div className="flex items-center gap-2 shrink-0">
        {/* Daily Feynman Warmup Button */}
        <button
          type="button"
          onClick={onOpenFeynmanModal}
          title="Daily Feynman active recall warmup"
          className="h-8 px-2.5 sm:px-3 rounded border border-[#C0392B]/40 dark:border-[#EF4444]/40 bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0"
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
          className="h-8 px-2.5 sm:px-3 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#4A6572]/15 text-[#2E4053] dark:text-[#E2E8F0] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0"
        >
          <Mic className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
          <span className="hidden sm:inline">Voice</span>
        </button>

        {/* Primary CTA: Drop Notes / Code */}
        <button
          type="button"
          onClick={onOpenInputModal}
          className="h-8 px-3 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] dark:bg-[#2E3F59] hover:bg-[#3A4F59] dark:hover:bg-[#3E5478] text-[#FFFFFF] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Drop Notes</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Vintage Cold (Light Mode)' : 'Switch to Mystic Gothic (Dark Mode)'}
          className="h-8 px-2.5 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:bg-[#E2E7E9] dark:hover:bg-[#1E293B] text-[#2E4053] dark:text-[#E2E8F0] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0"
        >
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="hidden xl:inline">Gothic</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-[#4A6572]" />
              <span className="hidden xl:inline">Vintage</span>
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
                className="w-full px-3 py-2 text-left hover:bg-[#D5DBDB] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer border-b border-[#2C3E50]/15 dark:border-[#2E3F59]"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#546E7A] dark:text-[#94A3B8]" />
                <span>About & Shortcuts</span>
              </button>

              {/* Auth state */}
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full px-3 py-2 text-left text-[#C0392B] dark:text-[#EF4444] hover:bg-[#D5DBDB] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out ({user.displayName?.split(' ')[0] || 'User'})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSignInGoogle();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#D5DBDB] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
                  <span>Google Cloud Sync</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User profile avatar indicator if logged in */}
        {user && (
          <div
            className="w-8 h-8 rounded border border-[#2C3E50]/30 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center overflow-hidden shrink-0"
            title={`Logged in as ${user.displayName || user.email}`}
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-[#546E7A] dark:text-[#94A3B8]" />
            )}
          </div>
        )}
      </div>
    </header>
  );
};
