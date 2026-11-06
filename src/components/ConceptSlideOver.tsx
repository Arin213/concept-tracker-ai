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
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-[#FAF5EE] dark:bg-[#1E1611] border-l border-[#C8B69F] dark:border-[#473527] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Slide-over Header */}
      <div className="p-6 border-b border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-sketch font-bold border ${
                score <= 2
                  ? 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74] dark:bg-[#431407] dark:text-[#FCA5A5]'
                  : score === 3
                  ? 'bg-[#FEF3C7] text-[#854D0E] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FDE047]'
                  : 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] dark:bg-[#052E16] dark:text-[#86EFAC]'
              }`}
            >
              Mastery: {score}/5
            </span>
            <span className="text-xs text-[#8C6D53] dark:text-[#A7927F] font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(concept.updated_at).toLocaleDateString()}
            </span>
          </div>

          <h2 className="font-sketch text-2xl font-bold text-[#2C1E16] dark:text-[#F3E9DD] leading-snug">
            {concept.title}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-[#8C6D53] dark:text-[#CBB6A1] hover:text-[#2C1E16] dark:hover:text-white hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick Feynman Drill Banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#261C15] border border-[#D6C4B0] dark:border-[#473527]">
          <div>
            <div className="text-xs font-sketch font-bold text-[#9A3412] dark:text-[#FCA5A5] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#C2410C]" />
              Feynman Warm-Up Ready
            </div>
            <p className="text-[11px] text-[#5D4636] dark:text-[#C5B3A1] mt-0.5">
              {isCold
                ? 'Cold node detected! Test intuitive recall to break the loop.'
                : 'Drill deep first principles to maintain long-term retention.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onStartFeynman(concept)}
            className="px-4 py-2 rounded-xl text-xs font-sketch font-bold bg-[#C2410C] hover:bg-[#9A3412] text-white shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start Drill
          </button>
        </div>

        {/* State of Mind Briefing Panel (Field Notebook memo) */}
        <div className="rounded-xl bg-[#F7F0E6] dark:bg-[#241A13] border border-[#C8B69F] dark:border-[#473527] p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-sketch font-bold text-[#7F5539] dark:text-[#E0A878]">
              <Compass className="w-4 h-4" />
              STATE OF MIND BRIEFING
            </div>
            {isLoadingBriefing && (
              <span className="text-[10px] text-[#8C6D53] dark:text-[#A7927F] flex items-center gap-1 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
                Synthesizing...
              </span>
            )}
          </div>

          <p className="text-[11px] font-hand font-bold text-[#8C6D53] dark:text-[#CBB6A1]">
            Resuming after a break? Here is your exact context bridge:
          </p>

          <div className="space-y-3 pt-1 text-xs">
            {/* 1. Where you left off */}
            <div className="p-3 rounded-lg bg-[#FAF5EE] dark:bg-[#1C140F] border border-[#D6C4B0] dark:border-[#3E2D20] space-y-1">
              <span className="text-[11px] font-sketch font-bold text-[#7F5539] dark:text-[#E0A878] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#EFE3D5] dark:bg-[#2C211A] text-[#7F5539] dark:text-[#E0A878] flex items-center justify-center text-[10px] font-mono">
                  1
                </span>
                Where you left off:
              </span>
              <p className="text-[#3E2C1E] dark:text-[#E5D7C7] text-xs leading-relaxed">
                {briefing?.where_you_left_off || `Investigating ${concept.title} and integrating key takeaways.`}
              </p>
            </div>

            {/* 2. Exact Friction Point */}
            <div className="p-3 rounded-lg bg-[#FFEDD5]/60 dark:bg-[#431407]/40 border border-[#FDBA74] dark:border-[#991B1B]/40 space-y-1">
              <span className="text-[11px] font-sketch font-bold text-[#9A3412] dark:text-[#FCA5A5] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                2. Exact friction point hit:
              </span>
              <p className="text-[#7C2D12] dark:text-[#FECACA] text-xs leading-relaxed">
                {briefing?.exact_friction_point || concept.last_friction_point || 'No friction point recorded yet.'}
              </p>
            </div>

            {/* 3. Suggested Next Step */}
            <div className="p-3 rounded-lg bg-[#DCFCE7]/60 dark:bg-[#052E16]/40 border border-[#86EFAC] dark:border-[#15803D]/40 space-y-1">
              <span className="text-[11px] font-sketch font-bold text-[#166534] dark:text-[#86EFAC] flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                3. Suggested next step:
              </span>
              <p className="text-[#14532D] dark:text-[#BBF7D0] text-xs leading-relaxed">
                {briefing?.suggested_next_step || concept.suggested_next_step || 'Draft a quick diagram or conduct a Feynman test.'}
              </p>
            </div>
          </div>
        </div>

        {/* Mastery Score Adjuster */}
        <div className="p-4 rounded-xl bg-[#F4ECE1] dark:bg-[#261C15] border border-[#D6C4B0] dark:border-[#473527] space-y-2">
          <label className="text-xs font-sketch font-bold text-[#3E2C1E] dark:text-[#EFE5D9] block">
            Mastery Level (Active Recall):
          </label>
          <div className="grid grid-cols-5 gap-1.5 font-sketch font-bold">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const isActive = score === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleScoreChange(lvl as MasteryScore)}
                  className={`py-2 rounded-lg text-xs transition-all border ${
                    isActive
                      ? lvl <= 2
                        ? 'bg-[#FFEDD5] border-[#EA580C] text-[#9A3412] dark:bg-[#7F1D1D] dark:text-[#FECACA] shadow-xs'
                        : lvl === 3
                        ? 'bg-[#FEF3C7] border-[#CA8A04] text-[#854D0E] dark:bg-[#78350F] dark:text-[#FDE68A] shadow-xs'
                        : 'bg-[#DCFCE7] border-[#16A34A] text-[#166534] dark:bg-[#14532D] dark:text-[#BBF7D0] shadow-xs'
                      : 'bg-[#FAF5EE] dark:bg-[#1C140F] border-[#D6C4B0] dark:border-[#3E2D20] text-[#745B47] dark:text-[#A7927F] hover:bg-[#EFE3D5] dark:hover:bg-[#2C211A]'
                  }`}
                >
                  {lvl} / 5
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Summary */}
        <div className="space-y-1.5">
          <label className="text-xs font-sketch font-bold text-[#3E2C1E] dark:text-[#EFE5D9] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878]" />
            AI Synthesis Summary:
          </label>
          <textarea
            rows={3}
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            className="w-full p-3 text-xs bg-[#F4ECE1] dark:bg-[#16100C] border border-[#C8B69F] dark:border-[#3E2D20] rounded-lg text-[#2C1E16] dark:text-[#F3E9DD] focus:outline-none focus:border-[#7F5539] dark:focus:border-[#E0A878] leading-relaxed font-sans"
          />
        </div>

        {/* Friction Point Editable */}
        <div className="space-y-1.5">
          <label className="text-xs font-sketch font-bold text-[#9A3412] dark:text-[#FCA5A5] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Last Stumbling Block / Friction:
          </label>
          <textarea
            rows={2}
            value={editedFriction}
            onChange={(e) => setEditedFriction(e.target.value)}
            className="w-full p-3 text-xs bg-[#F4ECE1] dark:bg-[#16100C] border border-[#C8B69F] dark:border-[#3E2D20] rounded-lg text-[#2C1E16] dark:text-[#F3E9DD] focus:outline-none focus:border-[#7F5539] dark:focus:border-[#E0A878] leading-relaxed font-sans"
          />
        </div>

        {/* Raw Notes History */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sketch font-bold text-[#3E2C1E] dark:text-[#EFE5D9] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878]" />
              Raw Notes & Code Snippets:
            </label>
            <span className="text-[11px] text-[#8C6D53] dark:text-[#A7927F] font-mono">
              Markdown / Code
            </span>
          </div>
          <textarea
            rows={8}
            value={editedNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            className="w-full p-3.5 text-xs font-mono bg-[#F4ECE1] dark:bg-[#16100C] border border-[#C8B69F] dark:border-[#3E2D20] rounded-lg text-[#2C1E16] dark:text-[#F3E9DD] focus:outline-none focus:border-[#7F5539] dark:focus:border-[#E0A878] leading-relaxed"
          />
        </div>

        {/* Connected Graph Relationships */}
        <div className="space-y-2">
          <label className="text-xs font-sketch font-bold text-[#3E2C1E] dark:text-[#EFE5D9] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878]" />
            Connected Nodes ({connectedEdges.length}):
          </label>
          <div className="space-y-1.5 font-sketch">
            {connectedEdges.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#F4ECE1] dark:bg-[#1C140F] border border-[#D6C4B0] dark:border-[#3E2D20] text-xs text-[#8C6D53] dark:text-[#A7927F]">
                No links yet. Drag from this card&apos;s handle to connect with another concept on canvas!
              </div>
            ) : (
              connectedEdges.map((rel) => {
                const isSource = rel.source_concept_id === concept.id;
                const otherId = isSource ? rel.target_concept_id : rel.source_concept_id;
                const other = allConcepts.find((c) => c.id === otherId);

                return (
                  <div
                    key={rel.id}
                    className="p-2.5 rounded-lg bg-[#F4ECE1] dark:bg-[#261C15] border border-[#D6C4B0] dark:border-[#3E2D20] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <LinkIcon className="w-3.5 h-3.5 text-[#7F5539] dark:text-[#E0A878] shrink-0" />
                      <span className="font-bold text-[#2C1E16] dark:text-[#F3E9DD] truncate">
                        {isSource ? 'Points to: ' : 'From: '}
                        {other?.title || 'Unknown node'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#EFE3D5] dark:bg-[#1C140F] text-[10px] font-mono text-[#745B47] dark:text-[#C5B3A1] shrink-0">
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
      <div className="p-6 border-t border-[#C8B69F] dark:border-[#473527] bg-[#F4ECE1]/80 dark:bg-[#18110D]/80 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${concept.title}" and its connections?`)) {
              onDeleteConcept(concept.id);
              onClose();
            }
          }}
          className="p-2.5 rounded-lg text-[#C2410C] hover:bg-[#FFEDD5] dark:hover:bg-[#431407] transition-colors"
          title="Delete Concept"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 font-sketch font-bold">
          {saveSuccess && (
            <span className="text-xs text-[#15803D] dark:text-[#4ADE80] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs font-sketch font-bold bg-[#7F5539] hover:bg-[#68442B] dark:bg-[#E0A878] dark:hover:bg-[#D49865] text-white dark:text-[#16100C] transition-all shadow-xs flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
