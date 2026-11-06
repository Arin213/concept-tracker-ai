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
    setIsLoadingQuestion(true);
    setError(null);
    setGradeResult(null);
    setUserExplanation('');

    try {
      const res = await fetch('/api/feynman/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_id: conceptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate question');
      setQuestionData(data);
    } catch (err) {
      console.error(err);
      setError('Could not generate Feynman question. Please try again.');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleSelectConcept = (concept: Concept) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C140F]/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#FAF5EE] dark:bg-[#1E1611] border border-[#C8B69F] dark:border-[#473527] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] dark:bg-[#431407] border border-[#FDBA74] dark:border-[#991B1B] flex items-center justify-center text-[#C2410C]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sketch text-xl font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                  Daily Feynman Warm-Up
                </h2>
                <span className="text-[10px] font-sketch font-bold px-2 py-0.5 rounded bg-[#FFEDD5] text-[#9A3412] border border-[#FDBA74] dark:bg-[#431407] dark:text-[#FCA5A5] dark:border-[#991B1B]">
                  Loopbreaker
                </span>
              </div>
              <p className="text-xs text-[#5D4636] dark:text-[#C5B3A1]">
                Test your intuitive mental model by explaining mechanics simply without relying on jargon.
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

        {/* Cold Nodes Bar */}
        {coldConcepts.length > 1 && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-[#F4ECE1] dark:bg-[#18110D] border-b border-[#C8B69F] dark:border-[#473527] overflow-x-auto text-xs font-sketch font-bold">
            <span className="text-[#8C6D53] dark:text-[#A7927F] shrink-0 flex items-center gap-1 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-[#C2410C]" /> Cold Nodes:
            </span>
            {coldConcepts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectConcept(c)}
                className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all border ${
                  selectedConcept?.id === c.id
                    ? 'bg-[#FFEDD5] border-[#EA580C] text-[#9A3412] dark:bg-[#431407] dark:text-[#FCA5A5]'
                    : 'bg-[#FAF5EE] dark:bg-[#221913] border-[#D6C4B0] dark:border-[#3E2D20] text-[#745B47] dark:text-[#A7927F] hover:text-[#2C1E16]'
                }`}
              >
                {c.title} ({c.mastery_score}/5)
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-[#FFEDD5] border border-[#FDBA74] text-[#9A3412] dark:bg-[#431407] dark:border-[#991B1B] dark:text-[#FCA5A5] text-xs font-sketch">
              {error}
            </div>
          )}

          {isLoadingQuestion ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#7F5539] dark:text-[#E0A878] animate-spin" />
              <p className="text-xs font-sketch text-[#8C6D53] dark:text-[#CBB6A1]">
                Formulating Feynman question targeting your recorded friction point...
              </p>
            </div>
          ) : questionData && selectedConcept ? (
            <>
              {/* Question Card */}
              <div className="p-5 rounded-xl bg-[#F7F0E6] dark:bg-[#241A13] border border-[#C8B69F] dark:border-[#473527] space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs font-sketch">
                  <span className="font-bold text-[#7F5539] dark:text-[#E0A878] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Target: {selectedConcept.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#EFE3D5] dark:bg-[#1C140F] text-[#5D4636] dark:text-[#D1BEAB] text-[11px] font-mono">
                    Mastery: {selectedConcept.mastery_score}/5
                  </span>
                </div>

                <h3 className="font-sketch text-xl font-bold text-[#2C1E16] dark:text-[#F3E9DD] leading-snug">
                  &ldquo;{questionData.question}&rdquo;
                </h3>

                {selectedConcept.last_friction_point && (
                  <div className="p-2.5 rounded-lg bg-[#FFEDD5]/60 dark:bg-[#431407]/40 border border-[#FDBA74] dark:border-[#991B1B]/40 text-xs text-[#7C2D12] dark:text-[#FECACA] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-sketch font-bold">Known Friction Point: </span>
                      {selectedConcept.last_friction_point}
                    </div>
                  </div>
                )}

                {questionData.suggested_key_points?.length > 0 && (
                  <div className="pt-2 border-t border-[#D6C4B0] dark:border-[#3E2D20]">
                    <span className="text-[11px] font-sketch font-bold text-[#8C6D53] dark:text-[#A7927F] block mb-1.5">
                      Mental Checkpoints to hit:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {questionData.suggested_key_points.map((pt, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-[#FAF5EE] dark:bg-[#1C140F] border border-[#D6C4B0] dark:border-[#3E2D20] text-[11px] text-[#4A3728] dark:text-[#D1BEAB] flex items-center gap-1.5"
                        >
                          <Lightbulb className="w-3 h-3 text-[#CA8A04] shrink-0" />
                          <span className="truncate">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Result Card if graded */}
              {gradeResult ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-5 rounded-xl bg-[#F7F0E6] dark:bg-[#241A13] border border-[#C8B69F] dark:border-[#473527] space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#D6C4B0] dark:border-[#3E2D20]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#EFE3D5] dark:bg-[#2C211A] border border-[#C8B69F] dark:border-[#473527] flex items-center justify-center text-xl font-sketch font-bold text-[#7F5539] dark:text-[#E0A878]">
                          {gradeResult.score}/5
                        </div>
                        <div>
                          <div className="text-sm font-sketch font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                            Feynman Mastery Score
                          </div>
                          {scoreChange && (
                            <div className="text-xs text-[#8C6D53] dark:text-[#A7927F] flex items-center gap-1.5 mt-0.5 font-mono">
                              <span>Previous: {scoreChange.from}/5</span>
                              <ArrowRight className="w-3 h-3 text-[#7F5539] dark:text-[#E0A878]" />
                              <span className="text-[#16A34A] dark:text-[#4ADE80] font-bold">
                                Updated: {scoreChange.to}/5
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-3 py-1 rounded-md text-xs font-sketch font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] dark:bg-[#052E16] dark:text-[#86EFAC]">
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
                      <span className="text-xs font-sketch font-bold text-[#2C1E16] dark:text-[#F3E9DD] block mb-1">
                        Clarity &amp; Intuition Evaluation:
                      </span>
                      <p className="text-xs text-[#4A3728] dark:text-[#D1BEAB] leading-relaxed bg-[#FAF5EE] dark:bg-[#1C140F] p-3 rounded-lg border border-[#D6C4B0] dark:border-[#3E2D20]">
                        {gradeResult.clarity_analysis}
                      </p>
                    </div>

                    {/* Jargon & Strengths */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#FAF5EE] dark:bg-[#1C140F] border border-[#D6C4B0] dark:border-[#3E2D20]">
                        <div className="flex items-center gap-1.5 text-[#C2410C] font-sketch font-bold mb-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Jargon Crutches Flagged
                        </div>
                        {gradeResult.jargon_detected?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {gradeResult.jargon_detected.map((j, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-[#FFEDD5] text-[#9A3412] dark:bg-[#431407] dark:text-[#FCA5A5] text-[11px] font-mono border border-[#FDBA74]"
                              >
                                &ldquo;{j}&rdquo;
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-sketch text-[#16A34A] dark:text-[#4ADE80]">
                            Zero crutch jargon! Explained from first principles.
                          </span>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF5EE] dark:bg-[#1C140F] border border-[#D6C4B0] dark:border-[#3E2D20]">
                        <div className="flex items-center gap-1.5 text-[#166534] dark:text-[#4ADE80] font-sketch font-bold mb-1.5">
                          <Award className="w-3.5 h-3.5" />
                          Key Strengths
                        </div>
                        <ul className="list-disc list-inside text-[#4A3728] dark:text-[#D1BEAB] text-[11px] space-y-1">
                          {(gradeResult.strengths || ['Clear causality']).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* State of Mind update */}
                    {gradeResult.state_of_mind_update && (
                      <div className="p-3.5 rounded-lg bg-[#F4ECE1] dark:bg-[#1A130E] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1 text-xs">
                        <span className="font-sketch font-bold text-[#7F5539] dark:text-[#E0A878] block">
                          Next Recommended Action:
                        </span>
                        <div className="text-[#3E2C1E] dark:text-[#D1BEAB] text-[11px]">
                          {gradeResult.state_of_mind_update.suggested_next_step}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 font-sketch font-bold">
                    <button
                      type="button"
                      onClick={() => fetchQuestion(selectedConcept.id)}
                      className="px-4 py-2 rounded-xl text-xs bg-[#EFE3D5] dark:bg-[#2C211A] text-[#5D4636] dark:text-[#D1BEAB] flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try Another Question
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl text-xs bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] text-white dark:text-[#16100C] transition-all shadow-xs"
                    >
                      Done &amp; Return to Canvas
                    </button>
                  </div>
                </div>
              ) : (
                /* User explanation input */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#8C6D53] dark:text-[#A7927F] font-sketch">
                    <span className="flex items-center gap-1 font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                      <BookOpen className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878]" />
                      Your Intuitive Explanation:
                    </span>
                    <span className="font-mono">
                      {userExplanation.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <textarea
                    rows={6}
                    placeholder="Explain in plain language without hiding behind buzzwords.
E.g., 'Imagine 5 servers in a cluster trying to elect a leader...'"
                    value={userExplanation}
                    onChange={(e) => setUserExplanation(e.target.value)}
                    className="w-full p-4 text-xs font-mono bg-[#F4ECE1] dark:bg-[#16100C] border border-[#C8B69F] dark:border-[#473527] rounded-xl text-[#2C1E16] dark:text-[#F3E9DD] placeholder-[#8E7662] dark:placeholder-[#8C7664] focus:outline-none focus:border-[#7F5539] dark:focus:border-[#E0A878] transition-all leading-relaxed"
                  />

                  <div className="p-3 rounded-lg bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] text-[11px] text-[#5D4636] dark:text-[#C5B3A1] flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#CA8A04] shrink-0" />
                    <span>
                      <strong>The Feynman Rule:</strong> If you cannot explain it simply using causal steps, you haven&apos;t fully mastered the underlying mechanism yet.
                    </span>
                  </div>

                  <div className="flex justify-end pt-2 font-sketch font-bold">
                    <button
                      type="button"
                      onClick={handleSubmitExplanation}
                      disabled={isGrading || !userExplanation.trim()}
                      className="px-6 py-2.5 rounded-xl text-xs bg-[#C2410C] hover:bg-[#9A3412] dark:bg-[#B91C1C] dark:hover:bg-[#991B1B] disabled:opacity-50 text-white transition-all shadow-xs flex items-center gap-2"
                    >
                      {isGrading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          AI Grading in progress...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Grade My Intuition &amp; Update Score
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-[#8C6D53] dark:text-[#A7927F] text-xs font-sketch">
              All concepts are currently in solid condition!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
