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
import { Search, Flame, Layers } from 'lucide-react';

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

  // Flat cold edge coloring matching design tokens
  const edgePalette = useMemo<Record<RelationshipType, { stroke: string; labelBg: string; text: string }>>(() => {
    if (isDark) {
      return {
        prerequisite_of: { stroke: '#415A77', labelBg: '#161F30', text: '#E2E8F0' },
        part_of: { stroke: '#5D7A80', labelBg: '#161F30', text: '#E2E8F0' },
        related_to: { stroke: '#2E3F59', labelBg: '#0B0F19', text: '#94A3B8' },
        derived_from: { stroke: '#34D399', labelBg: '#161F30', text: '#A7F3D0' },
      };
    }
    return {
      prerequisite_of: { stroke: '#4A6572', labelBg: '#D5DBDB', text: '#2E4053' },
      part_of: { stroke: '#3A4F59', labelBg: '#D5DBDB', text: '#2E4053' },
      related_to: { stroke: '#78909C', labelBg: '#ECEFF1', text: '#37474F' },
      derived_from: { stroke: '#27AE60', labelBg: '#D5DBDB', text: '#1B5E20' },
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
          opacity: isDimmed ? 0.25 : 1,
          outline: isSelected ? '2px solid #4A6572' : 'none',
          outlineOffset: '2px',
          borderRadius: '6px',
        },
      };
    });
  }, [concepts, searchQuery, filterMode, selectedConceptId, onSelectConcept, onQuickFeynman]);

  // Map relationships to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return relationships.map((rel) => {
      const edgeStyle = edgePalette[rel.relationship_type] || edgePalette.related_to;
      return {
        id: rel.id,
        source: rel.source_concept_id,
        target: rel.target_concept_id,
        type: 'smoothstep',
        animated: rel.relationship_type === 'prerequisite_of',
        label: rel.label || undefined,
        style: {
          stroke: edgeStyle.stroke,
          strokeWidth: 1.5,
        },
        labelStyle: {
          fill: edgeStyle.text,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
        },
        labelBgStyle: {
          fill: edgeStyle.labelBg,
          stroke: isDark ? '#2E3F59' : '#2C3E50',
          strokeWidth: 1,
        },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: edgeStyle.stroke,
        },
      };
    });
  }, [relationships, edgePalette, isDark]);

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
      if (!params.source || !params.target || params.source === params.target) {
        return;
      }

      onAddRelationship({
        source_concept_id: params.source,
        target_concept_id: params.target,
        relationship_type: 'related_to',
        label: 'Related concept',
      });

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            label: 'Related concept',
            style: { stroke: isDark ? '#2E3F59' : '#4A6572', strokeWidth: 1.5 },
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
    <div className="relative w-full h-full select-none overflow-hidden bg-[#ECEFF1] dark:bg-[#0B0F19]">
      {/* Floating Canvas Top Overlay Toolbar (1px Flat Border, Zero Shadow) */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 bg-[#D5DBDB] dark:bg-[#161F30] border border-[#2C3E50]/25 dark:border-[#2E3F59] p-1.5 rounded-md">
        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#546E7A] dark:text-[#94A3B8] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-44 pl-8 pr-2.5 py-1 text-xs bg-[#ECEFF1] dark:bg-[#0B0F19] border border-[#2C3E50]/20 dark:border-[#2E3F59] rounded text-[#2E4053] dark:text-[#E2E8F0] placeholder-[#78909C] dark:placeholder-[#64748B] focus:outline-none focus:border-[#4A6572] transition-colors font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-xs text-[#546E7A] hover:text-[#2E4053] dark:hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-[#2C3E50]/20 dark:bg-[#2E3F59] mx-0.5 hidden sm:block" />

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filterMode === 'all'
                ? 'border-[#2C3E50] dark:border-[#415A77] bg-[#4A6572] dark:bg-[#2E3F59] text-white'
                : 'border-transparent bg-transparent text-[#546E7A] dark:text-[#94A3B8] hover:bg-[#E2E7E9] dark:hover:bg-[#1E293B]'
            }`}
          >
            All ({concepts.length})
          </button>
          <button
            onClick={() => setFilterMode('cold')}
            className={`px-2.5 py-1 rounded border flex items-center gap-1 transition-colors ${
              filterMode === 'cold'
                ? 'border-[#C0392B] bg-[#C0392B] text-white'
                : 'border-transparent bg-transparent text-[#C0392B] dark:text-[#EF4444] hover:bg-[#C0392B]/10'
            }`}
          >
            <Flame className="w-3 h-3" />
            Cold ({coldCount})
          </button>
          <button
            onClick={() => setFilterMode('mastered')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filterMode === 'mastered'
                ? 'border-[#27AE60] bg-[#27AE60] text-white'
                : 'border-transparent bg-transparent text-[#27AE60] dark:text-[#10B981] hover:bg-[#27AE60]/10'
            }`}
          >
            Mastered ({concepts.filter((c) => c.mastery_score >= 4).length})
          </button>
        </div>
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
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color={isDark ? '#1E2A3E' : '#B0BEC5'}
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="top-right"
          nodeColor={(n) => {
            const c = (n.data as any)?.concept as Concept;
            if (!c) return isDark ? '#2E3F59' : '#B0BEC5';
            if (c.mastery_score <= 2) return '#C0392B';
            if (c.mastery_score === 3) return '#546E7A';
            return '#27AE60';
          }}
          maskColor={isDark ? 'rgba(11, 15, 25, 0.85)' : 'rgba(236, 239, 241, 0.85)'}
          nodeStrokeWidth={1}
          style={{
            width: 110,
            height: 70,
          }}
        />
      </ReactFlow>
    </div>
  );
};
