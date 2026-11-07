import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  Flame,
  Zap,
  CheckCircle2
} from 'lucide-react';
import type { Concept, MasteryScore } from '../types.js';

interface ConceptNodeData {
  concept: Concept;
  onSelect: (concept: Concept) => void;
  onQuickFeynman: (concept: Concept) => void;
}

const masteryConfig: Record<
  MasteryScore,
  {
    tagClass: string;
    label: string;
    icon: 'flame' | 'zap' | 'check';
  }
> = {
  1: {
    tagClass: 'text-[#C0392B] dark:text-[#EF4444] border-[#C0392B]/40 dark:border-[#EF4444]/40 bg-[#C0392B]/10',
    label: 'Cold (1/5)',
    icon: 'flame',
  },
  2: {
    tagClass: 'text-[#D35400] dark:text-[#F97316] border-[#D35400]/40 dark:border-[#F97316]/40 bg-[#D35400]/10',
    label: 'Friction (2/5)',
    icon: 'flame',
  },
  3: {
    tagClass: 'text-[#546E7A] dark:text-[#94A3B8] border-[#546E7A]/40 dark:border-[#94A3B8]/40 bg-[#546E7A]/10',
    label: 'Progress (3/5)',
    icon: 'zap',
  },
  4: {
    tagClass: 'text-[#27AE60] dark:text-[#10B981] border-[#27AE60]/40 dark:border-[#10B981]/40 bg-[#27AE60]/10',
    label: 'Solid (4/5)',
    icon: 'check',
  },
  5: {
    tagClass: 'text-[#16A085] dark:text-[#34D399] border-[#16A085]/40 dark:border-[#34D399]/40 bg-[#16A085]/10',
    label: 'Mastered (5/5)',
    icon: 'check',
  },
};

export const ConceptNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as ConceptNodeData;
  const { concept, onSelect, onQuickFeynman } = nodeData;
  const score = (concept.mastery_score || 3) as MasteryScore;
  const cfg = masteryConfig[score] || masteryConfig[3];

  const isCold = score <= 2;
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(concept.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => onSelect(concept)}
      className="group relative w-76 rounded-md bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/30 dark:border-[#2E3F59] p-4 cursor-pointer text-left select-none transition-colors duration-150 hover:border-[#4A6572] dark:hover:border-[#415A77]"
    >
      {/* Node Handles (Connection points) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-[#4A6572] dark:!bg-[#94A3B8] !border-none"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-[#4A6572] dark:!bg-[#94A3B8] !border-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-[#4A6572] dark:!bg-[#94A3B8] !border-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-[#4A6572] dark:!bg-[#94A3B8] !border-none"
      />

      {/* Header Row: Mastery Tag & Time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${cfg.tagClass}`}
        >
          {cfg.icon === 'flame' ? (
            <Flame className="w-3 h-3 shrink-0" />
          ) : cfg.icon === 'check' ? (
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          ) : (
            <Zap className="w-3 h-3 shrink-0" />
          )}
          {cfg.label}
        </span>

        <span className="flex items-center gap-1 text-[11px] text-[#546E7A] dark:text-[#94A3B8] font-mono">
          <Clock className="w-3 h-3" />
          {daysSinceUpdate === 0 ? 'Today' : `${daysSinceUpdate}d`}
        </span>
      </div>

      {/* Node Title */}
      <h3 className="text-sm font-bold text-[#2E4053] dark:text-[#E2E8F0] group-hover:text-[#4A6572] dark:group-hover:text-[#F1F5F9] transition-colors leading-snug line-clamp-1 mb-1.5">
        {concept.title}
      </h3>

      {/* Summary Note */}
      <p className="text-xs text-[#546E7A] dark:text-[#94A3B8] line-clamp-2 leading-relaxed mb-3">
        {concept.summary}
      </p>

      {/* Friction Point Callout (1px flat border, zero shadow) */}
      {concept.last_friction_point && (
        <div className="mb-3 rounded border border-[#2C3E50]/20 dark:border-[#2E3F59] bg-[#E2E7E9] dark:bg-[#1B263B] p-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[#D35400] dark:text-[#F97316] mb-0.5">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Friction Point</span>
          </div>
          <p className="text-[11px] text-[#2E4053] dark:text-[#C9D1D9] line-clamp-2 leading-tight">
            {concept.last_friction_point}
          </p>
        </div>
      )}

      {/* Card Footer: Tags & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2C3E50]/15 dark:border-[#2E3F59]">
        <div className="flex items-center gap-1 overflow-hidden">
          {(concept.tags || []).slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#2C3E50]/15 dark:border-[#2E3F59] bg-[#E2E7E9] dark:bg-[#1B263B] text-[#546E7A] dark:text-[#94A3B8]"
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
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#C0392B] dark:text-[#EF4444] border border-[#C0392B]/40 dark:border-[#EF4444]/40 hover:bg-[#C0392B]/10 transition-colors"
            >
              Drill
            </button>
          )}

          <span className="text-[11px] font-medium text-[#546E7A] dark:text-[#94A3B8] group-hover:text-[#2E4053] dark:group-hover:text-[#E2E8F0] flex items-center gap-0.5 transition-colors">
            Inspect <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
