import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnNodeDrag,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import { ConceptNode } from './ConceptNode.js';
import type { Concept, ConceptRelationship, RelationshipType } from '../types.js';
import { Search, Layers, Flame, BookOpen } from 'lucide-react';

interface CanvasGraphProps {
  concepts: Concept[];
  relationships: ConceptRelationship[];
  onSelectConcept: (concept: Concept) => void;
  onQuickFeynman: (concept: Concept) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onAddRelationship: (rel: {
    source_concept_id: string;
    target_concept_id: string;
    relationship_type: RelationshipType;
    label: string;
  }) => void;
  selectedConceptId?: string | null;
  theme?: 'light' | 'dark';
}

const nodeTypes = {
  conceptNode: ConceptNode,
};

export const CanvasGraph: React.FC<CanvasGraphProps> = ({
  concepts,
  relationships,
  onSelectConcept,
  onQuickFeynman,
  onUpdatePosition,
  onAddRelationship,
  selectedConceptId,
  theme = 'light'
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'cold' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isDark = theme === 'dark';

  // Edge coloring in harmony with coffee color theory
  const edgePalette = useMemo<Record<RelationshipType, { stroke: string; labelBg: string; text: string }>>(() => {
    if (isDark) {
      return {
        prerequisite_of: { stroke: '#A5B4FC', labelBg: '#2E2856', text: '#E0E7FF' },
        part_of: { stroke: '#7DD3FC', labelBg: '#13354C', text: '#E0F2FE' },
        related_to: { stroke: '#D4B89D', labelBg: '#362A1F', text: '#F5ECE2' },
        derived_from: { stroke: '#86EFAC', labelBg: '#143C24', text: '#DCFCE7' },
      };
    }
    return {
      prerequisite_of: { stroke: '#4F46E5', labelBg: '#EEF2FF', text: '#312E81' },
      part_of: { stroke: '#0284C7', labelBg: '#F0F9FF', text: '#075985' },
      related_to: { stroke: '#8C6849', labelBg: '#FAF2EA', text: '#4A3423' },
      derived_from: { stroke: '#15803D', labelBg: '#F0FDF4', text: '#14532D' },
    };
  }, [isDark]);

  // Map concepts to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return concepts.map((concept) => {
      const isMatchSearch =
        !searchQuery ||
        concept.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concept.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (concept.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const isMatchFilter =
        filterMode === 'all' ||
        (filterMode === 'cold' && concept.mastery_score <= 2) ||
        (filterMode === 'mastered' && concept.mastery_score >= 4);

      const isDimmed = !isMatchSearch || !isMatchFilter;
      const isSelected = selectedConceptId === concept.id;

      return {
        id: concept.id,
        type: 'conceptNode',
        position: { x: concept.position_x, y: concept.position_y },
        data: {
          concept,
          onSelect: onSelectConcept,
          onQuickFeynman,
        },
        style: {
          opacity: isDimmed ? 0.22 : 1,
          filter: isSelected
            ? isDark
              ? 'drop-shadow(0 0 16px rgba(224, 168, 120, 0.45))'
              : 'drop-shadow(0 0 16px rgba(120, 83, 56, 0.35))'
            : undefined,
          transition: 'opacity 0.2s ease, filter 0.2s ease',
        },
      };
    });
  }, [concepts, onSelectConcept, onQuickFeynman, filterMode, searchQuery, selectedConceptId, isDark]);

  // Map relationships to React Flow edges with sketch pen arrows
  const initialEdges: Edge[] = useMemo(() => {
    return relationships.map((rel) => {
      const colorCfg = edgePalette[rel.relationship_type] || edgePalette.related_to;
      return {
        id: rel.id,
        source: rel.source_concept_id,
        target: rel.target_concept_id,
        animated: rel.relationship_type === 'prerequisite_of',
        label: rel.label,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colorCfg.stroke,
          width: 16,
          height: 16,
        },
        style: {
          stroke: colorCfg.stroke,
          strokeWidth: 2.2,
          strokeDasharray: rel.relationship_type === 'related_to' ? '5 5' : undefined,
        },
        labelStyle: {
          fill: colorCfg.text,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Kalam', cursive, sans-serif",
        },
        labelBgStyle: {
          fill: colorCfg.labelBg,
          fillOpacity: 0.95,
          rx: 6,
          ry: 6,
          stroke: colorCfg.stroke,
          strokeWidth: 1,
        },
        labelBgPadding: [6, 4] as [number, number],
      };
    });
  }, [relationships, edgePalette]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target || params.source === params.target) return;
      onAddRelationship({
        source_concept_id: params.source,
        target_concept_id: params.target,
        relationship_type: 'prerequisite_of',
        label: 'Prerequisite of',
      });
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isDark ? '#A5B4FC' : '#4F46E5',
            },
            style: { stroke: isDark ? '#A5B4FC' : '#4F46E5', strokeWidth: 2.2 },
          },
          eds
        )
      );
    },
    [onAddRelationship, isDark]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      onUpdatePosition(node.id, node.position.x, node.position.y);
    },
    [onUpdatePosition]
  );

  const coldCount = useMemo(
    () => concepts.filter((c) => c.mastery_score <= 2).length,
    [concepts]
  );

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden ${
        isDark ? 'paper-texture-dark' : 'paper-texture-light'
      }`}
    >
      {/* Floating Canvas Top Overlay Toolbar (Sketch note style) */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-[#FAF5EE]/95 dark:bg-[#221913]/95 backdrop-blur-md border border-[#C8B69F] dark:border-[#473527] p-2 rounded-xl shadow-md">
        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8C6D53] dark:text-[#CBB6A1] absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sketch notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-52 pl-9 pr-3 py-1.5 text-xs bg-[#F4ECE1] dark:bg-[#1A130E] border border-[#C8B69F] dark:border-[#473527] rounded-lg text-[#2C1E16] dark:text-[#F3E9DD] placeholder-[#8E7662] dark:placeholder-[#9C8673] focus:outline-none focus:border-[#785539] dark:focus:border-[#E0A878] transition-colors font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-[#8C6D53] dark:text-[#CBB6A1] hover:text-[#2C1E16] dark:hover:text-white"
            >
              x
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-[#D6C4B0] dark:bg-[#473527] mx-1 hidden sm:block" />

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 font-sketch font-bold text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterMode === 'all'
                ? 'bg-[#7F5539] dark:bg-[#E0A878] text-white dark:text-[#16100C] shadow-xs'
                : 'bg-[#EFE4D6] dark:bg-[#2C211A] text-[#5D4636] dark:text-[#D1BEAB] hover:bg-[#E6D7C5] dark:hover:bg-[#382B20]'
            }`}
          >
            All ({concepts.length})
          </button>
          <button
            onClick={() => setFilterMode('cold')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
              filterMode === 'cold'
                ? 'bg-[#C2410C] text-white shadow-xs'
                : 'bg-[#FFEDD5] dark:bg-[#431407] text-[#9A3412] dark:text-[#FCA5A5] hover:bg-[#FED7AA] dark:hover:bg-[#5E1B0A]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Cold ({coldCount})
          </button>
          <button
            onClick={() => setFilterMode('mastered')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filterMode === 'mastered'
                ? 'bg-[#15803D] text-white shadow-xs'
                : 'bg-[#DCFCE7] dark:bg-[#052E16] text-[#166534] dark:text-[#86EFAC] hover:bg-[#BBF7D0] dark:hover:bg-[#0D4022]'
            }`}
          >
            Mastered ({concepts.filter((c) => c.mastery_score >= 4).length})
          </button>
        </div>
      </div>

      {/* Canvas Edge Legend */}
      <div className="absolute bottom-5 left-5 z-20 hidden md:flex items-center gap-3 bg-[#FAF5EE]/95 dark:bg-[#221913]/95 backdrop-blur-md border border-[#C8B69F] dark:border-[#473527] px-3.5 py-2 rounded-xl text-[11px] font-sketch font-bold text-[#5D4636] dark:text-[#D1BEAB] shadow-sm">
        <span className="flex items-center gap-1 text-[#8C6D53] dark:text-[#CBB6A1]">
          <Layers className="w-3.5 h-3.5" /> Connections:
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] dark:bg-[#A5B4FC]" /> Prerequisite
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] dark:bg-[#7DD3FC]" /> Part of
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] dark:bg-[#86EFAC]" /> Derived
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8C6849] dark:bg-[#D4B89D]" /> Related
        </span>
      </div>

      {/* Main React Flow Graph Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.6}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? '#2E2218' : '#D6C4B0'}
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="top-right"
          nodeColor={(n) => {
            const c = (n.data as any)?.concept as Concept;
            if (!c) return isDark ? '#473527' : '#C8B69F';
            if (c.mastery_score <= 2) return '#EA580C';
            if (c.mastery_score === 3) return '#CA8A04';
            return '#16A34A';
          }}
          maskColor={isDark ? 'rgba(22, 16, 12, 0.75)' : 'rgba(245, 236, 226, 0.75)'}
          nodeStrokeWidth={2}
          style={{
            width: 130,
            height: 85,
          }}
        />
      </ReactFlow>
    </div>
  );
};
