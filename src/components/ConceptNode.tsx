import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Flame,
  Zap,
  Bookmark
} from 'lucide-react';
import type { Concept, MasteryScore } from '../types.js';

interface ConceptNodeData {
  concept: Concept;
  onSelect: (concept: Concept) => void;
  onQuickFeynman: (concept: Concept) => void;
}

const masteryInkConfig: Record<
  MasteryScore,
  {
    tagClass: string;
    label: string;
    tapeColor: string;
    icon: 'flame' | 'zap' | 'check';
  }
> = {
  1: {
    tagClass:
      'bg-[#FFEDD5]/80 text-[#9A3412] border-[#FDBA74] dark:bg-[#431407]/60 dark:text-[#FCA5A5] dark:border-[#991B1B]',
    label: 'Deep Friction (1/5)',
    tapeColor: 'bg-[#EA580C]/20 border-[#EA580C]/40',
    icon: 'flame',
  },
  2: {
    tagClass:
      'bg-[#FED7AA]/70 text-[#C2410C] border-[#FDBA74] dark:bg-[#451A03]/60 dark:text-[#FDBA74] dark:border-[#B45309]',
    label: 'Cold / Shaky (2/5)',
    tapeColor: 'bg-[#D97706]/20 border-[#D97706]/40',
    icon: 'flame',
  },
  3: {
    tagClass:
      'bg-[#FEF3C7]/80 text-[#854D0E] border-[#FDE68A] dark:bg-[#451A03]/50 dark:text-[#FDE047] dark:border-[#A16207]',
    label: 'In Progress (3/5)',
    tapeColor: 'bg-[#CA8A04]/20 border-[#CA8A04]/40',
    icon: 'zap',
  },
  4: {
    tagClass:
      'bg-[#DCFCE7]/80 text-[#166534] border-[#86EFAC] dark:bg-[#052E16]/60 dark:text-[#86EFAC] dark:border-[#15803D]',
    label: 'Solid (4/5)',
    tapeColor: 'bg-[#16A34A]/20 border-[#16A34A]/40',
    icon: 'check',
  },
  5: {
    tagClass:
      'bg-[#D1FAE5]/90 text-[#065F46] border-[#6EE7B7] dark:bg-[#064E3B]/60 dark:text-[#6EE7B7] dark:border-[#047857]',
    label: 'Mastered (5/5)',
    tapeColor: 'bg-[#059669]/20 border-[#059669]/40',
    icon: 'check',
  },
};

export const ConceptNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as ConceptNodeData;
  const { concept, onSelect, onQuickFeynman } = nodeData;
  const score = (concept.mastery_score || 3) as MasteryScore;
  const cfg = masteryInkConfig[score] || masteryInkConfig[3];

  const isCold = score <= 2;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(concept.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => onSelect(concept)}
      className="sketch-card group relative w-80 rounded-xl bg-[#FAF5EE] dark:bg-[#221913] border border-[#C8B69F] dark:border-[#473527] p-4.5 cursor-pointer text-left select-none transition-all duration-200"
    >
      {/* Top simulated washi tape accent for sketch note journal feel */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 washi-tape-amber rounded-sm border border-[#CDB59B]/50 pointer-events-none" />

      {/* Node Handles (Connection points) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#8C6D53] dark:!bg-[#CBB6A1] !border-2 !border-[#FAF5EE] dark:!border-[#221913] transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#8C6D53] dark:!bg-[#CBB6A1] !border-2 !border-[#FAF5EE] dark:!border-[#221913] transition-transform hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-[#8C6D53] dark:!bg-[#CBB6A1] !border-2 !border-[#FAF5EE] dark:!border-[#221913] transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-[#8C6D53] dark:!bg-[#CBB6A1] !border-2 !border-[#FAF5EE] dark:!border-[#221913] transition-transform hover:scale-125"
      />

      {/* Header Row: Ink Tag & Days */}
      <div className="flex items-center justify-between gap-2 mb-2 pt-0.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-sketch font-bold border ${cfg.tagClass}`}
        >
          {cfg.icon === 'flame' ? (
            <Flame className="w-3.5 h-3.5 shrink-0" />
          ) : cfg.icon === 'check' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Zap className="w-3.5 h-3.5 shrink-0" />
          )}
          {cfg.label}
        </span>

        <span className="flex items-center gap-1 text-[11px] text-[#8E7662] dark:text-[#A7927F] font-mono">
          <Clock className="w-3 h-3" />
          {daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d ago`}
        </span>
      </div>

      {/* Handwritten / Sketch Title */}
      <h3 className="font-sketch text-xl font-bold text-[#2C1E16] dark:text-[#F3E9DD] group-hover:text-[#8C532B] dark:group-hover:text-[#E0A878] transition-colors leading-snug line-clamp-1 mb-1">
        {concept.title}
      </h3>

      {/* Summary Note */}
      <p className="text-xs text-[#5D4636] dark:text-[#D1BEAB] line-clamp-2 leading-relaxed mb-3">
        {concept.summary}
      </p>

      {/* Margin / Sticky Friction Point Callout */}
      {concept.last_friction_point && (
        <div className="mb-3 rounded-lg bg-[#F3EADF] dark:bg-[#1A130E] border-l-3 border-[#D97706] dark:border-[#B45309] p-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-sketch font-bold text-[#92400E] dark:text-[#FBBF24] mb-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span>Friction Point</span>
          </div>
          <p className="text-[11px] text-[#4A3728] dark:text-[#C5B3A1] line-clamp-2 leading-tight">
            {concept.last_friction_point}
          </p>
        </div>
      )}

      {/* Card Footer: Tags & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E8DACB] dark:border-[#382B20]">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {(concept.tags || []).slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EFE3D5] dark:bg-[#2C211A] text-[#745B47] dark:text-[#B7A18C]"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isCold && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickFeynman(concept);
              }}
              title="Quick Feynman Warm-Up Drill"
              className="px-2 py-0.5 rounded text-[11px] font-sketch font-bold bg-[#FFEDD5] hover:bg-[#FED7AA] dark:bg-[#431407] dark:hover:bg-[#5E1B0A] text-[#9A3412] dark:text-[#FCA5A5] border border-[#FDBA74] dark:border-[#991B1B] flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3 h-3 text-[#EA580C]" />
              Drill
            </button>
          )}

          <span className="text-[11px] font-sketch font-bold text-[#8C6D53] dark:text-[#CBB6A1] group-hover:text-[#523B2A] dark:group-hover:text-white flex items-center gap-0.5 transition-colors">
            Inspect <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
