import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Flame,
  AlertTriangle,
  ArrowRight,
  Compass,
  CheckCircle2,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  Save,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import type { Concept, ConceptRelationship, MasteryScore, StateOfMindBriefing } from '../types.js';

interface ConceptSlideOverProps {
  concept: Concept | null;
  onClose: () => void;
  onUpdateConcept: (id: string, updates: Partial<Concept>) => void;
  onDeleteConcept: (id: string) => void;
  onStartFeynman: (concept: Concept) => void;
  allConcepts: Concept[];
  relationships: ConceptRelationship[];
}

export const ConceptSlideOver: React.FC<ConceptSlideOverProps> = ({
  concept,
  onClose,
  onUpdateConcept,
  onDeleteConcept,
  onStartFeynman,
  allConcepts,
  relationships,
}) => {
  const [briefing, setBriefing] = useState<StateOfMindBriefing | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedFriction, setEditedFriction] = useState('');
  const [editedNextStep, setEditedNextStep] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (concept) {
      setEditedNotes(concept.raw_notes || '');
      setEditedSummary(concept.summary || '');
      setEditedFriction(concept.last_friction_point || '');
      setEditedNextStep(concept.suggested_next_step || '');
      setBriefing(null);
      setSaveSuccess(false);

      loadStateOfMind(concept.id);
    }
  }, [concept?.id]);

  const loadStateOfMind = async (conceptId: string) => {
    setIsLoadingBriefing(true);
    try {
      const res = await fetch(`/api/concepts/${conceptId}/state-of-mind`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
      }
    } catch (err) {
      console.error('Failed to load State of Mind briefing:', err);
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  if (!concept) return null;

  const score = concept.mastery_score;
  const isCold = score <= 2;

  const connectedEdges = relationships.filter(
    (r) => r.source_concept_id === concept.id || r.target_concept_id === concept.id
  );

  const handleSave = () => {
    setIsSaving(true);
    onUpdateConcept(concept.id, {
      summary: editedSummary,
      raw_notes: editedNotes,
      last_friction_point: editedFriction,
      suggested_next_step: editedNextStep,
    });
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 350);
  };

  const handleScoreChange = (newScore: MasteryScore) => {
    onUpdateConcept(concept.id, { mastery_score: newScore });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-[#ECEFF1] dark:bg-[#0B0F19] border-l border-[#2C3E50]/25 dark:border-[#2E3F59] flex flex-col animate-in slide-in-from-right duration-200">
      {/* Slide-over Header */}
      <div className="p-4 sm:p-5 border-b border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-start justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                score <= 2
                  ? 'bg-[#C0392B]/15 text-[#C0392B] border-[#C0392B]/30 dark:text-[#EF4444]'
                  : score === 3
                  ? 'bg-[#D35400]/15 text-[#D35400] border-[#D35400]/30 dark:text-[#F39C12]'
                  : 'bg-[#27AE60]/15 text-[#27AE60] border-[#27AE60]/30 dark:text-[#10B981]'
              }`}
            >
              Mastery: {score}/5
            </span>
            <span className="text-xs text-[#546E7A] dark:text-[#94A3B8] font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(concept.updated_at).toLocaleDateString()}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#2E4053] dark:text-[#E2E8F0] leading-snug">
            {concept.title}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded text-[#546E7A] dark:text-[#94A3B8] hover:text-[#2E4053] dark:hover:text-white hover:bg-[#ECEFF1] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">
        {/* Quick Feynman Drill Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-md bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/20 dark:border-[#2E3F59]">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-[#C0392B] dark:text-[#EF4444] flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Feynman Warm-Up Ready
            </div>
            <p className="text-[11px] text-[#546E7A] dark:text-[#94A3B8]">
              {isCold
                ? 'Cold node detected! Test intuitive recall to break the loop.'
                : 'Drill deep first principles to maintain retention.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onStartFeynman(concept)}
            className="px-3 py-1.5 rounded border border-[#C0392B] bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-mono transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            Drill
          </button>
        </div>

        {/* State of Mind Briefing Panel */}
        <div className="rounded-md bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/20 dark:border-[#2E3F59] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#4A6572] dark:text-[#94A3B8]">
              <Layers className="w-3.5 h-3.5" />
              STATE OF MIND BRIEFING
            </div>
            {isLoadingBriefing && (
              <span className="text-[10px] text-[#546E7A] dark:text-[#94A3B8] flex items-center gap-1 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
                Synthesizing...
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Where you left off */}
            <div className="p-2.5 rounded bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#2C3E50]/15 dark:border-[#2E3F59] space-y-1">
              <span className="text-[11px] font-mono font-semibold text-[#546E7A] dark:text-[#94A3B8] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] text-[#2E4053] dark:text-[#E2E8F0] flex items-center justify-center text-[10px]">
                  1
                </span>
                Where you left off:
              </span>
              <p className="text-[#2E4053] dark:text-[#E2E8F0] text-xs leading-relaxed">
                {briefing?.where_you_left_off || `Investigating ${concept.title} and integrating key takeaways.`}
              </p>
            </div>

            {/* 2. Exact Friction Point */}
            <div className="p-2.5 rounded bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#C0392B]/30 dark:border-[#EF4444]/30 space-y-1">
              <span className="text-[11px] font-mono font-semibold text-[#C0392B] dark:text-[#EF4444] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                2. Exact friction point hit:
              </span>
              <p className="text-[#2E4053] dark:text-[#E2E8F0] text-xs leading-relaxed">
                {briefing?.exact_friction_point || concept.last_friction_point || 'No friction point recorded yet.'}
              </p>
            </div>

            {/* 3. Suggested Next Step */}
            <div className="p-2.5 rounded bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#27AE60]/30 dark:border-[#10B981]/30 space-y-1">
              <span className="text-[11px] font-mono font-semibold text-[#27AE60] dark:text-[#10B981] flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                3. Suggested next step:
              </span>
              <p className="text-[#2E4053] dark:text-[#E2E8F0] text-xs leading-relaxed">
                {briefing?.suggested_next_step || concept.suggested_next_step || 'Draft a quick diagram or conduct a Feynman test.'}
              </p>
            </div>
          </div>
        </div>

        {/* Mastery Score Adjuster */}
        <div className="p-3.5 rounded-md bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/20 dark:border-[#2E3F59] space-y-2">
          <label className="text-xs font-mono font-semibold text-[#2E4053] dark:text-[#E2E8F0] block">
            Mastery Score (1-5):
          </label>
          <div className="grid grid-cols-5 gap-1.5 font-mono text-xs">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const isActive = score === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleScoreChange(lvl as MasteryScore)}
                  className={`py-1.5 rounded text-xs transition-colors border cursor-pointer ${
                    isActive
                      ? lvl <= 2
                        ? 'bg-[#C0392B] border-[#C0392B] text-white'
                        : lvl === 3
                        ? 'bg-[#D35400] border-[#D35400] text-white'
                        : 'bg-[#27AE60] border-[#27AE60] text-white'
                      : 'bg-[#ECEFF1] dark:bg-[#0B0F19] border-[#2C3E50]/20 dark:border-[#2E3F59] text-[#546E7A] dark:text-[#94A3B8] hover:border-[#4A6572]'
                  }`}
                >
                  {lvl} / 5
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Summary */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-semibold text-[#2E4053] dark:text-[#E2E8F0] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
            AI Synthesis Summary:
          </label>
          <textarea
            rows={3}
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            className="w-full p-2.5 text-xs bg-[#D5DBDB]/60 dark:bg-[#161F30] border border-[#2C3E50]/25 dark:border-[#2E3F59] rounded text-[#2E4053] dark:text-[#E2E8F0] focus:outline-none focus:border-[#4A6572] leading-relaxed resize-none font-sans"
          />
        </div>

        {/* Friction Point Editable */}
        <div className="space-y-1">
          <label className="text-xs font-mono font-semibold text-[#C0392B] dark:text-[#EF4444] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Last Stumbling Block / Friction:
          </label>
          <textarea
            rows={2}
            value={editedFriction}
            onChange={(e) => setEditedFriction(e.target.value)}
            className="w-full p-2.5 text-xs bg-[#D5DBDB]/60 dark:bg-[#161F30] border border-[#2C3E50]/25 dark:border-[#2E3F59] rounded text-[#2E4053] dark:text-[#E2E8F0] focus:outline-none focus:border-[#4A6572] leading-relaxed resize-none font-sans"
          />
        </div>

        {/* Raw Notes History */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#2E4053] dark:text-[#E2E8F0] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
              Raw Notes &amp; Code Snippets:
            </label>
            <span className="text-[10px] text-[#546E7A] dark:text-[#94A3B8] font-mono">
              Markdown / Code
            </span>
          </div>
          <textarea
            rows={6}
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            className="w-full p-2.5 text-xs font-mono bg-[#D5DBDB]/60 dark:bg-[#161F30] border border-[#2C3E50]/25 dark:border-[#2E3F59] rounded text-[#2E4053] dark:text-[#E2E8F0] focus:outline-none focus:border-[#4A6572] leading-relaxed resize-none"
          />
        </div>

        {/* Connected Graph Relationships */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-semibold text-[#2E4053] dark:text-[#E2E8F0] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#94A3B8]" />
            Connected Nodes ({connectedEdges.length}):
          </label>
          <div className="space-y-1.5">
            {connectedEdges.length === 0 ? (
              <div className="p-2.5 rounded bg-[#D5DBDB]/60 dark:bg-[#161F30] border border-[#2C3E50]/15 dark:border-[#2E3F59] text-xs text-[#546E7A] dark:text-[#94A3B8]">
                No links yet. Connect handles on the canvas to link concepts!
              </div>
            ) : (
              connectedEdges.map((rel) => {
                const isSource = rel.source_concept_id === concept.id;
                const otherId = isSource ? rel.target_concept_id : rel.source_concept_id;
                const other = allConcepts.find((c) => c.id === otherId);

                return (
                  <div
                    key={rel.id}
                    className="p-2 rounded bg-[#D5DBDB]/60 dark:bg-[#161F30] border border-[#2C3E50]/15 dark:border-[#2E3F59] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <LinkIcon className="w-3 h-3 text-[#546E7A] dark:text-[#94A3B8] shrink-0" />
                      <span className="font-semibold text-[#2E4053] dark:text-[#E2E8F0] truncate">
                        {isSource ? 'Points to: ' : 'From: '}
                        {other?.title || 'Unknown node'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#ECEFF1] dark:bg-[#0B0F19] text-[10px] font-mono text-[#546E7A] dark:text-[#94A3B8] shrink-0">
                      {rel.relationship_type}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Slide-over Footer */}
      <div className="p-4 border-t border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#D5DBDB] dark:bg-[#161F30] flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            onDeleteConcept(concept.id);
            onClose();
          }}
          className="p-2 rounded border border-[#C0392B]/30 text-[#C0392B] dark:text-[#EF4444] hover:bg-[#C0392B]/15 transition-colors cursor-pointer"
          title="Delete Concept"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 font-mono">
          {saveSuccess && (
            <span className="text-xs text-[#27AE60] dark:text-[#10B981] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded border border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] hover:bg-[#3A4F59] dark:bg-[#2E3F59] dark:hover:bg-[#3E5478] text-white text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
