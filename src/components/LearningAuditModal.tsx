import React from 'react';
import { X, History, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import type { LearningState, StudySession } from '../types.js';

interface LearningAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  learningStates: LearningState[];
  sessions: StudySession[];
}

export const LearningAuditModal: React.FC<LearningAuditModalProps> = ({
  isOpen,
  onClose,
  learningStates,
  sessions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C140F]/60 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#FAF5EE] dark:bg-[#1E1611] border border-[#C8B69F] dark:border-[#473527] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFE3D5] dark:bg-[#2C211A] border border-[#C8B69F] dark:border-[#473527] flex items-center justify-center text-[#7F5539] dark:text-[#E0A878]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sketch text-xl font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                Learning Loop Audit Trail
              </h2>
              <p className="text-xs text-[#5D4636] dark:text-[#C5B3A1]">
                Verifiable record of concept mastery transitions, active recall tests, and study sessions.
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sketch">
            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#473527]">
              <span className="text-[#8C6D53] dark:text-[#A7927F] block mb-0.5">Total Audit Events</span>
              <div className="text-2xl font-bold font-mono text-[#7F5539] dark:text-[#E0A878]">
                {learningStates.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#473527]">
              <span className="text-[#8C6D53] dark:text-[#A7927F] block mb-0.5">Study Sessions Logged</span>
              <div className="text-2xl font-bold font-mono text-[#15803D] dark:text-[#4ADE80]">
                {sessions.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#473527]">
              <span className="text-[#8C6D53] dark:text-[#A7927F] block mb-0.5">Active Feynman Tests</span>
              <div className="text-2xl font-bold font-mono text-[#C2410C] dark:text-[#FCA5A5]">
                {learningStates.filter((s) => s.trigger_event === 'feynman_test').length}
              </div>
            </div>
          </div>

          {/* Audit Log Timeline */}
          <div>
            <h3 className="font-sketch text-base font-bold text-[#2C1E16] dark:text-[#F3E9DD] mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#7F5539] dark:text-[#E0A878]" />
              Mastery Score Audit Log (`learning_states`)
            </h3>

            <div className="space-y-2">
              {learningStates.length === 0 ? (
                <div className="p-6 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#473527] text-center text-[#8C6D53] dark:text-[#A7927F] font-sketch">
                  No audit log entries recorded yet. Complete a Feynman drill or drop a study session!
                </div>
              ) : (
                learningStates.map((st) => {
                  const isImproved = st.new_score > st.previous_score;
                  return (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sketch text-sm font-bold text-[#2C1E16] dark:text-[#F3E9DD]">
                            {st.concept_title || `Concept #${st.concept_id.slice(-6)}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sketch font-bold border ${
                              st.trigger_event === 'feynman_test'
                                ? 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74] dark:bg-[#431407] dark:text-[#FCA5A5]'
                                : st.trigger_event === 'session_dump'
                                ? 'bg-[#EFE3D5] text-[#7F5539] border-[#D6C4B0] dark:bg-[#2C211A] dark:text-[#E0A878]'
                                : 'bg-[#FAF5EE] text-[#745B47] border-[#C8B69F] dark:bg-[#1E1611] dark:text-[#CBB6A1]'
                            }`}
                          >
                            {st.trigger_event.replace('_', ' ')}
                          </span>
                        </div>

                        {st.feedback_notes && (
                          <p className="text-[#5D4636] dark:text-[#C5B3A1] text-[11px] leading-relaxed line-clamp-2">
                            {st.feedback_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF5EE] dark:bg-[#261C15] border border-[#D6C4B0] dark:border-[#473527] font-mono text-xs font-bold">
                          <span className="text-[#8C6D53] dark:text-[#A7927F]">{st.previous_score}/5</span>
                          <ArrowRight className="w-3 h-3 text-[#7F5539] dark:text-[#E0A878]" />
                          <span
                            className={
                              isImproved
                                ? 'text-[#16A34A] dark:text-[#4ADE80]'
                                : st.new_score <= 2
                                ? 'text-[#C2410C] dark:text-[#FCA5A5]'
                                : 'text-[#2C1E16] dark:text-[#F3E9DD]'
                            }
                          >
                            {st.new_score}/5
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-[#8C6D53] dark:text-[#A7927F]">
                          {new Date(st.recorded_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Study Sessions */}
          <div>
            <h3 className="font-sketch text-base font-bold text-[#2C1E16] dark:text-[#F3E9DD] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
              Recorded Study Sessions (`study_sessions`)
            </h3>

            <div className="space-y-2">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl bg-[#F4ECE1] dark:bg-[#18110D] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] font-sketch">
                    <span className="font-bold text-[#15803D] dark:text-[#4ADE80] capitalize">
                      {sess.session_type.replace('_', ' ')} Session ({sess.duration_minutes}m)
                    </span>
                    <span className="text-[#8C6D53] dark:text-[#A7927F] font-mono">
                      {new Date(sess.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#3E2C1E] dark:text-[#D1BEAB] text-xs leading-relaxed">
                    {sess.ai_summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
