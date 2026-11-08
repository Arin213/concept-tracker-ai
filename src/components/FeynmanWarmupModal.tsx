import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  ShieldAlert
} from 'lucide-react';
import type { Concept, FeynmanGradeResult, FeynmanQuestion } from '../types.js';

interface FeynmanWarmupModalProps {
  isOpen: boolean;
  onClose: () => void;
  coldConcepts: Concept[];
  targetConcept?: Concept | null;
  onConceptUpdated: (concept: Concept) => void;
}

export const FeynmanWarmupModal: React.FC<FeynmanWarmupModalProps> = ({
  isOpen,
  onClose,
  coldConcepts,
  targetConcept,
  onConceptUpdated
}) => {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [questionData, setQuestionData] = useState<FeynmanQuestion | null>(null);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [userExplanation, setUserExplanation] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<FeynmanGradeResult | null>(null);
  const [scoreChange, setScoreChange] = useState<{ from: number; to: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = targetConcept || coldConcepts[0] || null;
      setSelectedConcept(initial);
      setQuestionData(null);
      setUserExplanation('');
      setGradeResult(null);
      setScoreChange(null);
      setError(null);

      if (initial) {
        fetchQuestion(initial.id);
      }
    }
  }, [isOpen, targetConcept, coldConcepts]);

  const fetchQuestion = async (conceptId: string) => {
    if (isLoadingQuestion) return; // Prevent double-clicks
    setIsLoadingQuestion(true);
    setError(null);
    setGradeResult(null);
    setUserExplanation('');

    try {
      const res = await fetch('/api/feynman/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: conceptId,
          previous_questions: questionHistory
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate question');
      setQuestionData(data);
      if (data.question) {
        setQuestionHistory((prev) => [...prev.slice(-4), data.question]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not generate Feynman question. Please try again.');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleSelectConcept = (concept: Concept) => {
    if (isLoadingQuestion) return;
    setSelectedConcept(concept);
    fetchQuestion(concept.id);
  };

  const handleSubmitExplanation = async () => {
    if (!selectedConcept || !questionData || !userExplanation.trim()) return;

    setIsGrading(true);
    setError(null);

    try {
      const res = await fetch('/api/feynman/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: selectedConcept.id,
          question: questionData.question,
          user_explanation: userExplanation.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grade explanation');

      setGradeResult(data);
      if (data.score_change) {
        setScoreChange(data.score_change);
        if (data.score_change.to > data.score_change.from) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#7F5539', '#15803D', '#D97706', '#0284C7'],
          });
        }
      }

      if (data.concept) {
        onConceptUpdated(data.concept);
      }
    } catch (err) {
      console.error(err);
      setError('Grading error. Please try again.');
    } finally {
      setIsGrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/40 dark:border-[#2E3F59] rounded-md overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#C0392B]/40 bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#C0392B] dark:text-[#EF4444]">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0]">
                  Daily Feynman Warm-Up
                </h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-[#C0392B]/30 bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444]">
                  Loopbreaker
                </span>
              </div>
              <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8]">
                Test your intuitive mental model by explaining mechanics simply without relying on jargon.
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

        {/* Cold Nodes Bar */}
        {coldConcepts.length > 1 && (
          <div className="flex items-center gap-2 px-5 py-2 bg-[#ECEFF1] dark:bg-[#0B0F19] border-b border-[#2C3E50]/20 dark:border-[#2E3F59] overflow-x-auto text-xs font-mono shrink-0">
            <span className="text-[#546E7A] dark:text-[#94A3B8] shrink-0 flex items-center gap-1 text-[11px]">
              <Flame className="w-3 h-3 text-[#C0392B]" /> Cold Nodes:
            </span>
            {coldConcepts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectConcept(c)}
                className={`px-2 py-0.5 rounded text-xs whitespace-nowrap transition-colors border cursor-pointer ${
                  selectedConcept?.id === c.id
                    ? 'border-[#C0392B] bg-[#C0392B] text-white font-bold'
                    : 'border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] text-[#2E4053] dark:text-[#E2E8F0] hover:border-[#4A6572]'
                }`}
              >
                {c.title} ({c.mastery_score}/5)
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          {error && (
            <div className="p-2.5 rounded border border-[#C0392B]/40 bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444] text-xs font-mono">
              {error}
            </div>
          )}

          {isLoadingQuestion ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-7 h-7 text-[#4A6572] dark:text-[#94A3B8] animate-spin" />
              <p className="text-xs font-mono text-[#546E7A] dark:text-[#94A3B8]">
                Generating Feynman drill question from a fresh angle...
              </p>
            </div>
          ) : questionData && selectedConcept ? (
            <>
              {/* Question Card */}
              <div className="p-4 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#4A6572] dark:text-[#94A3B8] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Target: {selectedConcept.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchQuestion(selectedConcept.id)}
                      disabled={isLoadingQuestion}
                      title="Generate a new question with a different conceptual angle"
                      className="px-2 py-0.5 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] hover:border-[#4A6572] text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isLoadingQuestion ? 'Generating...' : 'New Angle'}</span>
                    </button>
                    <span className="px-1.5 py-0.2 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] text-[#546E7A] dark:text-[#94A3B8] text-[10px]">
                      Mastery: {selectedConcept.mastery_score}/5
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#2E4053] dark:text-[#E2E8F0] leading-snug">
                  &ldquo;{questionData.question}&rdquo;
                </h3>

                {selectedConcept.last_friction_point && (
                  <div className="p-2 rounded border border-[#C0392B]/30 dark:border-[#EF4444]/30 bg-[#C0392B]/10 text-xs text-[#C0392B] dark:text-[#EF4444] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Known Friction Point: </span>
                      {selectedConcept.last_friction_point}
                    </div>
                  </div>
                )}

                {questionData.suggested_key_points?.length > 0 && (
                  <div className="pt-2 border-t border-[#2C3E50]/15 dark:border-[#2E3F59]">
                    <span className="text-[11px] font-mono font-semibold text-[#546E7A] dark:text-[#94A3B8] block mb-1">
                      Mental Checkpoints to hit:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {questionData.suggested_key_points.map((pt, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] text-[11px] text-[#2E4053] dark:text-[#E2E8F0] flex items-center gap-1.5"
                        >
                          <Lightbulb className="w-3 h-3 text-[#D35400] shrink-0" />
                          <span className="truncate">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Result Card if graded */}
              {gradeResult ? (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="p-4 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#2C3E50]/15 dark:border-[#2E3F59]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-lg font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0]">
                          {gradeResult.score}/5
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0]">
                            Feynman Mastery Score
                          </div>
                          {scoreChange && (
                            <div className="text-[11px] text-[#546E7A] dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
                              <span>Previous: {scoreChange.from}/5</span>
                              <ArrowRight className="w-3 h-3 text-[#4A6572] dark:text-[#94A3B8]" />
                              <span className="text-[#27AE60] dark:text-[#10B981] font-bold">
                                Updated: {scoreChange.to}/5
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded border border-[#27AE60]/40 bg-[#27AE60]/10 text-xs font-mono font-bold text-[#27AE60] dark:text-[#10B981]">
                          {gradeResult.score >= 4
                            ? 'Loop Broken · Concept Mastered!'
                            : gradeResult.score === 3
                            ? 'Good Progress · Active Recall Working'
                            : 'Friction Persists · Review Next Step'}
                        </span>
                      </div>
                    </div>

                    {/* Clarity Analysis */}
                    <div>
                      <span className="text-xs font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0] block mb-1">
                        Clarity &amp; Intuition Evaluation:
                      </span>
                      <p className="text-xs text-[#2E4053] dark:text-[#E2E8F0] leading-relaxed bg-[#D5DBDB]/60 dark:bg-[#161F30] p-2.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59]">
                        {gradeResult.clarity_analysis}
                      </p>
                    </div>

                    {/* Jargon & Strengths */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#D5DBDB]/60 dark:bg-[#161F30]">
                        <div className="flex items-center gap-1.5 text-[#C0392B] dark:text-[#EF4444] font-mono font-bold mb-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Jargon Crutches Flagged
                        </div>
                        {gradeResult.jargon_detected?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {gradeResult.jargon_detected.map((j, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 rounded border border-[#C0392B]/30 bg-[#C0392B]/10 text-[#C0392B] dark:text-[#EF4444] text-[10px] font-mono"
                              >
                                &ldquo;{j}&rdquo;
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-[#27AE60] dark:text-[#10B981]">
                            Zero crutch jargon! Explained from first principles.
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#D5DBDB]/60 dark:bg-[#161F30]">
                        <div className="flex items-center gap-1.5 text-[#27AE60] dark:text-[#10B981] font-mono font-bold mb-1">
                          <Award className="w-3.5 h-3.5" />
                          Key Strengths
                        </div>
                        <ul className="list-disc list-inside text-[#2E4053] dark:text-[#E2E8F0] text-[11px] space-y-0.5">
                          {(gradeResult.strengths || ['Clear causality']).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* State of Mind update */}
                    {gradeResult.state_of_mind_update && (
                      <div className="p-2.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#D5DBDB]/60 dark:bg-[#161F30] space-y-0.5 text-xs">
                        <span className="font-mono font-bold text-[#4A6572] dark:text-[#94A3B8] block">
                          Next Recommended Action:
                        </span>
                        <div className="text-[#2E4053] dark:text-[#E2E8F0] text-[11px]">
                          {gradeResult.state_of_mind_update.suggested_next_step}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-1 font-mono">
                    <button
                      type="button"
                      onClick={() => fetchQuestion(selectedConcept.id)}
                      className="px-3 py-1.5 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[#2E4053] dark:text-[#E2E8F0] text-xs flex items-center gap-1.5 transition-colors cursor-pointer hover:border-[#4A6572]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Try Another Question
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-1.5 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] hover:bg-[#3A4F59] dark:bg-[#2E3F59] dark:hover:bg-[#3E5478] text-white text-xs transition-colors cursor-pointer"
                    >
                      Done &amp; Return to Canvas
                    </button>
                  </div>
                </div>
              ) : (
                /* User explanation input */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#546E7A] dark:text-[#94A3B8] font-mono">
                    <span className="flex items-center gap-1 font-bold text-[#2E4053] dark:text-[#E2E8F0]">
                      <BookOpen className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
                      Your Intuitive Explanation:
                    </span>
                    <span>
                      {userExplanation.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <textarea
                    rows={6}
                    placeholder="Explain in plain language without hiding behind buzzwords..."
                    value={userExplanation}
                    onChange={(e) => setUserExplanation(e.target.value)}
                    className="w-full p-3 text-xs font-mono bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#2C3E50]/25 dark:border-[#2E3F59] rounded text-[#2E4053] dark:text-[#E2E8F0] placeholder-[#78909C] dark:placeholder-[#64748B] focus:outline-none focus:border-[#4A6572] transition-colors leading-relaxed resize-none"
                  />

                  <div className="p-2.5 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[11px] text-[#546E7A] dark:text-[#94A3B8] flex items-center gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-[#D35400] shrink-0" />
                    <span>
                      <strong>The Feynman Rule:</strong> If you cannot explain it simply using causal steps, you haven&apos;t fully mastered the underlying mechanism yet.
                    </span>
                  </div>

                  <div className="flex justify-end pt-1 font-mono">
                    <button
                      type="button"
                      onClick={handleSubmitExplanation}
                      disabled={isGrading || !userExplanation.trim()}
                      className="px-4 py-1.5 rounded border border-[#C0392B] bg-[#C0392B] hover:bg-[#A93226] disabled:opacity-40 text-white text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isGrading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          AI Grading in progress...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Grade My Intuition &amp; Update Score
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-[#546E7A] dark:text-[#94A3B8] text-xs font-mono">
              All concepts are currently in solid condition!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
