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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/40 dark:border-[#2E3F59] rounded-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#2C3E50]/25 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-center text-[#4A6572] dark:text-[#E2E8F0]">
              <History className="w-4 h-4 text-[#4A6572] dark:text-[#E2E8F0]" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0]">
                Learning Loop Audit Trail
              </h2>
              <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8]">
                Verifiable record of concept mastery transitions, active recall tests, and study sessions.
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
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs min-h-0">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19]">
              <span className="text-[#546E7A] dark:text-[#94A3B8] text-[11px] block mb-0.5">Total Audit Events</span>
              <div className="text-xl font-bold tabular-nums text-[#2E4053] dark:text-[#E2E8F0]">
                {learningStates.length}
              </div>
            </div>
            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19]">
              <span className="text-[#546E7A] dark:text-[#94A3B8] text-[11px] block mb-0.5">Study Sessions Logged</span>
              <div className="text-xl font-bold tabular-nums text-[#27AE60] dark:text-[#10B981]">
                {sessions.length}
              </div>
            </div>
            <div className="p-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19]">
              <span className="text-[#546E7A] dark:text-[#94A3B8] text-[11px] block mb-0.5">Active Feynman Tests</span>
              <div className="text-xl font-bold tabular-nums text-[#C0392B] dark:text-[#EF4444]">
                {learningStates.filter((s) => s.trigger_event === 'feynman_test').length}
              </div>
            </div>
          </div>

          {/* Audit Log Timeline */}
          <div>
            <h3 className="text-xs font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0] mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
              Mastery Score Audit Log (`learning_states`)
            </h3>

            <div className="space-y-1.5">
              {learningStates.length === 0 ? (
                <div className="p-4 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-center text-[#546E7A] dark:text-[#94A3B8] font-mono">
                  No audit log entries recorded yet. Complete a Feynman drill or drop a study session!
                </div>
              ) : (
                learningStates.map((st) => {
                  const isImproved = st.new_score > st.previous_score;
                  return (
                    <div
                      key={st.id}
                      className="p-2.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2E4053] dark:text-[#E2E8F0]">
                            {st.concept_title || `Concept #${st.concept_id.slice(-6)}`}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                              st.trigger_event === 'feynman_test'
                                ? 'bg-[#C0392B]/15 text-[#C0392B] border-[#C0392B]/30 dark:text-[#EF4444]'
                                : st.trigger_event === 'session_dump'
                                ? 'bg-[#4A6572]/15 text-[#4A6572] border-[#4A6572]/30 dark:text-[#94A3B8]'
                                : 'bg-[#D5DBDB] text-[#546E7A] border-[#2C3E50]/20 dark:bg-[#161F30] dark:text-[#94A3B8]'
                            }`}
                          >
                            {st.trigger_event.replace('_', ' ')}
                          </span>
                        </div>

                        {st.feedback_notes && (
                          <p className="text-[#546E7A] dark:text-[#94A3B8] text-[11px] leading-relaxed line-clamp-2">
                            {st.feedback_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] font-mono text-xs font-bold">
                          <span className="text-[#546E7A] dark:text-[#94A3B8]">{st.previous_score}/5</span>
                          <ArrowRight className="w-3 h-3 text-[#546E7A] dark:text-[#94A3B8]" />
                          <span
                            className={
                              isImproved
                                ? 'text-[#27AE60] dark:text-[#10B981]'
                                : st.new_score <= 2
                                ? 'text-[#C0392B] dark:text-[#EF4444]'
                                : 'text-[#2E4053] dark:text-[#E2E8F0]'
                            }
                          >
                            {st.new_score}/5
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-[#546E7A] dark:text-[#94A3B8]">
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
            <h3 className="text-xs font-mono font-bold text-[#2E4053] dark:text-[#E2E8F0] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#27AE60] dark:text-[#10B981]" />
              Recorded Study Sessions (`study_sessions`)
            </h3>

            <div className="space-y-1.5">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-2.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-[#27AE60] dark:text-[#10B981] capitalize">
                      {sess.session_type.replace('_', ' ')} Session ({sess.duration_minutes}m)
                    </span>
                    <span className="text-[#546E7A] dark:text-[#94A3B8]">
                      {new Date(sess.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#2E4053] dark:text-[#E2E8F0] text-xs leading-relaxed">
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
